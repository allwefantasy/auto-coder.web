#!/bin/bash

# 创建日志目录
mkdir -p /app/logs
mkdir -p /app/tools

# conda activate py310

# 安装依赖
pip install williamtoolbox
pip install -U auto_coder_web
ray start --head --dashboard-host 0.0.0.0 --disable-usage-stats > /app/logs/ray.log 2>&1
byzerllm storage start

# byzerllm deploy --pretrained_model_type saas/openai \
# --cpus_per_worker 0.001 \
# --gpus_per_worker 0 \
# --num_workers 1 \
# --worker_concurrency 1000 \
# --infer_params saas.base_url="${BASE_URL:-https://api.deepseek.com/v1}" saas.api_key="${API_KEY}" saas.model="${MODEL:-deepseek-chat}" \
# --model deepseek_chat 2>&1 | tee /app/logs/byzerllm.log &

cd /app/tools
william.toolbox.backend 2>&1 | tee /app/logs/william.toolbox.backend.log &
william.toolbox.frontend 2>&1 | tee /app/logs/william.toolbox.frontend.log &

cd /app/work

# 使用tail -f 来实时查看所有日志
tail -f /app/logs/*.log &

# 保持容器运行
exec auto-coder.web --quick --lite --port 8007 2>&1 | tee /app/logs/auto-coder-web.log