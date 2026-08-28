# Habit Tracker Calendar - desktop launcher.
#
# Opens the deployed app in a chromeless browser window so it behaves like a
# normal desktop app, while staying the same signed-in, synced instance as the
# website. No local server involved.
#
# For the offline/local-only build instead, use launch-local.ps1.

$ErrorActionPreference = "SilentlyContinue"

$Url = "https://habit-tracker-calendar.vercel.app"

# Prefer a Chromium browser so --app gives a real window with no tabs or omnibox.
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
    # Reuses the profile already signed in, so it opens straight into the app.
    Start-Process -FilePath $browser -ArgumentList @("--app=$Url", "--window-size=1440,900")
} else {
    Start-Process $Url
}
