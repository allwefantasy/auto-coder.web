FROM allwefantasy/auto-coder-base:latest

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