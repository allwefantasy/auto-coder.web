# Docker 构建和使用指南

本文档介绍如何构建和使用 Docker 镜像来运行服务。系统包含四个 Docker 镜像：基础镜像、应用镜像、本地应用镜像和存储镜像。


## 构建说明 （可选）

你看也可以直接使用我们的公开镜像：

- 基础镜像：[allwefantasy/auto-coder-base](https://hub.docker.com/r/allwefantasy/auto-coder-base)
- 存储镜像：[allwefantasy/byzer-storage](https://hub.docker.com/r/allwefantasy/byzer-storage) 提供存储服务
- 应用镜像：[allwefantasy/auto-coder-app](https://hub.docker.com/r/allwefantasy/auto-coder-app) 会在启动的时候添加一些依赖
- 本地应用镜像：[allwefantasy/local-auto-coder-app](https://hub.docker.com/r/allwefantasy/local-auto-coder-app) 依赖在构建时预装

此时可以跳过本步骤。

### 0. 使用自动构建脚本（推荐）

我们提供了一个自动构建脚本，可以一次性构建并推送所有组件，并包含自动重试功能：

```bash
# 进入 docker 目录
cd docker

# 构建所有组件（提示输入版本号）
./build-with-retry.sh

# 构建指定组件
./build-with-retry.sh -c base,storage

# 指定版本号构建
./build-with-retry.sh -v v0.1.276

# 使用缓存构建（加快构建速度）
./build-with-retry.sh --use-cache

# 查看帮助
./build-with-retry.sh --help
```

如果你需要手动构建各个镜像，可以按照以下步骤操作：

### 1. 构建基础镜像

基础镜像包含了 Ubuntu 22.04、Conda 环境（Python 3.10.11）和必要的基础包。

```bash
cd docker/base
docker build -t auto-coder-base .
docker tag auto-coder-base:latest allwefantasy/auto-coder-base:latest
```

基础镜像特性：
- Ubuntu 22.04 操作系统
- Miniconda 环境
- Python 3.10.11
- 配置清华大学 pip 镜像源
- 预装 auto-coder 包

### 2. 构建存储镜像

存储镜像提供了数据存储服务。

```bash
cd ../byzer-storage
docker build -t byzer-storage .
docker tag byzer-storage:latest allwefantasy/byzer-storage:latest
```

存储镜像特性：
- 基于 Ubuntu 22.04
- 包含 Python 3.10 环境
- 安装了 byzer-storage 包

### 3. 构建应用镜像

应用镜像基于存储镜像，添加了具体的应用服务,但在镜像启动的时候需要联网下载依赖。

```bash
cd ../app
docker build -t auto-coder-app .
docker tag auto-coder-app:latest allwefantasy/auto-coder-app:latest
```

### 4. 构建本地应用镜像

本地应用镜像将依赖包安装移至构建阶段，启动更快，适合本地开发使用。

```bash
cd ../local-app
docker build -t local-auto-coder-app .
docker tag local-auto-coder-app:latest allwefantasy/local-auto-coder-app:latest
```

本地应用镜像特性：
- 基于存储镜像 byzer-storage
- 在构建阶段预安装所有依赖包（williamtoolbox 和 auto_coder_web）
- 容器启动时无需再安装依赖，启动更快

## 使用说明

### 1. 准备工作目录

在运行容器之前，请确保你的本地工作目录结构如下：

```
work/
logs/
```

### 2. 运行标准应用容器

使用以下命令运行标准应用容器：

```bash
docker run  \
  --name auto-coder-app \  
  -p 8006:8006 \
  -p 8007:8007 \
  -p 8265:8265 \
  -v <你的项目>:/app/work \
  -v <你的日志目录>:/app/logs \
  allwefantasy/auto-coder-app
```

### 3. 运行本地应用容器

> 如果你使用已经构建好的公开镜像可以将后续示例命令中的最后的 local-auto-coder-app 替换成 allwefantasy/local-auto-coder-app

使用以下命令运行本地应用容器：

```bash
docker run  \
  --name local-auto-coder-app \  
  -p 8006:8006 \
  -p 8007:8007 \
  -p 8265:8265 \
  -v <你的项目>:/app/work \
  -v <你的日志目录>:/app/logs \
  allwefantasy/local-auto-coder-app
```




# 推送 Docker 镜像到 Docker Hub 指南

## 1. 准备工作

1. 确保你有 Docker Hub 账号，如果没有请在 [Docker Hub](https://hub.docker.com) 注册

2. 在本地登录 Docker Hub：
```bash
docker login
```
系统会提示输入用户名和密码


## 2. 推送镜像

推送镜像到 Docker Hub：

```bash
# 推送基础镜像
docker push allwefantasy/auto-coder-base:latest

# 推送byzer-storage镜像
docker push allwefantasy/byzer-storage:latest

# 推送应用镜像
docker push allwefantasy/auto-coder-app:latest

# 推送本地应用镜像（预装依赖）
docker push allwefantasy/local-auto-coder-app:latest
```

## 3. 验证

1. 登录 [Docker Hub](https://hub.docker.com) 网站
2. 在你的仓库列表中应该能看到刚推送的镜像

## 4. 使用推送后的镜像

其他用户可以通过以下命令拉取和使用你的镜像：

```bash
# 拉取镜像
docker pull allwefantasy/auto-coder-app:latest

# 运行容器
docker run  \
  --name auto-coder-app \
  -e BASE_URL=https://api.deepseek.com/v1 \
  -e API_KEY=$MODEL_DEEPSEEK_TOKEN \
  -e MODEL=deepseek-chat \
  -p 8007:8007 \  
  -p 8265:8265 \
  -v <你的项目>:/app/work \
  -v <你的日志目录>:/app/logs \
  auto-coder-web
```

### 使用预装依赖的本地应用镜像

```bash
# 拉取镜像
docker pull allwefantasy/local-auto-coder-app:latest

# 运行容器
docker run  \
  --name local-auto-coder \
  -e BASE_URL=https://api.deepseek.com/v1 \
  -e API_KEY=$MODEL_DEEPSEEK_TOKEN \
  -e MODEL=deepseek-chat \
  -p 8007:8007 \  
  -p 8265:8265 \
  -v <你的项目>:/app/work \
  -v <你的日志目录>:/app/logs \
  allwefantasy/local-auto-coder-app
```