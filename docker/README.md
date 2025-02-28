# 构建和推送Docker镜像

## 版本

### v0.1.274

1. base 镜像增加 nodejs 支持，添加 vim 支持。
2. auto-coder升级到 0.1.274
3. williamtoolbox 升级到 0.1.44，修正 rag 进程无法正常退出的问题。
4. auto-coder.web 升级到 0.1.16， 修正编辑器无法加载的问题



## 全量全部重新构建

```bash
./build-and-push.sh -b base,storage,app,local --no-cache -p v0.1.273 
```

## app,local 跟着应用更新

```bash
./build-and-push.sh -b app,local --no-cache -p v0.1.273 
```


