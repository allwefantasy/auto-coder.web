#!/bin/bash
set -e

# 颜色输出函数
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

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 默认组件列表
ALL_COMPONENTS=("base" "storage" "app" "local")
components=("${ALL_COMPONENTS[@]}")
VERSION=""
USE_CACHE=false
USE_CLEAN=true
UPDATE_README=true

# 显示帮助信息
show_help() {
    echo "用法: $0 [选项]"
    echo "选项:"
    echo "  -h, --help                显示帮助信息"
    echo "  -v, --version VERSION     指定构建版本号 (例如: v0.1.276)"
    echo "  -c, --components COMPS    指定要构建的组件，用逗号分隔"
    echo "                            可选值: base,storage,app,local"
    echo "                            例如: -c base,app 仅构建基础镜像和应用镜像"
    echo "  --use-cache               使用缓存进行构建（默认不使用缓存）"
    echo "  --clean                   构建前清理选定组件的容器和镜像（默认不清理）"
    echo "  --no-update-readme        不更新 README.md 中的版本号（默认会更新）"
    echo ""
    echo "示例:"
    echo "  $0                        构建所有组件，提示输入版本号，不使用缓存，不清理"
    echo "  $0 -v v0.1.276            构建所有组件，版本为 v0.1.276，不使用缓存，不清理"
    echo "  $0 -c base,storage        仅构建 base 和 storage 组件，不使用缓存，不清理"
    echo "  $0 --use-cache            构建所有组件，使用缓存，不清理"
    echo "  $0 --clean                构建所有组件，不使用缓存，构建前清理选定组件的镜像"
    echo "  $0 --no-update-readme     构建所有组件，不更新 README.md 版本号"
    exit 0
}

# 解析命令行参数
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            ;;
        -v|--version)
            if [[ -z "$2" || "$2" == -* ]]; then
                print_red "错误: --version 选项需要参数"
                exit 1
            fi
            VERSION="$2"
            shift 2
            ;;
        -c|--components)
            if [[ -z "$2" || "$2" == -* ]]; then
                print_red "错误: --components 选项需要参数"
                exit 1
            fi
            # 清空默认组件列表
            components=()
            # 解析用户指定的组件
            IFS=',' read -ra USER_COMPONENTS <<< "$2"
            for component in "${USER_COMPONENTS[@]}"; do
                # 验证组件名称有效
                valid=false
                for valid_comp in "${ALL_COMPONENTS[@]}"; do
                    if [[ "$component" == "$valid_comp" ]]; then
                        valid=true
                        break
                    fi
                done
                
                if [[ "$valid" == "true" ]]; then
                    components+=("$component")
                else
                    print_red "错误: 未知的组件类型 '$component'"
                    echo "有效的组件类型: base, storage, app, local"
                    exit 1
                fi
            done
            shift 2
            ;;
        --use-cache)
            USE_CACHE=true
            shift
            ;;
        --clean)
            USE_CLEAN=false
            shift
            ;;
        --no-update-readme)
            UPDATE_README=false
            shift
            ;;
        *)
            print_red "错误: 未知选项 $1"
            echo "使用 -h 或 --help 查看帮助信息"
            exit 1
            ;;
    esac
done

# 如果没有通过命令行指定版本号，提示用户输入
if [[ -z "$VERSION" ]]; then
    read -p "请输入构建版本号 (例如: v0.1.276): " VERSION
    
    if [[ -z "$VERSION" ]]; then
        print_red "错误: 版本号不能为空"
        exit 1
    fi
fi

# 更新README中的版本号
if [ "$UPDATE_README" = true ]; then
    print_blue "正在更新 README.md 中的版本号..."
    if [ -x "$SCRIPT_DIR/update-version.sh" ]; then
        if "$SCRIPT_DIR/update-version.sh" -v "$VERSION"; then
            print_green "README.md 版本号已更新为 $VERSION"
        else
            print_red "更新 README.md 版本号失败，但将继续构建过程"
        fi
    else
        print_red "update-version.sh 脚本不存在或不可执行，无法更新 README.md 版本号"
    fi
fi

print_blue "开始构建版本: $VERSION"

# 构建选项
BUILD_OPTS=""
if [[ "$USE_CACHE" == "false" ]]; then
    BUILD_OPTS="$BUILD_OPTS --no-cache"
    print_yellow "将使用无缓存模式进行构建"
else
    print_yellow "将使用缓存模式进行构建"
fi

if [[ "$USE_CLEAN" == "false" ]]; then
    BUILD_OPTS="$BUILD_OPTS --no-clean"
    print_yellow "将跳过清理步骤"
else
    print_yellow "将在构建前执行清理"
fi

BUILD_OPTS="$BUILD_OPTS -p $VERSION"

# 显示要构建的组件
print_yellow "将构建以下组件:"
for component in "${components[@]}"; do
    print_yellow "- $component"
done

# 为每个组件运行构建命令，最多重试3次
for component in "${components[@]}"; do
    retry_count=0
    max_retries=3
    success=false

    while [ $retry_count -lt $max_retries ] && [ "$success" = false ]; do
        print_yellow "正在构建 $component 组件 (尝试 $((retry_count+1))/$max_retries)..."
        
        if $SCRIPT_DIR/build-and-push.sh -b "$component" $BUILD_OPTS; then
            print_green "$component 组件构建成功！"
            success=true
        else
            retry_count=$((retry_count+1))
            if [ $retry_count -lt $max_retries ]; then
                print_red "$component 组件构建失败，将在5秒后重试..."
                sleep 5
            else
                print_red "$component 组件在 $max_retries 次尝试后仍然构建失败。"
                print_red "请检查错误并手动解决问题。"
                exit 1
            fi
        fi
    done
done

print_green "====================================="
print_green "所有组件构建成功并已推送到 Docker Hub！"
print_green "版本: $VERSION"
print_green "====================================="

# 显示使用示例
print_blue "您可以使用以下命令运行容器:"

# 如果构建了本地应用镜像，显示其运行命令
if [[ " ${components[*]} " =~ " local " ]] || [[ "${#components[@]}" -eq 4 ]]; then
    print_yellow "本地应用镜像:"
    echo "docker run --name local-auto-coder-app -p 8006:8006 -p 8007:8007 -p 8265:8265 -v \$(pwd)/work:/app/work -v \$(pwd)/logs:/app/logs allwefantasy/local-auto-coder-app:$VERSION"
fi

# 如果构建了应用镜像，显示其运行命令
if [[ " ${components[*]} " =~ " app " ]] || [[ "${#components[@]}" -eq 4 ]]; then
    print_yellow "应用镜像:"
    echo "docker run --name auto-coder-app -p 8006:8006 -p 8007:8007 -p 8265:8265 -v \$(pwd)/work:/app/work -v \$(pwd)/logs:/app/logs allwefantasy/auto-coder-app:$VERSION"
fi

# 如果构建了存储镜像，显示其运行命令
if [[ " ${components[*]} " =~ " storage " ]] || [[ "${#components[@]}" -eq 4 ]]; then
    print_yellow "存储服务镜像:"
    echo "docker run --name byzer-storage -p 9000:9000 -v \$(pwd)/data:/data allwefantasy/byzer-storage:$VERSION"
fi 