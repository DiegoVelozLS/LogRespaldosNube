import { createClient } from '@supabase/supabase-js';

// Handler compatible con Vercel Serverless Functions (Node.js)
export default async function handler(req: any, res: any) {
  // Configuración de CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Configuración de Supabase no disponible en el servidor.' });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Obtener parámetros
  const token = (req.query?.token || req.body?.token || '').trim();
  const format = (req.query?.format || req.body?.format || '').toLowerCase();

  if (!token) {
    return res.status(400).json({ error: 'Parámetro "token" requerido.' });
  }

  try {
    // 1. Llamar al RPC en Supabase para validar el token y armar la configuración
    const { data, error } = await (supabase as any).rpc('redeem_vpn_provision_token', {
      p_token: token,
    });

    if (error || !data || !data.success) {
      const errMsg = error?.message || 'Token de activación inválido o expirado.';
      if (format === 'ps1') {
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        return res.status(400).send(`Write-Host "[ERROR] ${errMsg}" -ForegroundColor Red; exit 1`);
      }
      return res.status(400).json({ error: errMsg });
    }

    const {
      file_name,
      tunnel_name,
      client_config,
      device_name,
      user_name,
      ip,
      server_ip,
    } = data;

    // 2. Respuesta en formato archivo .conf puro
    if (format === 'conf') {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${file_name}"`);
      return res.status(200).send(client_config);
    }

    // 3. Respuesta en formato script PowerShell ejecutable directamente (irm ... | iex)
    if (format === 'ps1') {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');

      // Escapar comillas dobles y caracteres especiales en la configuración
      const b64Config = Buffer.from(client_config, 'utf-8').toString('base64');

      const psScript = `# =====================================================================
# Script de Aprovisionamiento Silencioso WireGuard VPN - Listosoft
# Equipo: ${device_name} (${user_name}) | IP: ${ip}
# =====================================================================

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "    Aprovisionador Automatico WireGuard VPN - Listosoft" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Verificar Elevacion de Administrador
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "[!] Permisos de Administrador requeridos. Elevando..." -ForegroundColor Yellow
    $args = "-NoProfile -ExecutionPolicy Bypass -Command \`"irm '$($MyInvocation.Line)' | iex\`""
    Start-Process powershell.exe -Verb RunAs -ArgumentList $args
    exit
}

# 2. Verificar o Instalar WireGuard
$wgExe = "C:\\Program Files\\WireGuard\\wireguard.exe"
if (-not (Test-Path $wgExe)) {
    Write-Host "[*] WireGuard no encontrado. Descargando instalador oficial..." -ForegroundColor Yellow
    $msiUrl = "https://download.wireguard.com/windows-client/wireguard-amd64-0.5.3.msi"
    $msiPath = "$env:TEMP\\wireguard-setup.msi"

    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    Invoke-WebRequest -Uri $msiUrl -OutFile $msiPath -UseBasicParsing

    Write-Host "[*] Instalando WireGuard en silencio..." -ForegroundColor Yellow
    $p = Start-Process msiexec.exe -ArgumentList "/i \`"$msiPath\`" /qn /norestart DO_NOT_OPEN_GUI=1" -Wait -PassThru
    if ($p.ExitCode -ne 0) {
        Write-Host "[ERROR] Fallo la instalacion de WireGuard (Codigo: $($p.ExitCode))." -ForegroundColor Red
        exit 1
    }
    Remove-Item $msiPath -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
}

if (-not (Test-Path $wgExe)) {
    Write-Host "[ERROR] No se pudo encontrar wireguard.exe tras la instalacion." -ForegroundColor Red
    exit 1
}
Write-Host "[OK] WireGuard instalado correctamente." -ForegroundColor Green

# 3. Preparar Archivo de Configuracion Temporal
$tunnelName = "${tunnel_name}"
$tempConf = "$env:TEMP\\$tunnelName.conf"
$confContent = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String("${b64Config}"))
[System.IO.File]::WriteAllText($tempConf, $confContent, [System.Text.Encoding]::UTF8)

# 4. Instalar y Levantar Tunel como Servicio de Windows (Sin GUI)
Write-Host "[*] Registrando tunel de red '$tunnelName'..." -ForegroundColor Yellow
$serviceName = "WireGuardTunnel\$$tunnelName"

# Si ya existia un servicio previo con este nombre, desinstalarlo limpiamente
$existing = Get-Service -Name $serviceName -ErrorAction SilentlyContinue
if ($existing) {
    Write-Host "[*] Removiendo servicio anterior..." -ForegroundColor DarkGray
    & $wgExe /uninstalltunnelservice $tunnelName | Out-Null
    Start-Sleep -Seconds 2
}

# Instalar servicio con wireguard.exe
& $wgExe /installtunnelservice $tempConf | Out-Null
Start-Sleep -Seconds 3

# Borrar archivo plano temporal (WireGuard lo guarda cifrado en DPAPI)
Remove-Item $tempConf -Force -ErrorAction SilentlyContinue

# 5. Verificar Estado del Servicio
$svc = Get-Service -Name $serviceName -ErrorAction SilentlyContinue
if ($svc -and $svc.Status -eq "Running") {
    Write-Host "[OK] Servicio de VPN iniciado exitosamente." -ForegroundColor Green
} else {
    Write-Host "[!] El servicio se registro pero no esta en ejecucion. Intentando iniciar..." -ForegroundColor Yellow
    Start-Service $serviceName -ErrorAction SilentlyContinue
}

# 6. Prueba de Conectividad con el Servidor
$serverIp = "${server_ip}"
Write-Host "[*] Verificando conectividad con servidor VPN ($serverIp)..." -ForegroundColor Yellow
Start-Sleep -Seconds 2
$ping = Test-Connection -ComputerName $serverIp -Count 2 -Quiet -ErrorAction SilentlyContinue

Write-Host ""
if ($ping) {
    Write-Host "============================================================" -ForegroundColor Green
    Write-Host " [EXITO] VPN configurada y conectada correctamente!" -ForegroundColor Green
    Write-Host " IP del equipo: ${ip}" -ForegroundColor Green
    Write-Host " Servidor: $serverIp (Ping OK)" -ForegroundColor Green
    Write-Host "============================================================" -ForegroundColor Green
} else {
    Write-Host "============================================================" -ForegroundColor Yellow
    Write-Host " [OK] Tunel instalado exitosamente (IP: ${ip})." -ForegroundColor Yellow
    Write-Host " Nota: Si el servidor tarda unos segundos en sincronizar," -ForegroundColor Yellow
    Write-Host " el trafico se habilitara de forma automatica." -ForegroundColor Yellow
    Write-Host "============================================================" -ForegroundColor Yellow
}
Write-Host ""
`;

      return res.status(200).send(psScript);
    }

    // 4. Respuesta JSON por defecto
    return res.status(200).json({
      success: true,
      data,
    });
  } catch (err: any) {
    console.error('Error en vpn-provision handler:', err);
    return res.status(500).json({ error: err.message || 'Error interno del servidor.' });
  }
}
