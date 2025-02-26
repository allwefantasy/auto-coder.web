# Docker 构建和使用指南

本文档介绍如何构建和使用 Docker 镜像来运行服务。系统包含四个 Docker 镜像：基础镜像、应用镜像、本地应用镜像和存储镜像。


## 构建说明 （可选）

你看也可以直接使用我们的公开镜像：

- 基础镜像：[allwefantasy/auto-coder](https://hub.docker.com/r/allwefantasy/auto-coder)
- 应用镜像：[allwefantasy/auto-coder-web](https://hub.docker.com/r/allwefantasy/auto-coder-web) 会在启动的时候添加一些依赖
- 本地应用镜像：[allwefantasy/local-auto-coder](https://hub.docker.com/r/allwefantasy/local-auto-coder) 依赖在构建时预装
- 存储镜像：[allwefantasy/byzer-storage](https://hub.docker.com/r/allwefantasy/byzer-storage) 提供存储服务


此时可以跳过本步骤。

### 1. 构建基础镜像

基础镜像包含了 Ubuntu 22.04、Conda 环境（Python 3.10.11）和必要的基础包。

```bash
cd docker/base
docker build -t auto-coder .
```

基础镜像特性：
- Ubuntu 22.04 操作系统
- Miniconda 环境
- Python 3.10.11
- 配置清华大学 pip 镜像源
- 预装 auto-coder 包

### 2. 构建应用镜像

应用镜像基于基础镜像，添加了具体的应用服务。

```bash
cd ../app
docker build -t auto-coder-web .
```

### 3. 构建本地应用镜像

本地应用镜像将依赖包安装移至构建阶段，启动更快，适合本地开发使用。

```bash
cd ../local-app
docker build -t local-auto-coder .
```

本地应用镜像特性：
- 基于基础镜像 auto-coder
- 在构建阶段预安装所有依赖包（williamtoolbox 和 auto_coder_web）
- 容器启动时无需再安装依赖，启动更快

### 4. 构建存储镜像

存储镜像提供了数据存储服务。

```bash
cd ../byzer-storage
docker build -t byzer-storage .
```

存储镜像特性：
- 基于 Ubuntu 22.04
- 包含 Python 3.10 环境
- 安装了 byzer-storage 包

## 使用说明

### 1. 准备工作目录

在运行容器之前，请确保你的本地工作目录结构如下：

```
work/
logs/
```

### 2. 运行标准应用容器

> 如果你使用已经构建好的公开镜像可以将后续示例命令中的最后的 auto-coder-web 替换成 allwefantasy/auto-coder-web

使用以下命令运行标准应用容器：

```bash
docker run  \
  --name auto-coder-web \
  -e BASE_URL=https://api.deepseek.com/v1 \
  -e API_KEY=$MODEL_DEEPSEEK_TOKEN \
  -e MODEL=deepseek-chat \
  -p 8006:8006 \
  -p 8007:8007 \
  -p 8265:8265 \
  -v <你的项目>:/app/work \
  -v <你的日志目录>:/app/logs \
  auto-coder-web
```

### 3. 运行本地应用容器

> 如果你使用已经构建好的公开镜像可以将后续示例命令中的最后的 local-auto-coder 替换成 allwefantasy/local-auto-coder

使用以下命令运行本地应用容器：

```bash
docker run  \
  --name local-auto-coder \
  -e BASE_URL=https://api.deepseek.com/v1 \
  -e API_KEY=$MODEL_DEEPSEEK_TOKEN \
  -e MODEL=deepseek-chat \
  -p 8006:8006 \
  -p 8007:8007 \
  -p 8265:8265 \
  -v <你的项目>:/app/work \
  -v <你的日志目录>:/app/logs \
  local-auto-coder
```

### 4. 运行存储服务容器

> 如果你使用已经构建好的公开镜像可以将后续示例命令中的最后的 byzer-storage 替换成 allwefantasy/byzer-storage

使用以下命令运行存储服务容器：

```bash
docker run  \
  --name byzer-storage \
  -p 9000:9000 \
  -v <你的数据目录>:/data \
  byzer-storage
```
