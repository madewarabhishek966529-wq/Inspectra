<#
.SYNOPSIS
    Inspectra — Windows PowerShell One-Command Startup Script
.DESCRIPTION
    Launches all 4 Inspectra full-stack services concurrently with health checks:
    Test Fixtures (4000), Browser Worker (5001), Spring Boot Backend (8080), React Frontend (5173).
.PARAMETER Build
    Recompiles worker and backend packages before starting.
.PARAMETER Restart
    Stops any running instances before starting anew.
.EXAMPLE
    .\start.ps1
    .\start.ps1 -Build
    .\start.ps1 -Restart
#>

param(
    [switch]$Build,
    [switch]$Restart
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

Write-Host ""
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host "  ⚡ INSPECTRA — ONE-COMMAND FULL PLATFORM STARTUP (WINDOWS 11)" -ForegroundColor Green
Write-Host "============================================================================" -ForegroundColor Cyan

# Check Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Node.js is not installed or not in PATH. Please install Node.js 18+." -ForegroundColor Red
    exit 1
}

# Check Java
if (-not (Get-Command java -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Java is not installed or not in PATH. Please install Java 17+." -ForegroundColor Red
    exit 1
}

$ArgsList = @()
if ($Build) { $ArgsList += "--build" }
if ($Restart) { $ArgsList += "--restart" }

# Run orchestrator
node scripts\dev.js @ArgsList
