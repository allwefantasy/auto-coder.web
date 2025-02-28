FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y \
    wget git \
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

# 安装auto-coder
RUN pip install -U auto-coder
RUN pip install python-multipart
