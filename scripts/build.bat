@echo off
setlocal

if "%1"=="" (
    echo 用法: build.bat [build^|release]
    echo.
    echo 命令:
    echo   build   - 构建 web 资源
    echo   release - 构建并发布 web 资源
    exit /b 1
)

if "%1"=="build" (
    powershell -ExecutionPolicy Bypass -File "%~dp0build.ps1" -Command build
) else if "%1"=="release" (
    powershell -ExecutionPolicy Bypass -File "%~dp0build.ps1" -Command release
) else (
    echo 错误: 未知命令 "%1"
    echo 支持的命令: build, release
    exit /b 1
) 