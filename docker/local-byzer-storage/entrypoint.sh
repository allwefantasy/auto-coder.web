#!/bin/bash
set -e

echo "Starting Byzer Storage service version ${BYZER_STORAGE_VERSION}..."

# 切换到bin目录
cd /app/byzer-storage-${BYZER_STORAGE_VERSION}-linux-x64/bin

# 确保服务脚本有执行权限
chmod +x service.sh

# 启动服务
./service.sh start

# 保持容器运行
echo "Byzer Storage service v${BYZER_STORAGE_VERSION} started. Container is now running..."
tail -f /dev/null 