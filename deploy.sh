#!/bin/bash

# 部署脚本 - 自动化部署到服务器

set -e

echo "🚀 开始部署批量图片下载器..."

# 配置变量
SERVER_IP="your-server-ip"
SERVER_USER="root"
DEPLOY_PATH="/var/www/image-downloader"
LOCAL_PATH="."

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 函数：打印彩色消息
print_message() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查依赖
check_dependencies() {
    print_message "检查本地依赖..."
    
    if ! command -v rsync &> /dev/null; then
        print_error "rsync 未安装，请先安装 rsync"
        exit 1
    fi
    
    if ! command -v ssh &> /dev/null; then
        print_error "ssh 未安装"
        exit 1
    fi
    
    print_message "依赖检查完成 ✓"
}

# 构建项目
build_project() {
    print_message "准备项目文件..."
    
    # 确保 package.json 存在
    if [ ! -f "package.json" ]; then
        print_error "package.json 不存在"
        exit 1
    fi
    
    # 创建临时目录
    mkdir -p tmp_deploy
    
    # 复制必要文件
    cp -r *.js *.html *.css *.json *.md tmp_deploy/ 2>/dev/null || true
    cp -r ecosystem.config.js Dockerfile docker-compose.yml nginx.conf tmp_deploy/ 2>/dev/null || true
    
    print_message "项目文件准备完成 ✓"
}

# 上传文件到服务器
upload_files() {
    print_message "上传文件到服务器..."
    
    # 创建远程目录
    ssh ${SERVER_USER}@${SERVER_IP} "mkdir -p ${DEPLOY_PATH}"
    
    # 同步文件
    rsync -avz --delete \
        --exclude 'node_modules' \
        --exclude '.git' \
        --exclude 'logs' \
        --exclude 'tmp_deploy' \
        ${LOCAL_PATH}/ ${SERVER_USER}@${SERVER_IP}:${DEPLOY_PATH}/
    
    print_message "文件上传完成 ✓"
}

# 服务器端部署
deploy_on_server() {
    print_message "在服务器上部署应用..."
    
    ssh ${SERVER_USER}@${SERVER_IP} << EOF
        set -e
        cd ${DEPLOY_PATH}
        
        echo "安装 Node.js 依赖..."
        npm install --production
        
        echo "创建必要目录..."
        mkdir -p logs downloaded_images
        
        echo "安装 PM2 (如果未安装)..."
        if ! command -v pm2 &> /dev/null; then
            npm install -g pm2
        fi
        
        echo "停止旧进程..."
        pm2 delete image-downloader 2>/dev/null || true
        
        echo "启动新进程..."
        pm2 start ecosystem.config.js
        pm2 save
        
        echo "设置开机自启..."
        pm2 startup || true
        
        echo "服务器部署完成 ✓"
EOF
    
    print_message "服务器部署完成 ✓"
}

# 健康检查
health_check() {
    print_message "执行健康检查..."
    
    sleep 5
    
    if ssh ${SERVER_USER}@${SERVER_IP} "curl -f http://localhost:8079/health" &>/dev/null; then
        print_message "健康检查通过 ✓"
        print_message "应用已成功部署！访问地址: http://${SERVER_IP}:8079"
    else
        print_error "健康检查失败，请检查应用状态"
        exit 1
    fi
}

# 清理临时文件
cleanup() {
    print_message "清理临时文件..."
    rm -rf tmp_deploy
    print_message "清理完成 ✓"
}

# 主函数
main() {
    echo "=========================================="
    echo "  批量图片下载器 - 自动化部署脚本"
    echo "=========================================="
    
    # 检查参数
    if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
        echo "使用方法: $0 [server-ip] [user]"
        echo "示例: $0 192.168.1.100 root"
        exit 0
    fi
    
    # 更新配置
    if [ ! -z "$1" ]; then
        SERVER_IP="$1"
    fi
    
    if [ ! -z "$2" ]; then
        SERVER_USER="$2"
    fi
    
    print_message "部署配置:"
    print_message "  服务器IP: ${SERVER_IP}"
    print_message "  用户名: ${SERVER_USER}"
    print_message "  部署路径: ${DEPLOY_PATH}"
    
    # 确认部署
    read -p "确认部署? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_warning "部署已取消"
        exit 0
    fi
    
    # 执行部署步骤
    check_dependencies
    build_project
    upload_files
    deploy_on_server
    health_check
    cleanup
    
    echo "=========================================="
    print_message "部署完成！🎉"
    echo "=========================================="
}

# 执行主函数
main "$@"
