#!/bin/bash

# 创建日志目录
mkdir -p /app/logs
mkdir -p /app/tools

# 启动Ray
ray start --head --dashboard-host 0.0.0.0 --disable-usage-stats > /app/logs/ray.log 2>&1

# 启动ByzerLLM存储服务
# byzerllm storage start

cd /app/byzer-storage-${BYZER_STORAGE_VERSION}-linux-x64
./bin/service.sh start

# 启动ByzerLLM服务
# byzerllm deploy --pretrained_model_type saas/openai \
# --cpus_per_worker 0.001 \
# --gpus_per_worker 0 \
# --num_workers 1 \
# --worker_concurrency 1000 \
# --infer_params saas.base_url="${BASE_URL:-https://api.deepseek.com/v1}" saas.api_key="${API_KEY}" saas.model="${MODEL:-deepseek-chat}" \
# --model deepseek_chat 2>&1 | tee /app/logs/byzerllm.log &

# 启动william.toolbox服务
cd /app/tools
william.toolbox.backend 2>&1 | tee /app/logs/william.toolbox.backend.log &
william.toolbox.frontend 2>&1 | tee /app/logs/william.toolbox.frontend.log &

cd /app/work

# 使用tail -f 来实时查看所有日志
tail -f /app/logs/*.log &

# 启动主应用
exec auto-coder.web --quick --lite --port 8007 2>&1 | tee /app/logs/auto-coder-web.log 