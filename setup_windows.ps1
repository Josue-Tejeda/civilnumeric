# setup_windows.ps1 - Instalacion automatizada para CivilNumeric en Windows
# Este script prepara el entorno completo, instala Node.js/npm si faltan, compila e inicia el software.

$ErrorActionPreference = "Stop"

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "   CivilNumeric: Instalador Automatizado     " -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

# 1. Verificar/Instalar dependencias de Python
Write-Host "`n[1/4] Instalando dependencias de Python..." -ForegroundColor Yellow
try {
    python -m pip install --upgrade pip
    python -m pip install -r requirements.txt
    Write-Host "[OK] Dependencias de Python instaladas con exito." -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Al instalar dependencias de Python. Asegurate de que Python este en el PATH." -ForegroundColor Red
    exit 1
}

# 2. Verificar existencia de Node.js / npm
Write-Host "`n[2/4] Verificando entorno de Node.js/npm..." -ForegroundColor Yellow
$nodeInstalled = $false
try {
    $nodeVersion = node -v
    Write-Host "[OK] Node.js ya esta instalado en el sistema ($nodeVersion)." -ForegroundColor Green
    $nodeInstalled = $true
} catch {
    Write-Host "[INFO] Node.js no detectado. Iniciando instalacion automatizada..." -ForegroundColor Cyan
}

if (-not $nodeInstalled) {
    # Intentar instalar con Winget (Windows 10/11 incorporado)
    $wingetInstalled = $false
    try {
        $null = winget --version
        $wingetInstalled = $true
    } catch {}

    if ($wingetInstalled) {
        Write-Host "-> Instalando Node.js a traves de Winget (silencioso)..." -ForegroundColor Cyan
        try {
            winget install --id OpenJS.NodeJS.LTS --source winget --accept-package-agreements --accept-source-agreements --silent
            Write-Host "[OK] Node.js instalado con Winget." -ForegroundColor Green
            $nodeInstalled = $true
        } catch {
            Write-Host "[WARN] Fallo la instalacion con Winget. Intentando descarga manual..." -ForegroundColor Yellow
            $wingetInstalled = $false
        }
    }

    if (-not $nodeInstalled) {
        # Descargar MSI de Node.js oficial e instalar silenciosamente
        $msiUrl = "https://nodejs.org/dist/v20.12.2/node-v20.12.2-x64.msi"
        $msiPath = Join-Path $env:TEMP "node-install.msi"
        
        Write-Host "-> Descargando instalador de Node.js oficial (LTS)..." -ForegroundColor Cyan
        Invoke-WebRequest -Uri $msiUrl -OutFile $msiPath
        
        Write-Host "-> Ejecutando instalador silencioso (solicitara permisos de Administrador)..." -ForegroundColor Cyan
        $process = Start-Process msiexec.exe -ArgumentList "/i `"$msiPath`" /qn /norestart" -Verb RunAs -Wait -PassThru
        
        if ($process.ExitCode -eq 0) {
            Write-Host "[OK] Node.js instalado con exito desde el paquete oficial." -ForegroundColor Green
            $nodeInstalled = $true
        } else {
            Write-Host "[ERROR] Al instalar Node.js. Intente descargar e instalar manualmente desde https://nodejs.org/" -ForegroundColor Red
            exit 1
        }
    }

    # Cargar Node.js en el PATH de la sesion actual de PowerShell para continuar sin reiniciar consola
    $env:Path += ";$($env:ProgramFiles)\nodejs"
    $env:Path += ";$($env:APPDATA)\npm"
}

# 3. Configurar espacio de trabajo
Write-Host "`n[3/4] Instalando dependencias del proyecto (npm)..." -ForegroundColor Yellow
try {
    # Ejecuta el setup del package.json de la raiz
    npm run setup
    Write-Host "[OK] Dependencias de Node instaladas con exito." -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Al configurar dependencias de Node.js." -ForegroundColor Red
    exit 1
}

# 4. Compilar la aplicación frontend
Write-Host "`n[4/4] Compilando frontend en React..." -ForegroundColor Yellow
try {
    npm run build
    Write-Host "[OK] Frontend compilado con exito (estaticos en frontend/dist)." -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Al compilar el frontend React." -ForegroundColor Red
    exit 1
}

# 5. Lanzar la aplicación
Write-Host "`n=============================================" -ForegroundColor Green
Write-Host "   ¡Entorno de CivilNumeric Configurado!     " -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green
Write-Host "Iniciando la aplicacion en http://localhost:8000 ..." -ForegroundColor Cyan

npm start
