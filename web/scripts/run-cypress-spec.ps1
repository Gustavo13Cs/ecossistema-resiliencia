param(
  [Parameter(Mandatory = $true)]
  [string]$Spec
)

$webDir = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$outFile = Join-Path $env:TEMP "safemove-cypress-$PID-out.log"
$errFile = Join-Path $env:TEMP "safemove-cypress-$PID-err.log"
$server = Start-Process -FilePath 'cmd.exe' `
  -ArgumentList '/c', 'npm.cmd run dev' `
  -WorkingDirectory $webDir `
  -WindowStyle Hidden `
  -PassThru `
  -RedirectStandardOutput $outFile `
  -RedirectStandardError $errFile

try {
  $ready = $false
  for ($attempt = 0; $attempt -lt 90; $attempt++) {
    try {
      $response = Invoke-WebRequest -Uri 'http://localhost:3001/auth/login' -UseBasicParsing -TimeoutSec 2
      if ($response.StatusCode -ge 200) { $ready = $true; break }
    } catch {}
    Start-Sleep -Seconds 1
  }
  if (-not $ready) {
    Get-Content $outFile, $errFile -ErrorAction SilentlyContinue
    throw 'Servidor Next não ficou pronto em 90 segundos.'
  }

  Push-Location $webDir
  try {
    & '.\node_modules\.bin\cypress.cmd' run --spec $Spec --browser electron
    if ($LASTEXITCODE -ne 0) { throw "Cypress falhou com exit code $LASTEXITCODE" }
  } finally {
    Pop-Location
  }
} finally {
  if ($server -and -not $server.HasExited) {
    taskkill /PID $server.Id /T /F | Out-Null
  }
  Remove-Item -LiteralPath $outFile, $errFile -Force -ErrorAction SilentlyContinue
}
