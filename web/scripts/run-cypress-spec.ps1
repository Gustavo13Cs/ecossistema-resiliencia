param(
  [Parameter(Mandatory = $true)]
  [string]$Spec
)

$webDir = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$outFile = Join-Path $env:TEMP "safemove-cypress-$PID-out.log"
$errFile = Join-Path $env:TEMP "safemove-cypress-$PID-err.log"
$startupDeadline = [System.Diagnostics.Stopwatch]::StartNew()
$server = Start-Process -FilePath 'cmd.exe' `
  -ArgumentList '/c', 'npm.cmd run dev' `
  -WorkingDirectory $webDir `
  -WindowStyle Hidden `
  -PassThru `
  -RedirectStandardOutput $outFile `
  -RedirectStandardError $errFile

try {
  $ready = $false
  while ($startupDeadline.Elapsed.TotalSeconds -lt 90) {
    $remainingSeconds = 90 - $startupDeadline.Elapsed.TotalSeconds
    $requestTimeoutSeconds = [int][Math]::Floor([Math]::Min(2, $remainingSeconds))
    if ($requestTimeoutSeconds -lt 1) { break }

    try {
      $response = Invoke-WebRequest -Uri 'http://localhost:3001/auth/login' -UseBasicParsing -TimeoutSec $requestTimeoutSeconds
      if ($response.StatusCode -ge 200) { $ready = $true; break }
    } catch {}

    $remainingMilliseconds = [int][Math]::Floor((90 - $startupDeadline.Elapsed.TotalSeconds) * 1000)
    if ($remainingMilliseconds -le 0) { break }
    Start-Sleep -Milliseconds ([Math]::Min(1000, $remainingMilliseconds))
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
