@echo off
setlocal enabledelayedexpansion

REM MCP Inspector 启动脚本 (Windows版本)
REM 用于启动MCP Inspector测试环境

echo ===== MCP Inspector 启动脚本 =====
echo.

REM 检查Node.js是否安装
node --version >nul 2>&1
if errorlevel 1 (
    echo [错误] Node.js 未安装，请先安装 Node.js 22.7.5 或更高版本
    pause
    exit /b 1
)

echo [信息] Node.js 版本检查通过
node --version
echo.

REM 检查package.json文件
if not exist "package.json" (
    echo [错误] package.json 文件不存在
    pause
    exit /b 1
)

echo [信息] 构建项目...

REM 检查包管理器并安装依赖
where pnpm >nul 2>&1
if not errorlevel 1 (
    echo [信息] 使用 pnpm 安装依赖...
    pnpm install
    if errorlevel 1 (
        echo [错误] pnpm install 失败
        pause
        exit /b 1
    )
    pnpm run build
    if errorlevel 1 (
        echo [错误] pnpm build 失败
        pause
        exit /b 1
    )
) else (
    where npm >nul 2>&1
    if not errorlevel 1 (
        echo [信息] 使用 npm 安装依赖...
        npm install
        if errorlevel 1 (
            echo [错误] npm install 失败
            pause
            exit /b 1
        )
        npm run build
        if errorlevel 1 (
            echo [错误] npm build 失败
            pause
            exit /b 1
        )
    ) else (
        echo [错误] 未找到 npm 或 pnpm
        pause
        exit /b 1
    )
)

REM 检查构建结果
if not exist "dist\server.js" (
    echo [错误] 构建失败，dist\server.js 文件不存在
    pause
    exit /b 1
)

echo [成功] 项目构建完成
echo.

REM 创建数据目录
if not exist "data" mkdir data

REM 设置环境变量
set NODE_ENV=development
set DEBUG=true
set LOG_LEVEL=debug
set STORAGE_PATH=./data
set BACKUP_ENABLED=true
set BACKUP_INTERVAL=300000

echo [信息] 启动 MCP Inspector...
echo.
echo MCP Inspector 将在以下地址启动:
echo   - 客户端UI: http://localhost:6274
echo   - 代理服务器: http://localhost:6277
echo.
echo 按 Ctrl+C 停止服务器
echo.

REM 启动Inspector
if exist "mcp-inspector.config.json" (
    echo [信息] 使用配置文件启动...
    npx @modelcontextprotocol/inspector -e NODE_ENV=development -e DEBUG=true -e LOG_LEVEL=debug -e STORAGE_PATH=./data -e BACKUP_ENABLED=true -e BACKUP_INTERVAL=300000 node dist/server.js
) else (
    echo [警告] MCP Inspector 配置文件不存在，使用默认配置启动...
    npx @modelcontextprotocol/inspector -e NODE_ENV=development -e DEBUG=true -e LOG_LEVEL=debug -e STORAGE_PATH=./data node dist/server.js
)

if errorlevel 1 (
    echo [错误] MCP Inspector 启动失败
    pause
    exit /b 1
)

echo [信息] MCP Inspector 已停止
pause