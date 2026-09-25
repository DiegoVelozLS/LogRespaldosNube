import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

const LOG_NAME = /^Backup_.+_\d{8}\.log$/i
const LINE = /^\[(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2}):(\d{2})\] \[(\w+)\s*\] (.*)$/
const ALLOWED_ROLES = ["ADMIN", "TECH", "SOPORTE"]

type Stage = "ok" | "error" | "pending"

interface DatabaseResult {
  name: string
  company: string
  backup: Stage
  zip: Stage
  ftp: Stage
  file?: string
}

interface BackupRun {
  filename: string
  server: string
  date: string
  startedAt: string
  durationSeconds: number
  databaseCount: number
  successCount: number
  status: "success" | "error"
  databases: DatabaseResult[]
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get("Authorization")
    if (!authHeader) return json({ error: "No autorizado" }, 401)

    const supabaseUrl = Deno.env.get("SUPABASE_URL")
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")
    if (!supabaseUrl || !supabaseAnonKey) {
      return json({ error: "Falta la configuración de Supabase en la función." }, 500)
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: userData, error: userError } = await supabase.auth.getUser()
    if (userError || !userData.user) return json({ error: "No autorizado" }, 401)

    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("role")
      .eq("id", userData.user.id)
      .single()

    if (profileError || !profile || !ALLOWED_ROLES.includes(profile.role)) {
      return json({ error: "No tienes permiso para ver estos logs." }, 403)
    }

    const body = await req.json().catch(() => ({}))
    const action = body.action === "read" ? "read" : "list"
    const ftp = await connectFtp()

    try {
      if (action === "read") {
        const filename = String(body.filename || "")
        if (!LOG_NAME.test(filename) || filename.includes("/") || filename.includes("\\")) {
          return json({ error: "Nombre de log no válido." }, 400)
        }
        const bytes = await ftp.retrieve(filename)
        return json({ filename, content: decodeLog(bytes) })
      }

      const names = (await ftp.listNames())
        .map((name) => name.split(/[/\\]/).pop() || name)
        .filter((name) => LOG_NAME.test(name))

      const runs: BackupRun[] = []
      for (const filename of names) {
        const bytes = await ftp.retrieve(filename)
        runs.push(parseLog(filename, decodeLog(bytes)))
      }

      runs.sort((a, b) => (a.date === b.date ? b.startedAt.localeCompare(a.startedAt) : b.date.localeCompare(a.date)))
      return json({ runs })
    } finally {
      await ftp.close()
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudieron leer los logs del FTP."
    console.error(message)
    return json({ error: message }, 500)
  }
})

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}

async function connectFtp() {
  const host = Deno.env.get("FTP_HOST")
  const user = Deno.env.get("FTP_USER")
  const password = Deno.env.get("FTP_PASSWORD")
  const logsPath = Deno.env.get("FTP_LOGS_PATH") || "/LSOFT/Logs"
  const port = Number(Deno.env.get("FTP_PORT") || "21")

  if (!host || !user || !password) {
    throw new Error("Faltan los secretos FTP_HOST, FTP_USER y FTP_PASSWORD.")
  }

  const client = await FtpClient.connect(host, port)
  const login = await client.command(`USER ${user}`)
  if (login.code !== 331 && login.code !== 230) throw new Error(`FTP rechazó el usuario (${login.code}).`)
  if (login.code !== 230) {
    const pass = await client.command(`PASS ${password}`)
    if (pass.code !== 230) throw new Error("FTP rechazó la contraseña.")
  }
  const cwd = await client.command(`CWD ${logsPath}`)
  if (cwd.code !== 250) throw new Error(`No se encontró la carpeta ${logsPath} en el FTP.`)
  return client
}

class FtpClient {
  private buf = ""
  private readonly decoder = new TextDecoder()
  private readonly encoder = new TextEncoder()

  private constructor(private conn: Deno.Conn, private host: string) {}

  static async connect(host: string, port: number) {
    const conn = await Deno.connect({ hostname: host, port })
    const client = new FtpClient(conn, host)
    const greeting = await client.readResponse()
    if (greeting.code !== 220) throw new Error(`El FTP no aceptó la conexión (${greeting.code}).`)
    return client
  }

  async command(cmd: string) {
    await this.conn.write(this.encoder.encode(cmd + "\r\n"))
    return this.readResponse()
  }

  async listNames() {
    const text = decodeLog(await this.transfer("NLST"))
    return text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  }

  async retrieve(filename: string) {
    return this.transfer(`RETR ${filename}`)
  }

  async close() {
    try {
      await this.command("QUIT")
    } catch {
      // La sesión ya puede estar cerrada.
    }
    try {
      this.conn.close()
    } catch {
      // ignore
    }
  }

  private async transfer(command: string) {
    const passive = await this.command("PASV")
    const match = passive.message.match(/(\d+),(\d+),(\d+),(\d+),(\d+),(\d+)/)
    if (passive.code !== 227 || !match) throw new Error("El FTP no abrió el canal de datos.")
    const dataPort = Number(match[5]) * 256 + Number(match[6])
    const dataConn = await Deno.connect({ hostname: this.host, port: dataPort })
    try {
      const started = await this.command(command)
      if (started.code !== 150 && started.code !== 125) {
        throw new Error(`No se pudo leer el archivo en el FTP (${started.code}).`)
      }
      const bytes = await readAll(dataConn)
      const done = await this.readResponse()
      if (done.code !== 226 && done.code !== 250) {
        throw new Error(`El FTP no terminó la transferencia (${done.code}).`)
      }
      return bytes
    } finally {
      try {
        dataConn.close()
      } catch {
        // ignore
      }
    }
  }

  private async readResponse(): Promise<{ code: number; message: string }> {
    while (true) {
      const line = await this.readLine()
      const code = Number(line.slice(0, 3))
      if (!Number.isFinite(code)) throw new Error("Respuesta FTP ilegible.")
      if (line[3] !== "-") return { code, message: line }
      const lines = [line]
      while (true) {
        const next = await this.readLine()
        lines.push(next)
        if (next.startsWith(`${code} `)) return { code, message: lines.join("\n") }
      }
    }
  }

  private async readLine() {
    while (true) {
      const idx = this.buf.indexOf("\r\n")
      if (idx !== -1) {
        const line = this.buf.slice(0, idx)
        this.buf = this.buf.slice(idx + 2)
        return line
      }
      const chunk = new Uint8Array(4096)
      const n = await this.conn.read(chunk)
      if (n === null) throw new Error("El FTP cerró la conexión.")
      this.buf += this.decoder.decode(chunk.subarray(0, n))
    }
  }
}

async function readAll(conn: Deno.Conn) {
  const chunks: Uint8Array[] = []
  const buffer = new Uint8Array(65536)
  while (true) {
    const n = await conn.read(buffer)
    if (n === null) break
    chunks.push(buffer.slice(0, n))
  }
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
  const out = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    out.set(chunk, offset)
    offset += chunk.length
  }
  return out
}

function decodeLog(bytes: Uint8Array) {
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    return new TextDecoder("utf-16le").decode(bytes)
  }
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return new TextDecoder("utf-8").decode(bytes.subarray(3))
  }
  let nulls = 0
  const sample = Math.min(bytes.length, 200)
  for (let i = 1; i < sample; i += 2) if (bytes[i] === 0) nulls++
  if (sample > 10 && nulls > sample / 4) return new TextDecoder("utf-16le").decode(bytes)
  return new TextDecoder("utf-8").decode(bytes)
}

function splitCompanyAndDatabase(label: string) {
  const parts = label.split(/\s*\|\s*/)
  if (parts.length < 2) return { company: "", name: label.trim() }
  return { company: parts[0].trim(), name: parts.slice(1).join(" | ").trim() }
}

export function parseLog(filename: string, content: string): BackupRun {
  const nameMatch = filename.match(/^Backup_(.+)_(\d{2})(\d{2})(\d{4})\.log$/i)
  const server = nameMatch?.[1] ?? "Desconocido"
  const date = nameMatch ? `${nameMatch[4]}-${nameMatch[3]}-${nameMatch[2]}` : ""
  const databases = new Map<string, DatabaseResult>()
  let startedAt = ""
  let firstMs = 0
  let lastMs = 0
  let onlineCount: number | null = null
  let hasErrorLine = false

  for (const rawLine of content.split(/\r?\n/)) {
    const match = rawLine.match(LINE)
    if (!match) continue
    const stamp = Date.UTC(+match[3], +match[2] - 1, +match[1], +match[4], +match[5], +match[6])
    if (!startedAt) {
      startedAt = `${match[4]}:${match[5]}:${match[6]}`
      firstMs = stamp
    }
    lastMs = stamp
    const level = match[7].trim().toUpperCase()
    const message = match[8]
    if (level === "ERROR" || level === "FAIL") hasErrorLine = true

    const online = message.match(/Bases ONLINE encontradas:\s*(\d+)/i)
    if (online) onlineCount = Number(online[1])

    const dbMatch = message.match(/^\[([^\]]+)\]\s*(.*)$/)
    if (!dbMatch) continue
    const identity = splitCompanyAndDatabase(dbMatch[1])
    const rest = dbMatch[2]
    const key = identity.company ? `${identity.company}|${identity.name}` : identity.name
    if (!databases.has(key)) {
      databases.set(key, { name: identity.name, company: identity.company, backup: "pending", zip: "pending", ftp: "pending" })
    }
    const entry = databases.get(key)!
    if (/Backup OK/i.test(rest)) entry.backup = "ok"
    else if (/ZIP OK/i.test(rest)) entry.zip = "ok"
    else if (/FTP OK/i.test(rest)) entry.ftp = "ok"
    else if (level === "ERROR" || level === "FAIL") {
      if (/zip/i.test(rest)) entry.zip = "error"
      else if (/ftp/i.test(rest)) entry.ftp = "error"
      else entry.backup = "error"
    }
    const file = rest.match(/Archivo:\s*(.+)$/i)
    if (file) entry.file = file[1].trim()
  }

  const list = [...databases.values()]
  const successCount = list.filter((db) => db.backup === "ok" && db.zip === "ok" && db.ftp === "ok").length
  const databaseCount = list.length || onlineCount || 0
  const complete = list.length > 0 && successCount === list.length && !hasErrorLine
  const durationSeconds = firstMs && lastMs ? Math.max(0, Math.round((lastMs - firstMs) / 1000)) : 0

  return {
    filename,
    server,
    date,
    startedAt,
    durationSeconds,
    databaseCount,
    successCount,
    status: complete ? "success" : "error",
    databases: list,
  }
}
