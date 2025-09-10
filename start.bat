@echo off
chcp 65001 >nul
echo 正在启动电话拨号系统...

:: 检查 Node.js 是否安装
node --version >nul 2>&1
if errorlevel 1 (
    echo 错误: 未找到 Node.js，请先安装 Node.js
    pause
    exit /b 1
)

:: 检查 npm 是否安装
npm --version >nul 2>&1
if errorlevel 1 (
    echo 错误: 未找到 npm，请先安装 npm
    pause
    exit /b 1
)

:: 安装依赖（如果需要）
if not exist "node_modules" (
    echo 正在安装依赖...
    npm install
)

:: 创建数据目录
if not exist "data" mkdir data

:: 启动服务器
echo 启动服务器...
echo 访问地址: http://localhost:3000
echo 按 Ctrl+C 停止服务器
echo.

npm start

pause