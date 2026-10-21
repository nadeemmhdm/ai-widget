$ErrorActionPreference = "Stop"

Write-Host "== AI Desktop Pet - Windows development setup ==" -ForegroundColor Cyan

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host "Node.js is missing. Install Node.js 22 LTS or newer, then rerun." -ForegroundColor Red
  exit 1
}

if (-not (Get-Command rustc -ErrorAction SilentlyContinue)) {
  Write-Host "Rust is missing. Install Rust using rustup from https://rustup.rs/ and select the MSVC toolchain." -ForegroundColor Yellow
  exit 1
}

$rustVersion = rustc --version
Write-Host "Node: $(node --version)"
Write-Host "Rust: $rustVersion"

Write-Host "Installing npm dependencies..." -ForegroundColor Cyan
npm install

Write-Host "Starting Tauri development build..." -ForegroundColor Cyan
npm run tauri dev
