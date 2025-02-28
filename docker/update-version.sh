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
README_FILE="${SCRIPT_DIR}/README.md"

# 显示帮助信息
show_help() {
    echo "用法: $0 [选项]"
    echo "选项:"
    echo "  -h, --help             显示帮助信息"
    echo "  -v, --version VERSION  指定要更新的版本号 (例如: v0.1.276)"
    echo ""
    echo "示例:"
    echo "  $0 -v v0.1.276         将 README.md 中的版本号更新为 v0.1.276"
    exit 0
}

# 解析命令行参数
VERSION=""
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
        *)
            print_red "错误: 未知选项 $1"
            echo "使用 -h 或 --help 查看帮助信息"
            exit 1
            ;;
    esac
done

# 如果没有指定版本号，提示用户输入
if [[ -z "$VERSION" ]]; then
    read -p "请输入新的版本号 (例如: v0.1.276): " VERSION
    
    if [[ -z "$VERSION" ]]; then
        print_red "错误: 版本号不能为空"
        exit 1
    fi
fi

# 检查README文件是否存在
if [[ ! -f "$README_FILE" ]]; then
    print_red "错误: README.md 文件不存在: $README_FILE"
    exit 1
fi

# 获取当前版本
CURRENT_VERSION=$(grep -m 1 "current version:" "$README_FILE" | sed 's/current version: //')
if [[ -z "$CURRENT_VERSION" ]]; then
    print_red "错误: 在 README.md 中没有找到版本信息行"
    exit 1
fi

print_blue "当前版本: $CURRENT_VERSION"
print_blue "新版本: $VERSION"

# 更新版本号
if sed -i.bak "s/current version: $CURRENT_VERSION/current version: $VERSION/" "$README_FILE"; then
    rm -f "${README_FILE}.bak"
    print_green "版本号已成功更新为 $VERSION"
    
    # 同时更新构建命令中的版本号
    if sed -i.bak "s/-p $CURRENT_VERSION/-p $VERSION/g" "$README_FILE"; then
        rm -f "${README_FILE}.bak"
        print_green "构建命令中的版本号已更新"
    else
        print_red "更新构建命令中的版本号失败"
    fi
else
    print_red "更新版本号失败"
    exit 1
fi

print_green "README.md 文件已成功更新" 