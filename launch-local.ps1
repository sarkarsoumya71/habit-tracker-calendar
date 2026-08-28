# Runs the app entirely on this machine at localhost:5058, with no database
# and therefore no account - habits live in this browser's storage only.
#
# Two reasons to use it:
#   - exporting habits that were tracked locally before the site existed
#   - testing a build before pushing it
#
# The everyday shortcut is launch.ps1, which opens the synced deployed app.

$ErrorActionPreference = "SilentlyContinue"

$AppDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$Port   = 5058
$Url    = "http://localhost:$Port"

function Test-ServerUp {
    return [bool](Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)
}

if (-not (Test-ServerUp)) {
    $next = Join-Path $AppDir "node_modules\next\dist\bin\next"
    if (-not (Test-Path $next)) {
        Add-Type -AssemblyName System.Windows.Forms
        [System.Windows.Forms.MessageBox]::Show(
            "Dependencies are missing. Open a terminal in`n$AppDir`nand run:`n`n    npm install`n    npm run build",
            "Habit Tracker Calendar") | Out-Null
        exit 1
    }

    # The app path contains a space, so the script path has to be quoted.
    Start-Process -FilePath "node" `
        -ArgumentList @("`"$next`"", "start", "-p", "$Port") `
        -WorkingDirectory $AppDir `
        -WindowStyle Hidden

    for ($i = 0; $i -lt 50; $i++) {
        if (Test-ServerUp) { break }
        Start-Sleep -Milliseconds 400
    }
}

$browsers = @(
    "$env:ProgramFiles\BraveSoftware\Brave-Browser\Application\brave.exe",
    "${env:ProgramFiles(x86)}\BraveSoftware\Brave-Browser\Application\brave.exe",
    "$env:LOCALAPPDATA\BraveSoftware\Brave-Browser\Application\brave.exe",
    "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
    "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
    "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe",
    "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
    "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe"
)

$browser = $browsers | Where-Object { Test-Path $_ } | Select-Object -First 1

if ($browser) {
    Start-Process -FilePath $browser -ArgumentList @("--app=$Url", "--window-size=1440,900")
} else {
    Start-Process $Url
}
