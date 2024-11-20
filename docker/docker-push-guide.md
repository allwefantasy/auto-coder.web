# 推送 Docker 镜像到 Docker Hub 指南

## 1. 准备工作

1. 确保你有 Docker Hub 账号，如果没有请在 [Docker Hub](https://hub.docker.com) 注册

2. 在本地登录 Docker Hub：
```bash
docker login
```
系统会提示输入用户名和密码

## 2. 重新标记镜像

需要将本地镜像按照 Docker Hub 的命名规范重新标记：

```bash
# 标记基础镜像
docker tag base:latest allwefantasy/auto-coder:latest

# 标记应用镜像
docker tag auto-coder-web:latest allwefantasy/auto-coder-web:latest
```


## 3. 推送镜像

推送镜像到 Docker Hub：

```bash
# 推送基础镜像
docker push allwefantasy/auto-coder:latest

# 推送应用镜像
docker push allwefantasy/auto-coder-web:latest
```

## 4. 验证

1. 登录 [Docker Hub](https://hub.docker.com) 网站
2. 在你的仓库列表中应该能看到刚推送的镜像

## 5. 使用推送后的镜像

其他用户可以通过以下命令拉取和使用你的镜像：

```bash
# 拉取镜像
docker pull allwefantasy/auto-coder-web:latest

# 运行容器
docker run  \
  --name auto-coder-web \
  -e BASE_URL=https://api.deepseek.com/v1 \
  -e API_KEY=$MODEL_DEEPSEEK_TOKEN \
  -e MODEL=deepseek-chat \
  -p 8007:8007 \  
  -p 8265:8265 \
  -v <你的项目>:/app/work \
  -v <你的日志目录>:/app/logs \
  auto-coder-web
```
