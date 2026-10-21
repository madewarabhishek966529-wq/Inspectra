@REM ----------------------------------------------------------------------------
@REM Inspectra Maven Wrapper for Windows
@REM ----------------------------------------------------------------------------
@echo off
set DIRNAME=%~dp0
if "%DIRNAME%" == "" set DIRNAME=.

set MAVEN_LOCAL=%DIRNAME%tools\apache-maven-3.9.6\bin\mvn.cmd
if exist "%MAVEN_LOCAL%" (
    call "%MAVEN_LOCAL%" %*
    exit /b %ERRORLEVEL%
)

where mvn >nul 2>nul
if %ERRORLEVEL% equ 0 (
    call mvn %*
    exit /b %ERRORLEVEL%
)

echo [ERROR] Maven not found locally in %DIRNAME%tools\apache-maven-3.9.6 nor in system PATH.
exit /b 1
