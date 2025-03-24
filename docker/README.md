# 构建和使用指南

current version: v0.1.276

## 使用自动构建脚本（推荐）

增量构建:

```bash
./build-with-retry.sh -c local -v v0.1.314
```

新增的自动构建脚本支持一次性构建所有组件，并具有自动重试功能：

```bash
# 构建所有组件
./build-with-retry.sh

# 构建指定组件
./build-with-retry.sh -c base,storage

# 指定版本号构建
./build-with-retry.sh -v v0.1.276

# 使用缓存构建（加快构建速度）
./build-with-retry.sh --use-cache

# 构建前清理选定组件的容器和镜像
./build-with-retry.sh --clean

# 不更新 README.md 中的版本号
./build-with-retry.sh --no-update-readme

# 组合选项使用
./build-with-retry.sh -c app,local -v v0.1.276 --use-cache

# 查看帮助
./build-with-retry.sh --help
```

### 自动构建脚本特点

- **指定组件**：通过 `-c` 选项可以指定要构建的组件
- **版本控制**：可以通过 `-v` 选项指定版本号，或在运行时输入
- **构建缓存**：使用 `--use-cache` 选项可加快构建速度
- **选择性清理**：`--clean` 选项只会清理将要构建的组件对应的镜像
- **版本管理**：自动更新 README.md 中的版本号，也可通过 `--no-update-readme` 禁用
- **自动重试**：构建失败时自动重试，最多尝试3次
- **智能提示**：根据构建的组件，显示相应的运行命令

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
allwefantasy/local-auto-coder-app:v0.1.277
```

## 镜像依赖关系与更新流程

### 镜像依赖关系

我们的系统包含四个 Docker 镜像，它们的依赖关系如下：

```
base (基础镜像)
  ↓
storage (存储镜像，依赖于 base)
  ↓
 ╱ ╲
app  local (应用镜像和本地应用镜像，都依赖于 storage)
```

- **base**: 基础镜像，包含 Ubuntu 22.04、Conda 环境和基础依赖
- **storage**: 存储镜像，基于 base 镜像，添加存储服务
- **app**: 应用镜像，基于 storage 镜像，在容器启动时安装依赖
- **local**: 本地应用镜像，基于 storage 镜像，在构建时预安装依赖

### 更新流程指南

#### 常规更新（代码变更，基础依赖不变）

通常我们只需要更新 app 和 local 镜像：

```bash
# 更新应用镜像和本地应用镜像
./build-with-retry.sh -c app,local -v <新版本号>

# 例如
./build-with-retry.sh -c app,local -v v0.1.277
```

这种情况适用于：
- 应用代码变更
- 应用配置变更
- 非基础依赖更新

#### 完整更新（基础依赖变更）

当基础环境或存储服务发生变化时，需要全量重建：

```bash
# 全量重建所有镜像
./build-with-retry.sh -v <新版本号>

# 例如
./build-with-retry.sh -v v0.1.277
```

这种情况适用于：
- 基础系统依赖变更
- Python 版本升级
- 存储服务架构变更
- 核心依赖升级

#### 增量构建加速

如果基础镜像没有变化，可以使用缓存加速构建：

```bash
# 使用缓存加速增量构建
./build-with-retry.sh -c app,local -v <新版本号> --use-cache

# 例如
./build-with-retry.sh -c app,local -v v0.1.277 --use-cache
```

#### 完整更新流程示例

1. 确定是否需要更新基础镜像
   - 如果需要更新基础依赖，执行全量构建
   - 如果只更新应用代码，执行增量构建

2. 执行相应的构建命令
   ```bash
   # 增量构建（仅更新应用）
   ./build-with-retry.sh -c app,local -v v0.1.277
   
   # 或全量构建（基础依赖变更）
   ./build-with-retry.sh -v v0.1.277
   ```

3. 测试镜像
   ```bash
   # 运行并测试新版本
   docker run --name test-container -p 8006:8006 -p 8007:8007 -p 8265:8265 \
   -v $(pwd)/work:/app/work -v $(pwd)/logs:/app/logs \
   allwefantasy/local-auto-coder-app:v0.1.277
   ```

4. 部署到生产环境

