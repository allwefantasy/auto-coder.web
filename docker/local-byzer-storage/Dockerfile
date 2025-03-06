FROM allwefantasy/auto-coder-base:latest

# 定义Byzer Storage版本变量
ARG BYZER_STORAGE_VERSION=0.2.0

# 安装JDK21
RUN apt-get update && apt-get install -y \
    wget \
    && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /root/.auto-coder/storage/libs

# 下载Byzer Storage包
WORKDIR /app
RUN wget https://github.com/allwefantasy/BYZER-RETRIEVAL/releases/download/v${BYZER_STORAGE_VERSION}/byzer-storage-${BYZER_STORAGE_VERSION}-linux-x64.tar.gz \
    && tar -xzvf byzer-storage-${BYZER_STORAGE_VERSION}-linux-x64.tar.gz \
    && rm byzer-storage-${BYZER_STORAGE_VERSION}-linux-x64.tar.gz

# 设置工作目录
WORKDIR /app/byzer-storage-${BYZER_STORAGE_VERSION}-linux-x64

# 设置环境变量
ENV PATH="/app/byzer-storage-${BYZER_STORAGE_VERSION}-linux-x64/bin:${PATH}" \
    BYZER_STORAGE_VERSION=${BYZER_STORAGE_VERSION}

# 启动脚本
# COPY entrypoint.sh /app/entrypoint.sh
# RUN chmod +x /app/entrypoint.sh

# 端口暴露
# EXPOSE 33333

# 启动服务
# ENTRYPOINT ["/app/entrypoint.sh"]

