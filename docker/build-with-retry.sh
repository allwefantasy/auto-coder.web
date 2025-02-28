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

# 显示帮助信息
show_help() {
    echo "用法: $0 [选项]"
    echo "选项:"
    echo "  -h, --help                显示帮助信息"
    echo "  -v, --version VERSION     指定构建版本号 (例如: v0.1.276)"
    echo "  -c, --components COMPS    指定要构建的组件，用逗号分隔"
    echo "                            可选值: base,storage,app,local"
    echo "                            例如: -c base,app 仅构建基础镜像和应用镜像"
    echo ""
    echo "示例:"
    echo "  $0                        构建所有组件，提示输入版本号"
    echo "  $0 -v v0.1.276            构建所有组件，版本为 v0.1.276"
    echo "  $0 -c base,storage        仅构建 base 和 storage 组件，提示输入版本号"
    echo "  $0 -v v0.1.276 -c app,local  构建 app 和 local 组件，版本为 v0.1.276"
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

print_blue "开始构建版本: $VERSION"
print_yellow "将使用 --no-cache 选项进行构建，并推送到 Docker Hub"

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
        
        if $SCRIPT_DIR/build-and-push.sh -b "$component" --no-clean --no-cache -p "$VERSION"; then
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

print_blue "您可以使用以下命令运行容器:"
print_yellow "本地应用镜像:"
echo "docker run --name local-auto-coder-app -p 8006:8006 -p 8007:8007 -p 8265:8265 -v \$(pwd)/work:/app/work -v \$(pwd)/logs:/app/logs allwefantasy/local-auto-coder-app:$VERSION" 