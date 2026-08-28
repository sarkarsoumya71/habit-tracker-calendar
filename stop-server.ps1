# Stops the background Habit Tracker Calendar server (port 5058).
$conns = Get-NetTCPConnection -LocalPort 5058 -State Listen -ErrorAction SilentlyContinue
if (-not $conns) { Write-Output "Not running."; exit }
$conns | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object {
    Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue
    Write-Output "Stopped PID $_"
}
