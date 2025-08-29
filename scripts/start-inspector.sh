#!/bin/bash

# MCP Inspector 启动脚本
# 用于启动MCP Inspector测试环境

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查Node.js版本
check_node_version() {
    if ! command -v node &> /dev/null; then
        print_error "Node.js 未安装，请先安装 Node.js 22.7.5 或更高版本"
        exit 1
    fi
    
    NODE_VERSION=$(node -v | sed 's/v//')
    REQUIRED_VERSION="22.7.5"
    
    if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V | head -n1)" != "$REQUIRED_VERSION" ]; then
        print_warning "建议使用 Node.js $REQUIRED_VERSION 或更高版本，当前版本: $NODE_VERSION"
    else
        print_success "Node.js 版本检查通过: $NODE_VERSION"
    fi
}

# 构建项目
build_project() {
    print_info "构建项目..."
    
    if [ ! -f "package.json" ]; then
        print_error "package.json 文件不存在"
        exit 1
    fi
    
    # 安装依赖
    if command -v pnpm &> /dev/null; then
        print_info "使用 pnpm 安装依赖..."
        pnpm install
        pnpm run build
    elif command -v npm &> /dev/null; then
        print_info "使用 npm 安装依赖..."
        npm install
        npm run build
    else
        print_error "未找到 npm 或 pnpm"
        exit 1
    fi
    
    if [ ! -f "dist/server.js" ]; then
        print_error "构建失败，dist/server.js 文件不存在"
        exit 1
    fi
    
    print_success "项目构建完成"
}

# 检查配置文件
check_config() {
    if [ ! -f "mcp-inspector.config.json" ]; then
        print_warning "MCP Inspector 配置文件不存在，将使用默认配置"
        return 1
    fi
    
    print_success "找到 MCP Inspector 配置文件"
    return 0
}

# 启动MCP Inspector
start_inspector() {
    print_info "启动 MCP Inspector..."
    
    # 设置环境变量
    export NODE_ENV=development
    export DEBUG=true
    export LOG_LEVEL=debug
    export STORAGE_PATH=./data
    export BACKUP_ENABLED=true
    export BACKUP_INTERVAL=300000
    
    # 创建数据目录
    mkdir -p data
    
    print_info "MCP Inspector 将在以下地址启动:"
    print_info "  - 客户端UI: http://localhost:6274"
    print_info "  - 代理服务器: http://localhost:6277"
    print_info ""
    print_info "按 Ctrl+C 停止服务器"
    print_info ""
    
    # 启动Inspector
    if check_config; then
        print_info "使用配置文件启动..."
        npx @modelcontextprotocol/inspector \
            -e NODE_ENV=development \
            -e DEBUG=true \
            -e LOG_LEVEL=debug \
            -e STORAGE_PATH=./data \
            -e BACKUP_ENABLED=true \
            -e BACKUP_INTERVAL=300000 \
            node dist/server.js
    else
        print_info "使用默认配置启动..."
        npx @modelcontextprotocol/inspector \
            -e NODE_ENV=development \
            -e DEBUG=true \
            -e LOG_LEVEL=debug \
            -e STORAGE_PATH=./data \
            node dist/server.js
    fi
}

# 主函数
main() {
    print_info "=== MCP Inspector 启动脚本 ==="
    print_info ""
    
    # 检查Node.js版本
    check_node_version
    
    # 构建项目
    build_project
    
    # 启动Inspector
    start_inspector
}

# 处理中断信号
trap 'print_info "\n正在停止 MCP Inspector..."; exit 0' INT TERM

# 运行主函数
main "$@"