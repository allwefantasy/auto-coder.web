FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y \
    wget git vim curl \
    && rm -rf /var/lib/apt/lists/*

# 安装Miniconda
RUN wget https://repo.anaconda.com/miniconda/Miniconda3-latest-Linux-x86_64.sh -O ~/miniconda.sh && \
    bash ~/miniconda.sh -b -p /opt/conda && \
    rm ~/miniconda.sh

# 将conda加入环境变量
ENV PATH=/opt/conda/bin:$PATH

# 创建Python环境
RUN conda create -n py310 python=3.10.11 -y
SHELL ["conda", "run", "-n", "py310", "/bin/bash", "-c"]

# 设置pip镜像
# RUN pip config set global.index-url https://mirrors.tuna.tsinghua.edu.cn/pypi/web/simple

# 安装 NodeJS
RUN apt-get update && apt-get install -y ca-certificates gnupg && \
    mkdir -p /etc/apt/keyrings && \
    wget -qO- https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg && \
    echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_18.x nodistro main" > /etc/apt/sources.list.d/nodesource.list && \
    apt-get update && apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

# 验证 NodeJS 安装
RUN node -v && npm -v

# 安装auto-coder
RUN pip install -U auto-coder
RUN pip install python-multipart
