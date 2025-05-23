# 库管理API测试命令

以下是用于测试库管理API的curl命令。请根据您的实际端口调整URL中的端口号。

## 1. 列出所有库

```bash
curl -X GET "http://localhost:8007/api/lib/list"
```

## 2. 添加库

```bash
curl -X POST "http://localhost:8007/api/lib/add" \
  -H "Content-Type: application/json" \
  -d '{"lib_name": "byzer-llm"}'
```

## 3. 移除库

```bash
curl -X POST "http://localhost:8007/api/lib/remove" \
  -H "Content-Type: application/json" \
  -d '{"lib_name": "byzer-llm"}'
```

## 4. 获取当前代理设置

```bash
curl -X POST "http://localhost:8007/api/lib/set-proxy"
```

## 5. 设置代理URL

```bash
curl -X POST "http://localhost:8007/api/lib/set-proxy" \
  -H "Content-Type: application/json" \
  -d '{"proxy_url": "https://github.com/allwefantasy/llm_friendly_packages"}'
```

## 6. 刷新llm_friendly_packages仓库

```bash
curl -X POST "http://localhost:8007/api/lib/refresh"
```

## 7. 获取特定包的文档

```bash
curl -X POST "http://localhost:8007/api/lib/get" \
  -H "Content-Type: application/json" \
  -d '{"package_name": "byzer-llm"}'
```

## 8. 列出所有可用库（包括未添加的库）

```bash
curl -X GET "http://localhost:8007/api/lib/list-all"
``` 