FROM auto-coder-base:latest

# 安装JDK21
RUN apt-get update && apt-get install -y \
    wget \
    && rm -rf /var/lib/apt/lists/*

RUN mkdir -p ~/.auto-coder/storage/libs

# 下载JDK21并安装到~/.auto-coder/目录
RUN wget https://download.oracle.com/java/21/latest/jdk-21_linux-x64_bin.tar.gz -O /tmp/jdk-21.tar.gz && \
    mkdir -p ~/.auto-coder/ && \
    tar -xzf /tmp/jdk-21.tar.gz -C ~/.auto-coder/ && \
    rm /tmp/jdk-21.tar.gz && \
    mv ~/.auto-coder/jdk-21* ~/.auto-coder/jdk21

# 设置JAVA_HOME环境变量
ENV JAVA_HOME=~/.auto-coder/jdk21
ENV PATH=$JAVA_HOME/bin:$PATH

# 下载byzer-retrieval库
RUN wget https://github.com/allwefantasy/BYZER-RETRIEVAL/releases/download/0.1.11/byzer-retrieval-lib-0.1.11.tar.gz -O /tmp/byzer-retrieval-lib.tar.gz && \
    mkdir -p ~/.auto-coder/storage/libs && \
    tar -xzf /tmp/byzer-retrieval-lib.tar.gz -C ~/.auto-coder/storage/libs && \
    rm /tmp/byzer-retrieval-lib.tar.gz

# 验证安装
RUN java -version
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
RUN pip config set global.index-url https://mirrors.tuna.tsinghua.edu.cn/pypi/web/simple

# 安装byzer-storage
RUN pip install -U byzer-storage