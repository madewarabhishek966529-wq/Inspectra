<#
.SYNOPSIS
    Inspectra — Windows PowerShell Stop Script
.DESCRIPTION
    Safely terminates all Inspectra background services and frees ports 4000, 5001, 8080, and 5173.
.EXAMPLE
    .\stop.ps1
#>

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

node scripts\stop.js
