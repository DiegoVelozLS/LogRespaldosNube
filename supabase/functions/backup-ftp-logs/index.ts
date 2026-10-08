import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Expose-Headers": "Content-Disposition, Content-Length",
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
    if (!authHeader) return json({ error: "No autorizado. Por favor inicia sesión nuevamente." }, 401)

    const supabaseUrl = Deno.env.get("SUPABASE_URL")
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")
    if (!supabaseUrl || !supabaseAnonKey) {
      return json({ error: "Falta la configuración de Supabase en la función." }, 500)
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: userData, error: userError } = await supabase.auth.getUser()
    if (userError || !userData.user) {
      return json({ error: "Sesión de usuario expirada o no válida." }, 401)
    }

    let userRole = "SOPORTE"
    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", userData.user.id)
      .maybeSingle()

    if (profile?.role) {
      userRole = String(profile.role).trim().toUpperCase()
    } else if (userData.user.user_metadata?.role) {
      userRole = String(userData.user.user_metadata.role).trim().toUpperCase()
    }

    const ALLOWED = ["ADMIN", "TECH", "SOPORTE", "USER", "TECNICO", "ADMINISTRADOR"]
    if (!ALLOWED.includes(userRole)) {
      return json({ error: "Tu rol no tiene permiso para acceder a estos archivos." }, 403)
    }

    const body = await req.json().catch(() => ({}))
    const action = body.action || "list"
    const requestedPath = String(body.path || "")
    const initialDir = action === "explore" 
      ? requestedPath 
      : (action === "download" && requestedPath.includes("/") 
          ? requestedPath.substring(0, requestedPath.lastIndexOf("/")) 
          : (Deno.env.get("FTP_LOGS_PATH") || "/LSOFT"))

    const ftp = await connectFtp(initialDir)
    let shouldCloseFtp = true

    try {
      if (action === "explore") {
        const currentPath = requestedPath || "/LSOFT"
        const items = await ftp.listDetails()
        return json({
          currentPath,
          items,
        })
      }

      if (action === "download") {
        const filePath = requestedPath || String(body.filename || "")
        if (!filePath) {
          return json({ error: "Ruta de archivo no especificada." }, 400)
        }
        const fileNameOnly = filePath.includes("/") ? filePath.split("/").pop()! : filePath
        const fileSize = await ftp.getSize(fileNameOnly)
        const stream = await ftp.streamRetrieve(fileNameOnly)
        shouldCloseFtp = false

        const responseHeaders: Record<string, string> = {
          ...corsHeaders,
          "Content-Type": "application/octet-stream",
          "Content-Disposition": `attachment; filename="${encodeURIComponent(fileNameOnly)}"`,
        }
        if (fileSize !== null) {
          responseHeaders["Content-Length"] = String(fileSize)
        }

        return new Response(stream, {
          status: 200,
          headers: responseHeaders,
        })
      }

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
      if (shouldCloseFtp) {
        await ftp.close()
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al comunicarse con el servidor FTP."
    console.error("Error en Edge Function FTP:", message)
    return json({ error: message, items: [] }, 200)
  }
})

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}

async function connectFtp(initialPath?: string) {
  const host = Deno.env.get("FTP_HOST")
  const user = Deno.env.get("FTP_USER")
  const password = Deno.env.get("FTP_PASSWORD")
  const targetPath = initialPath !== undefined && initialPath !== "" ? initialPath : (Deno.env.get("FTP_LOGS_PATH") || "/LSOFT")
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
  if (targetPath && targetPath !== "/" && targetPath !== ".") {
    const cwd = await client.command(`CWD ${targetPath}`)
    if (cwd.code !== 250) {
      console.warn(`No se pudo cambiar a ${targetPath} (${cwd.code}), permaneciendo en la raíz.`)
    }
  }
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

  async listDetails() {
    let items: FtpItemEntry[] = []

    // 1. Intentar MLSD (estándar RFC 3659)
    try {
      const bytes = await this.transfer("MLSD")
      const text = new TextDecoder("utf-8").decode(bytes)
      items = parseMlsd(text)
    } catch {
      // ignore
    }

    // 2. Intentar LIST si MLSD no devolvió resultados
    if (items.length === 0) {
      try {
        const bytes = await this.transfer("LIST")
        const text = new TextDecoder("utf-8").decode(bytes)
        items = parseList(text)
      } catch {
        // ignore
      }
    }

    // 3. Fallback directo con NLST para listar todos los nombres de archivos reales (.zip, .txt, etc.)
    if (items.length === 0) {
      try {
        const names = await this.listNames()
        for (const rawName of names) {
          const name = rawName.split(/[/\\]/).pop() || rawName
          if (!name || name === "." || name === "..") continue
          const hasDot = name.includes(".")
          const ext = hasDot ? name.split(".").pop()!.toUpperCase() : ""
          const isDirectory = !hasDot
          items.push({
            name,
            isDirectory,
            size: isDirectory ? 0 : 1024,
            modifiedAt: "",
            extension: ext,
          })
        }
      } catch {
        // ignore
      }
    }

    // 4. Completar fecha real con MDTM si no venía en el listado
    for (const item of items) {
      if (!item.isDirectory && !item.modifiedAt) {
        const mdtm = await this.getMdtm(item.name)
        if (mdtm) item.modifiedAt = mdtm
      }
    }

    return items
  }

  async getMdtm(filename: string): Promise<string> {
    try {
      const res = await this.command(`MDTM ${filename}`)
      if (res.code === 213) {
        const modify = res.message.replace(/^213\s*/, '').trim()
        if (modify.length >= 8) {
          const y = modify.slice(0, 4)
          const m = modify.slice(4, 6)
          const d = modify.slice(6, 8)
          const h = modify.length >= 10 ? modify.slice(8, 10) : "00"
          const min = modify.length >= 12 ? modify.slice(10, 12) : "00"
          const s = modify.length >= 14 ? modify.slice(12, 14) : "00"
          return `${y}-${m}-${d}T${h}:${min}:${s}Z`
        }
      }
    } catch {
      // ignore
    }
    return ""
  }

  async getSize(filename: string): Promise<number | null> {
    try {
      const res = await this.command(`SIZE ${filename}`)
      if (res.code === 213) {
        const sizeNum = parseInt(res.message.replace(/^213\s*/, '').trim(), 10)
        if (!isNaN(sizeNum) && sizeNum > 0) return sizeNum
      }
    } catch {
      // ignore
    }
    return null
  }

  async streamRetrieve(filename: string): Promise<ReadableStream<Uint8Array>> {
    await this.command("TYPE I")
    const passive = await this.command("PASV")
    const match = passive.message.match(/(\d+),(\d+),(\d+),(\d+),(\d+),(\d+)/)
    if (passive.code !== 227 || !match) throw new Error("El FTP no abrió el canal de datos.")
    const dataPort = Number(match[5]) * 256 + Number(match[6])
    const dataConn = await Deno.connect({ hostname: this.host, port: dataPort })

    const started = await this.command(`RETR ${filename}`)
    if (started.code !== 150 && started.code !== 125) {
      try { dataConn.close() } catch {}
      throw new Error(`No se pudo iniciar la descarga en el FTP (${started.code}).`)
    }

    const client = this
    const buffer = new Uint8Array(65536) // 64 KB chunk size

    return new ReadableStream<Uint8Array>({
      async pull(controller) {
        try {
          const n = await dataConn.read(buffer)
          if (n === null) {
            controller.close()
            try { dataConn.close() } catch {}
            try {
              await client.readResponse()
              await client.close()
            } catch {}
          } else {
            controller.enqueue(buffer.slice(0, n))
          }
        } catch (err) {
          controller.error(err)
          try { dataConn.close() } catch {}
          try { await client.close() } catch {}
        }
      },
      async cancel() {
        try { dataConn.close() } catch {}
        try { await client.close() } catch {}
      }
    })
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

interface FtpItemEntry {
  name: string
  isDirectory: boolean
  size: number
  modifiedAt: string
  extension: string
}

function parseMlsd(text: string): FtpItemEntry[] {
  const items: FtpItemEntry[] = []
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed) continue
    const spaceIdx = trimmed.indexOf(" ")
    if (spaceIdx === -1) continue
    const factsStr = trimmed.slice(0, spaceIdx)
    const filename = trimmed.slice(spaceIdx + 1).trim()
    if (!filename || filename === "." || filename === "..") continue

    const facts = new Map<string, string>()
    for (const f of factsStr.split(";")) {
      const [k, v] = f.split("=")
      if (k && v) facts.set(k.toLowerCase(), v)
    }

    const type = (facts.get("type") || "file").toLowerCase()
    const isDirectory = type === "dir" || type === "cdir" || type === "pdir"
    const size = Number(facts.get("size") || "0")
    const modify = facts.get("modify") || ""
    let modifiedAt = ""
    if (modify.length >= 8) {
      const y = modify.slice(0, 4)
      const m = modify.slice(4, 6)
      const d = modify.slice(6, 8)
      const h = modify.length >= 10 ? modify.slice(8, 10) : "00"
      const min = modify.length >= 12 ? modify.slice(10, 12) : "00"
      const s = modify.length >= 14 ? modify.slice(12, 14) : "00"
      modifiedAt = `${y}-${m}-${d}T${h}:${min}:${s}Z`
    }

    const ext = isDirectory ? "" : (filename.includes(".") ? filename.split(".").pop() || "" : "")
    items.push({
      name: filename,
      isDirectory,
      size: isDirectory ? 0 : size,
      modifiedAt,
      extension: ext.toUpperCase(),
    })
  }
  return items
}

const MONTH_MAP: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
  ene: 1, abr: 4, ago: 8, dic: 12,
}

function parseWindowsDateTime(dateStr: string, timeStr: string): string {
  try {
    const parts = dateStr.split(/[-/]/)
    if (parts.length !== 3) return ""
    let p0 = parseInt(parts[0], 10)
    let p1 = parseInt(parts[1], 10)
    let year = parseInt(parts[2], 10)
    if (year < 100) year += 2000

    let month = p0
    let day = p1
    if (p0 > 12 && p1 <= 12) {
      day = p0
      month = p1
    }

    let hours = 0
    let minutes = 0
    const isPM = /PM/i.test(timeStr)
    const isAM = /AM/i.test(timeStr)
    const cleanTime = timeStr.replace(/[AP]M/i, "").trim()
    const timeParts = cleanTime.split(":")
    if (timeParts.length >= 2) {
      hours = parseInt(timeParts[0], 10) || 0
      minutes = parseInt(timeParts[1], 10) || 0
      if (isPM && hours < 12) hours += 12
      if (isAM && hours === 12) hours = 0
    }

    const pad = (n: number) => String(n).padStart(2, "0")
    return `${year}-${pad(month)}-${pad(day)}T${pad(hours)}:${pad(minutes)}:00Z`
  } catch {
    return ""
  }
}

function parseUnixDateTime(monthStr: string, dayStr: string, yearOrTimeStr: string): string {
  try {
    const mKey = monthStr.toLowerCase().slice(0, 3)
    const month = MONTH_MAP[mKey] || 1
    const day = parseInt(dayStr, 10) || 1
    const now = new Date()
    let year = now.getUTCFullYear()
    let hours = 0
    let minutes = 0

    if (yearOrTimeStr.includes(":")) {
      const timeParts = yearOrTimeStr.split(":")
      hours = parseInt(timeParts[0], 10) || 0
      minutes = parseInt(timeParts[1], 10) || 0
      if (month > now.getUTCMonth() + 1) {
        year -= 1
      }
    } else {
      year = parseInt(yearOrTimeStr, 10) || year
    }

    const pad = (n: number) => String(n).padStart(2, "0")
    return `${year}-${pad(month)}-${pad(day)}T${pad(hours)}:${pad(minutes)}:00Z`
  } catch {
    return ""
  }
}

function parseList(text: string): FtpItemEntry[] {
  const items: FtpItemEntry[] = []
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line) continue

    // Formato Windows IIS: 10-07-26  02:30PM       <DIR>          FolderName
    const winMatch = line.match(/^(\d{2}[-/]\d{2}[-/]\d{2,4})\s+(\d{1,2}:\d{2}(?:[AP]M)?)\s+(<DIR>|\d+)\s+(.+)$/i)
    if (winMatch) {
      const isDirectory = winMatch[3].toUpperCase() === "<DIR>"
      const size = isDirectory ? 0 : parseInt(winMatch[3], 10) || 0
      const name = winMatch[4].trim()
      if (name === "." || name === "..") continue
      const ext = isDirectory ? "" : (name.includes(".") ? name.split(".").pop() || "" : "")
      const modifiedAt = parseWindowsDateTime(winMatch[1], winMatch[2])

      items.push({
        name,
        isDirectory,
        size,
        modifiedAt,
        extension: ext.toUpperCase(),
      })
      continue
    }

    // Formato Unix: -rw-r--r-- 1 user group 1048576 Oct 5 12:00 Backup.zip
    const unixMatch = line.match(/^([d\-])[rwx\-]{9}\s+\d+\s+.*?\s+(\d+)\s+([A-Za-z]{3})\s+(\d{1,2})\s+(\d{4}|\d{1,2}:\d{2})\s+(.+)$/)
    if (unixMatch) {
      const isDirectory = unixMatch[1] === "d"
      const size = isDirectory ? 0 : parseInt(unixMatch[2], 10) || 0
      const name = unixMatch[6].trim()
      if (name === "." || name === "..") continue
      const ext = isDirectory ? "" : (name.includes(".") ? name.split(".").pop() || "" : "")
      const modifiedAt = parseUnixDateTime(unixMatch[3], unixMatch[4], unixMatch[5])

      items.push({
        name,
        isDirectory,
        size,
        modifiedAt,
        extension: ext.toUpperCase(),
      })
    }
  }
  return items
}
