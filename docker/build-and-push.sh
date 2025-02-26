#!/bin/bash

# 构建和推送 Docker 镜像的自动化脚本

# 默认设置
VERSION="latest"
DOCKER_USERNAME="allwefantasy"
BUILD_ALL=true
BUILD_BASE=false
BUILD_STORAGE=false
BUILD_APP=false
BUILD_LOCAL=false
 
# 输出彩色文本的函数
print_green() {
    echo -e "\033[0;32m$1\033[0m"
}

print_yellow() {
    echo -e "\033[0;33m$1\033[0m"
}

print_red() {
    echo -e "\033[0;31m$1\033[0m"
}

print_blue() {
    echo -e "\033[0;34m$1\033[0m"
}

# 显示帮助信息
show_help() {
    echo "用法: $0 [选项] [版本号]"
    echo "选项:"
    echo "  -h, --help                显示帮助信息"
    echo "  -b, --build CONTAINERS    指定要构建的容器，用逗号分隔"
    echo "                           可选值: base,storage,app,local"
    echo "                           例如: -b base,storage 仅构建基础镜像和存储镜像"
    echo "  -c, --clean               无需确认，直接清理容器和镜像"
    echo "  -n, --no-clean            不清理容器和镜像"
    echo ""
    echo "版本号参数:"
    echo "  默认版本号为 'latest'"
    echo "  例如: $0 v1.0.0 构建版本v1.0.0"
    echo ""
    echo "示例:"
    echo "  $0                        构建所有镜像, 版本为latest"
    echo "  $0 v1.0.0                 构建所有镜像, 版本为v1.0.0"
    echo "  $0 -b base,storage        仅构建基础镜像和存储镜像, 版本为latest"
    echo "  $0 -b app,local v1.0.0    仅构建应用镜像和本地应用镜像, 版本为v1.0.0"
    echo "  $0 -c                     构建所有镜像并自动清理旧容器和镜像"
    exit 0
}

# 清理相关容器的函数
cleanup_containers() {
    print_blue "正在检查并清理相关容器..."
    
    # 定义要检查的容器名列表
    containers=("auto-coder-app" "local-auto-coder-app" "byzer-storage")
    
    for container in "${containers[@]}"; do
        # 检查容器是否存在
        if docker ps -a --format '{{.Names}}' | grep -q "^${container}$"; then
            print_yellow "停止并删除容器: $container"
            docker stop "$container" 2>/dev/null
            docker rm "$container" 2>/dev/null
            if [ $? -eq 0 ]; then
                print_green "容器 $container 已删除"
            else
                print_red "无法删除容器 $container"
            fi
        fi
    done
    
    print_green "容器清理完成"
}

# 清理相关镜像的函数
cleanup_images() {
    print_blue "正在检查并清理相关镜像..."
    
    # 定义要清理的镜像列表
    images=("auto-coder-base" "byzer-storage" "auto-coder-app" "local-auto-coder-app")
    
    for image in "${images[@]}"; do
        # 检查本地标签镜像
        if docker images --format '{{.Repository}}' | grep -q "^${image}$"; then
            print_yellow "删除本地镜像: $image"
            docker rmi "$image" 2>/dev/null
        fi
        
        # 检查带用户名的镜像
        if docker images --format '{{.Repository}}' | grep -q "^${DOCKER_USERNAME}/${image}$"; then
            print_yellow "删除镜像: ${DOCKER_USERNAME}/${image}"
            docker rmi "${DOCKER_USERNAME}/${image}" 2>/dev/null
        fi
    done
    
    print_green "镜像清理完成"
}

# 解析命令行参数
AUTO_CLEAN=false
NO_CLEAN=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            ;;
        -b|--build)
            if [[ -z "$2" || "$2" == -* ]]; then
                print_red "错误: --build 选项需要参数"
                exit 1
            fi
            BUILD_ALL=false
            IFS=',' read -ra CONTAINERS <<< "$2"
            for container in "${CONTAINERS[@]}"; do
                case $container in
                    base)
                        BUILD_BASE=true
                        ;;
                    storage)
                        BUILD_STORAGE=true
                        ;;
                    app)
                        BUILD_APP=true
                        ;;
                    local)
                        BUILD_LOCAL=true
                        ;;
                    *)
                        print_red "错误: 未知的容器类型 '$container'"
                        echo "有效的容器类型: base, storage, app, local"
                        exit 1
                        ;;
                esac
            done
            shift 2
            ;;
        -c|--clean)
            AUTO_CLEAN=true
            shift
            ;;
        -n|--no-clean)
            NO_CLEAN=true
            shift
            ;;
        *)
            # 如果参数不是以'-'开头，假设是版本号
            if [[ ! "$1" == -* ]]; then
                VERSION="$1"
            else
                print_red "错误: 未知选项 $1"
                echo "使用 -h 或 --help 查看帮助信息"
                exit 1
            fi
            shift
            ;;
    esac
done

# 如果BUILD_ALL为true，设置所有构建标志为true
if $BUILD_ALL; then
    BUILD_BASE=true
    BUILD_STORAGE=true
    BUILD_APP=true
    BUILD_LOCAL=true
fi

# 检查Docker是否已登录
print_blue "检查 Docker 登录状态..."
if ! docker info > /dev/null 2>&1; then
    print_red "请先启动 Docker 服务"
    exit 1
fi

# 尝试获取Docker Hub用户信息，检查是否已登录
if ! docker info | grep -q "Username"; then
    print_yellow "请登录 Docker Hub:"
    docker login
    if [ $? -ne 0 ]; then
        print_red "Docker Hub 登录失败，退出构建"
        exit 1
    fi
fi

print_green "已登录 Docker Hub"

# 处理清理选项
if $AUTO_CLEAN; then
    # 自动清理，无需确认
    cleanup_containers
    cleanup_images
elif $NO_CLEAN; then
    # 不清理
    print_yellow "按要求跳过清理步骤"
else
    # 询问用户是否要清理现有容器和镜像
    read -p "是否清理现有的容器和镜像? (y/n): " cleanup_confirmation
    if [[ "$cleanup_confirmation" =~ ^[Yy]$ ]]; then
        cleanup_containers
        cleanup_images
    else
        print_yellow "跳过清理步骤"
    fi
fi

# 记录开始时间
start_time=$(date +%s)
print_blue "开始构建和推送过程，版本: $VERSION"
print_yellow "将构建以下镜像:"
$BUILD_BASE && print_yellow "- 基础镜像 (auto-coder-base)"
$BUILD_STORAGE && print_yellow "- 存储镜像 (byzer-storage)"
$BUILD_APP && print_yellow "- 应用镜像 (auto-coder-app)"
$BUILD_LOCAL && print_yellow "- 本地应用镜像 (local-auto-coder-app)"

# 构建所选的镜像
cd "$(dirname "$0")"  # 确保在docker目录中

# 构建基础镜像
if $BUILD_BASE; then
    print_yellow "1. 构建基础镜像 (auto-coder-base)..."
    cd base
    docker build -t auto-coder-base .
    docker tag auto-coder-base:latest $DOCKER_USERNAME/auto-coder-base:$VERSION
    print_green "基础镜像构建完成"
    cd ..
fi

# 构建存储镜像
if $BUILD_STORAGE; then
    print_yellow "2. 构建存储镜像 (byzer-storage)..."
    cd byzer-storage
    docker build -t byzer-storage .
    docker tag byzer-storage:latest $DOCKER_USERNAME/byzer-storage:$VERSION
    print_green "存储镜像构建完成"
    cd ..
fi

# 构建应用镜像
if $BUILD_APP; then
    print_yellow "3. 构建应用镜像 (auto-coder-app)..."
    cd app
    docker build -t auto-coder-app .
    docker tag auto-coder-app:latest $DOCKER_USERNAME/auto-coder-app:$VERSION
    print_green "应用镜像构建完成"
    cd ..
fi

# 构建本地应用镜像
if $BUILD_LOCAL; then
    print_yellow "4. 构建本地应用镜像 (local-auto-coder-app)..."
    cd local-app
    docker build -t local-auto-coder-app .
    docker tag local-auto-coder-app:latest $DOCKER_USERNAME/local-auto-coder-app:$VERSION
    print_green "本地应用镜像构建完成"
    cd ..
fi

print_blue "所有选定镜像构建完成，准备推送..."

# 推送镜像到Docker Hub
print_yellow "推送镜像到 Docker Hub..."

# 推送基础镜像
if $BUILD_BASE; then
    print_yellow "1. 推送基础镜像..."
    docker push $DOCKER_USERNAME/auto-coder-base:$VERSION
fi

# 推送存储镜像
if $BUILD_STORAGE; then
    print_yellow "2. 推送存储镜像..."
    docker push $DOCKER_USERNAME/byzer-storage:$VERSION
fi

# 推送应用镜像
if $BUILD_APP; then
    print_yellow "3. 推送应用镜像..."
    docker push $DOCKER_USERNAME/auto-coder-app:$VERSION
fi

# 推送本地应用镜像
if $BUILD_LOCAL; then
    print_yellow "4. 推送本地应用镜像..."
    docker push $DOCKER_USERNAME/local-auto-coder-app:$VERSION
fi

# 如果指定了非latest版本，同时设置latest标签
if [ "$VERSION" != "latest" ]; then
    print_yellow "同时设置latest标签并推送..."
    
    if $BUILD_BASE; then
        docker tag $DOCKER_USERNAME/auto-coder-base:$VERSION $DOCKER_USERNAME/auto-coder-base:latest
        docker push $DOCKER_USERNAME/auto-coder-base:latest
    fi
    
    if $BUILD_STORAGE; then
        docker tag $DOCKER_USERNAME/byzer-storage:$VERSION $DOCKER_USERNAME/byzer-storage:latest
        docker push $DOCKER_USERNAME/byzer-storage:latest
    fi
    
    if $BUILD_APP; then
        docker tag $DOCKER_USERNAME/auto-coder-app:$VERSION $DOCKER_USERNAME/auto-coder-app:latest
        docker push $DOCKER_USERNAME/auto-coder-app:latest
    fi
    
    if $BUILD_LOCAL; then
        docker tag $DOCKER_USERNAME/local-auto-coder-app:$VERSION $DOCKER_USERNAME/local-auto-coder-app:latest
        docker push $DOCKER_USERNAME/local-auto-coder-app:latest
    fi
fi

# 记录结束时间并计算总用时
end_time=$(date +%s)
duration=$((end_time - start_time))
minutes=$((duration / 60))
seconds=$((duration % 60))

print_green "==================================="
print_green "所有镜像构建和推送完成！"
print_green "版本: $VERSION"
print_green "总用时: ${minutes}分${seconds}秒"
print_green "==================================="

# 显示使用提示
print_blue "您可以使用以下命令运行容器:"
echo ""

if $BUILD_APP; then
    print_yellow "应用镜像:"
    echo "docker run --name auto-coder-app -p 8006:8006 -p 8007:8007 -p 8265:8265 -v \$(pwd)/work:/app/work -v \$(pwd)/logs:/app/logs $DOCKER_USERNAME/auto-coder-app:$VERSION"
    echo ""
fi

if $BUILD_LOCAL; then
    print_yellow "本地应用镜像:"
    echo "docker run --name local-auto-coder-app -p 8006:8006 -p 8007:8007 -p 8265:8265 -v \$(pwd)/work:/app/work -v \$(pwd)/logs:/app/logs $DOCKER_USERNAME/local-auto-coder-app:$VERSION"
    echo ""
fi

if $BUILD_STORAGE; then
    print_yellow "存储服务镜像:"
    echo "docker run --name byzer-storage -p 9000:9000 -v \$(pwd)/data:/data $DOCKER_USERNAME/byzer-storage:$VERSION"
fi 