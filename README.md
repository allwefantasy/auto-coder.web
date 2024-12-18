# auto-coder.web

## 安装

```
pip install auto_coder_web
```

## 进入项目

```
cd <project_dir>    
auto-coder.web 
```

## 打开浏览器

http://localhost:8007

开始你的编程！

## 使用 Docker 运行
> 使用 docker 时，需要你的项目已经是一个被 auto-coder.chat 初始化过的项目。
> 或者启动后，在界面 Terminal 中执行 `auto-coder init --source_dir .` 初始化项目。


```shell
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
  allwefantasy/auto-coder-web
```

打开浏览器

http://localhost:8007

开始你的编程！



