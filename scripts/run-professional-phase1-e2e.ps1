[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repositoryRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$composePath = [System.IO.Path]::GetFullPath((Join-Path $repositoryRoot 'docker-compose.test.yml'))
$rootBoundary = $repositoryRoot.TrimEnd([System.IO.Path]::DirectorySeparatorChar) + [System.IO.Path]::DirectorySeparatorChar

if (-not $composePath.StartsWith($rootBoundary, [System.StringComparison]::OrdinalIgnoreCase)) {
  throw 'docker-compose.test.yml precisa estar dentro do repositório.'
}

if (-not (Test-Path -LiteralPath $composePath -PathType Leaf)) {
  throw "Arquivo de Compose de teste não encontrado: $composePath"
}

$apiDirectory = Join-Path $repositoryRoot 'api'
$webDirectory = Join-Path $repositoryRoot 'web'
$databaseUrl = 'postgresql://postgres:postgres@localhost:5434/ecossistema_resiliencia_test'
$webOrigin = 'http://localhost:3001'
$apiOrigin = 'http://localhost:3000'
$jwtSecret = 'safemove-phase1-e2e-jwt-secret-not-for-production'
$runId = [Guid]::NewGuid().ToString('N')
$tempDirectory = [System.IO.Path]::GetTempPath()
$apiOutLog = Join-Path $tempDirectory "safemove-phase1-api-$runId.out.log"
$apiErrLog = Join-Path $tempDirectory "safemove-phase1-api-$runId.err.log"
$webOutLog = Join-Path $tempDirectory "safemove-phase1-web-$runId.out.log"
$webErrLog = Join-Path $tempDirectory "safemove-phase1-web-$runId.err.log"
$apiProcess = $null
$webProcess = $null
$exitCode = 1

function Invoke-CheckedCommand {
  param(
    [Parameter(Mandatory = $true)][string]$WorkingDirectory,
    [Parameter(Mandatory = $true)][string]$Command
  )

  Push-Location -LiteralPath $WorkingDirectory
  try {
    & cmd.exe /d /s /c $Command
    if ($LASTEXITCODE -ne 0) {
      throw "Comando falhou com exit code $LASTEXITCODE`: $Command"
    }
  }
  finally {
    Pop-Location
  }
}

function Wait-ForDatabaseHealth {
  $containerId = (& docker compose -f $composePath ps -q db-test).Trim()
  if (-not $containerId) {
    throw 'O container db-test não foi criado.'
  }

  for ($attempt = 0; $attempt -lt 60; $attempt++) {
    $health = (& docker inspect --format '{{.State.Health.Status}}' $containerId 2>$null).Trim()
    if ($health -eq 'healthy') {
      return
    }
    Start-Sleep -Seconds 1
  }

  throw 'db-test não ficou saudável em 60 segundos.'
}

function Wait-ForEndpoint {
  param(
    [Parameter(Mandatory = $true)][string]$Uri,
    [Parameter(Mandatory = $true)][System.Diagnostics.Process]$Process,
    [Parameter(Mandatory = $true)][string[]]$AcceptedStatusCodes,
    [Parameter(Mandatory = $true)][string]$ServiceName
  )

  for ($attempt = 0; $attempt -lt 90; $attempt++) {
    if ($Process.HasExited) {
      throw "$ServiceName encerrou antes de ficar pronto."
    }

    try {
      $response = Invoke-WebRequest -Uri $Uri -UseBasicParsing -TimeoutSec 2
      if ($AcceptedStatusCodes -contains [string][int]$response.StatusCode) {
        return
      }
    }
    catch {
      $responseProperty = $_.Exception.PSObject.Properties['Response']
      $errorResponse = if ($null -ne $responseProperty) { $responseProperty.Value } else { $null }
      $statusCodeProperty = if ($null -ne $errorResponse) {
        $errorResponse.PSObject.Properties['StatusCode']
      } else {
        $null
      }

      if ($null -ne $statusCodeProperty -and $AcceptedStatusCodes -contains [string][int]$statusCodeProperty.Value) {
        return
      }
    }

    Start-Sleep -Seconds 1
  }

  throw "$ServiceName não ficou pronto em 90 segundos."
}

function Stop-CapturedProcessTree {
  param([System.Diagnostics.Process]$Process)

  if ($null -ne $Process) {
    & cmd.exe /d /c "taskkill /PID $($Process.Id) /T /F >nul 2>&1"
  }
}

try {
  & docker compose -f $composePath up -d db-test
  if ($LASTEXITCODE -ne 0) {
    throw "Não foi possível iniciar db-test (exit code $LASTEXITCODE)."
  }
  Wait-ForDatabaseHealth

  $databaseEnvironment = "set `"DATABASE_URL=$databaseUrl`"&& set `"DIRECT_URL=$databaseUrl`"&&"
  Invoke-CheckedCommand $apiDirectory "$databaseEnvironment npx.cmd prisma migrate deploy"
  Invoke-CheckedCommand $apiDirectory "$databaseEnvironment npm.cmd run seed:phase1-e2e"
  Invoke-CheckedCommand $apiDirectory 'npm.cmd run build'
  Invoke-CheckedCommand $webDirectory "set `"NEXT_PUBLIC_API_URL=$apiOrigin`"&& npm.cmd run build"

  $apiCommand = "$databaseEnvironment set `"JWT_SECRET=$jwtSecret`"&& set `"ALLOWED_ORIGINS=$webOrigin`"&& set `"AUTH_COOKIE_SECURE=false`"&& set `"AUTH_COOKIE_SAME_SITE=lax`"&& npm.cmd run start:prod"
  $apiProcess = Start-Process -FilePath 'cmd.exe' -ArgumentList '/d', '/s', '/c', $apiCommand -WorkingDirectory $apiDirectory -WindowStyle Hidden -PassThru -RedirectStandardOutput $apiOutLog -RedirectStandardError $apiErrLog
  Wait-ForEndpoint -Uri "$apiOrigin/auth/me" -Process $apiProcess -AcceptedStatusCodes @('200', '401') -ServiceName 'API'

  $webCommand = "set `"NEXT_PUBLIC_API_URL=$apiOrigin`"&& npm.cmd run start -- -p 3001"
  $webProcess = Start-Process -FilePath 'cmd.exe' -ArgumentList '/d', '/s', '/c', $webCommand -WorkingDirectory $webDirectory -WindowStyle Hidden -PassThru -RedirectStandardOutput $webOutLog -RedirectStandardError $webErrLog
  Wait-ForEndpoint -Uri "$webOrigin/auth/login" -Process $webProcess -AcceptedStatusCodes @('200') -ServiceName 'Web'

  Push-Location -LiteralPath $webDirectory
  try {
    & npx.cmd cypress run --spec cypress/e2e/professional-phase1-real.cy.ts --browser electron --config screenshotOnRunFailure=false,video=false
    $exitCode = $LASTEXITCODE
  }
  finally {
    Pop-Location
  }
}
catch {
  [Console]::Error.WriteLine($_.Exception.Message)
  foreach ($log in @($apiOutLog, $apiErrLog, $webOutLog, $webErrLog)) {
    if (Test-Path -LiteralPath $log) {
      Get-Content -LiteralPath $log -Tail 80 -ErrorAction SilentlyContinue
    }
  }
  $exitCode = 1
}
finally {
  Stop-CapturedProcessTree $webProcess
  Stop-CapturedProcessTree $apiProcess

  foreach ($log in @($apiOutLog, $apiErrLog, $webOutLog, $webErrLog)) {
    Remove-Item -LiteralPath $log -Force -ErrorAction SilentlyContinue
  }

  $cleanupErrorActionPreference = $ErrorActionPreference
  try {
    $ErrorActionPreference = 'SilentlyContinue'
    & docker compose -f $composePath down -v 2>$null | Out-Null
  }
  finally {
    $ErrorActionPreference = $cleanupErrorActionPreference
  }
}

exit $exitCode
