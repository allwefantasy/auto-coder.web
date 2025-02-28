# 构建和使用指南

current version: v0.1.275

全量构建

```bash
./build-and-push.sh -b base --no-cache -p v0.1.276
./build-and-push.sh -b storage --no-cache -p v0.1.276
./build-and-push.sh -b app --no-cache -p v0.1.276
./build-and-push.sh -b local --no-cache -p v0.1.276
```

增量构建:

```
./build-and-push.sh -b app,local --no-cache -p v0.1.276
```


启动:

```
  docker run  \
  --name auto-coder.rag \
  -p 8006:8006 \
  -p 8007:8007 \
  -p 8265:8265 \
  -v /home/william-pc/projects/workspace/wow/work:/app/work \
  -v /home/william-pc/projects/workspace/wow/logs:/app/logs \
  allwefantasy/local-auto-coder-app:v0.1.274
```

