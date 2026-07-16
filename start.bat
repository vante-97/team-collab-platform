@echo off
chcp 65001 >nul
title Team Collab Platform

echo ========================================
echo   Team Collab Platform 一键启动
echo ========================================
echo.

:: 检查 Python
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo [错误] 未找到 Python，请先安装 Python 3.10+
    pause
    exit /b 1
)

:: 检查 Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [错误] 未找到 Node.js，请先安装 Node.js 18+
    pause
    exit /b 1
)

:: 后端依赖安装
echo [1/3] 检查后端依赖...
cd /d "%~dp0backend"
if not exist ".deps_installed" (
    echo 正在安装 Python 依赖...
    pip install -r requirements.txt -q
    if %errorlevel% neq 0 (
        echo [错误] Python 依赖安装失败
        pause
        exit /b 1
    )
    type nul > .deps_installed
    echo [完成] 后端依赖安装完成
) else (
    echo [跳过] 后端依赖已安装
)
echo.

:: 启动后端
echo [2/3] 启动 Flask 后端 (端口 5000)...
start "Flask Backend" cmd /c "cd /d %~dp0backend && python app.py"
echo [启动] 后端已启动，等待就绪...
timeout /t 3 /nobreak >nul
echo.

:: 前端依赖安装
echo [3/3] 启动 Next.js 前端 (端口 3000)...
cd /d "%~dp0"
start "Next.js Frontend" cmd /c "cd /d %~dp0 && npm run dev"
echo [启动] 前端已启动
echo.

echo ========================================
echo   启动完成！
echo   前端: http://localhost:3000
echo   后端: http://localhost:5000
echo ========================================
echo.
echo 按任意键关闭此窗口...
pause >nul
