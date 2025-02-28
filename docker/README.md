# 构建和使用指南

current version: v0.1.276

## 使用自动构建脚本（推荐）

新增的自动构建脚本支持一次性构建所有组件，并具有自动重试功能：

```bash
# 构建所有组件
./build-with-retry.sh

# 构建指定组件
./build-with-retry.sh -c base,storage

# 指定版本号构建
./build-with-retry.sh -v v0.1.276

# 查看帮助
./build-with-retry.sh --help
```

## 手动全量构建

```bash
./build-and-push.sh -b base --no-clean --no-cache -p v0.1.276
./build-and-push.sh -b storage --no-clean --no-cache -p v0.1.276
./build-and-push.sh -b app --no-clean --no-cache -p v0.1.276
./build-and-push.sh -b local --no-clean --no-cache -p v0.1.276
```

## 增量构建:

```
./build-and-push.sh -b app --no-cache -p v0.1.276
./build-and-push.sh -b local --no-cache -p v0.1.276
```

## 启动:

```
  docker run  \
  --name auto-coder.rag \
  -p 8006:8006 \
  -p 8007:8007 \
  -p 8265:8265 \
  -v /home/william-pc/projects/workspace/wow/work:/app/work \
  -v /home/william-pc/projects/workspace/wow/logs:/app/logs \
  allwefantasy/local-auto-coder-app:v0.1.276
```

