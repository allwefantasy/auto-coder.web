# Docker 构建和使用指南

本文档介绍如何构建和使用 Docker 镜像来运行服务。系统包含两个 Docker 镜像：基础镜像和应用镜像。


## 构建说明 （可选）

你看也可以直接使用我们的公开镜像：

- 基础镜像：[allwefantasy/auto-coder](https://hub.docker.com/r/allwefantasy/auto-coder)
- 应用镜像：[allwefantasy/auto-coder-web](https://hub.docker.com/r/allwefantasy/auto-coder-web)

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

## 使用说明

### 1. 准备工作目录

在运行容器之前，请确保你的本地工作目录结构如下：

```
work/
logs/
```

### 2. 运行容器

> 如果你使用已经构建好的公开镜像可以将后续示例命令中的最后的 app 替换成 allwefantasy/data_analysis_box

使用以下命令运行容器：

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
