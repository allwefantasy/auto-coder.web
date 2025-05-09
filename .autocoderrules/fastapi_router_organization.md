
##File: /Users/allwefantasy/projects/auto-coder.web/.autocoderrules/fastapi_router_organization.md
---
title: FastAPI 路由组织规范
description: FastAPI 应用路由组织规范
keywords:
  - FastAPI
  - APIRouter
  - 路由组织
  - 依赖注入
  - 模块化
tags:
  - FastAPI
  - Routing
  - Best Practices
globs: ["src/auto_coder_web/proxy.py", "src/auto_coder_web/common_router/*.py", "src/auto_coder_web/routers/*.py"]
alwaysApply: false
---


# FastAPI 路由组织规范

## 简要说明
本规范介绍如何使用 FastAPI 的 `APIRouter` 将应用路由逻辑拆分到不同模块中，并通过主应用的 `include_router` 方法集成。这有助于提高代码可维护性和模块化程度，特别适用于大型项目。

## 典型用法
以下示例基于项目中的 `completions_router.py` 和 `proxy.py` 展示路由组织方法。

### 1. 定义依赖项函数

首先，定义依赖项函数用于获取共享资源：

```python
# src/auto_coder_web/common_router/completions_router.py
async def get_auto_coder_runner(request: Request):
    """获取AutoCoderRunner实例作为依赖"""
    return request.app.state.auto_coder_runner

async def get_project_path(request: Request):
    """获取项目路径作为依赖"""
    return request.app.state.project_path
```

这些依赖项函数的作用：
- `get_auto_coder_runner`: 从应用状态中获取 AutoCoderRunner 实例，用于执行代码分析和操作
- `get_project_path`: 从应用状态中获取项目路径，用于文件操作和路径解析

### 2. 创建路由模块

```python
# src/auto_coder_web/common_router/completions_router.py
from fastapi import APIRouter, Query, Request, Depends
from pydantic import BaseModel
from typing import List

router = APIRouter()  # 创建路由实例

class CompletionItem(BaseModel):
    name: str
    path: str
    display: str
    location: str = None

class CompletionResponse(BaseModel):
    completions: List[CompletionItem]

@router.get("/api/completions/files")
async def get_file_completions(
    name: str = Query(...),
    project_path: str = Depends(get_project_path)  # 使用依赖注入
):
    """获取文件名补全"""
    patterns = [name]
    matches = await find_files_in_project(patterns, project_path)
    # ... 处理逻辑
    return CompletionResponse(completions=completions)

@router.get("/api/completions/symbols")
async def get_symbol_completions(
    name: str = Query(...),
    project_path: str = Depends(get_project_path)  # 使用依赖注入
):
    """获取符号补全"""
    # ... 处理逻辑
    return CompletionResponse(completions=matches)
```

### 3. 在主应用中设置状态和集成路由

```python
# src/auto_coder_web/proxy.py
from fastapi import FastAPI
from auto_coder_web.common_router import completions_router

class ProxyServer:
    def __init__(self, project_path: str, quick: bool = False, product_mode: str = "pro"):    
        self.app = FastAPI()
        self.project_path = project_path
        # ... 其他初始化
        
        if self.is_initialized:
            self._initialize()
            
        self.setup_routes()

    def _initialize(self):
        self.auto_coder_runner = AutoCoderRunnerWrapper(self.project_path, product_mode=self.product_mode)
        # ... 其他初始化

    def setup_routes(self):
        # 设置应用状态，供依赖项函数使用
        self.app.state.project_path = self.project_path
        self.app.state.auto_coder_runner = self.auto_coder_runner
        
        # 集成路由模块
        self.app.include_router(completions_router.router)
        # ... 其他路由集成
```

## 依赖注入最佳实践

1. **状态共享**：在主应用中使用 `app.state` 存储全局状态或资源

2. **依赖函数**：
   - 创建独立的依赖函数，使其返回特定资源
   - 每个依赖函数应有明确职责和文档说明
   - 依赖函数应尽可能简单，专注于获取和返回资源

3. **依赖注入**：
   - 使用 `Depends()` 在路由处理函数中注入依赖
   - 可以组合多个依赖项满足复杂需求
   ```python
   @router.get("/api/some_endpoint")
   async def some_handler(
       query: str = Query(...),
       project_path: str = Depends(get_project_path),
       runner: AutoCoderRunner = Depends(get_auto_coder_runner)
   ):
       # 使用注入的依赖项
   ```

4. **命名规范**：
   - 依赖函数名应清晰表明其提供的资源，如 `get_xxx`
   - 路由模块中的路由实例必须命名为 `router`，因为主应用在导入时依赖这个特定变量名

## 持久化最佳实践

在构建FastAPI应用时，常常需要持久化配置或其他数据。以下是基于`config_router.py`的持久化实践：

### 1. 使用Pydantic模型定义配置结构

```python
from pydantic import BaseModel

class UIConfig(BaseModel):
    mode: str = "agent"  # agent/expert
    preview_url: str = "http://127.0.0.1:3000"
```

这种方式可以:
- 提供类型检查和默认值
- 通过`.dict()`方法轻松转换为可序列化的字典
- 支持数据验证和自动文档生成

### 2. 异步文件操作

使用`aiofiles`进行异步文件读写，避免阻塞事件循环：

```python
import aiofiles
import json

async def load_config(config_path: Path) -> UIConfig:
    """加载配置"""
    if not config_path.exists():
        return UIConfig()
    
    try:
        async with aiofiles.open(config_path, mode='r', encoding='utf-8') as f:
            content = await f.read()
            config_data = json.loads(content)
            return UIConfig(**config_data)
    except (FileNotFoundError, json.JSONDecodeError):
        return UIConfig()

async def save_config(config: UIConfig, config_path: Path):
    """保存配置"""
    async with aiofiles.open(config_path, mode='w', encoding='utf-8') as f:
        await f.write(json.dumps(config.dict()))
```

### 3. 标准化配置存储路径

创建辅助函数，确保配置路径的一致性和存在性：

```python
async def get_config_path(project_path: str) -> Path:
    """获取配置文件路径"""
    config_path = Path(project_path) / ".auto-coder" / "auto-coder.web" / "config.json"
    config_path.parent.mkdir(parents=True, exist_ok=True)  # 确保目录存在
    return config_path
```

### 4. 结合依赖注入使用持久化

```python
@router.get("/api/config/ui/mode")
async def get_ui_mode(request: Request):
    project_path = await get_project_path(request)
    config_path = await get_config_path(project_path)
    config = await load_config(config_path)
    return {"mode": config.mode}

@router.put("/api/config/ui/mode")
async def update_ui_mode(
    update: UIModeUpdate,
    request: Request
):
    if update.mode not in ["agent", "expert"]:
        raise HTTPException(status_code=400, detail="Mode must be 'agent' or 'expert'")
    
    project_path = await get_project_path(request)
    config_path = await get_config_path(project_path)
    config = await load_config(config_path)
    config.mode = update.mode
    await save_config(config, config_path)
    
    return {"mode": update.mode}
```

这种方法将依赖注入与持久化函数结合，实现了:
- 无需手动传递项目路径
- 集中统一的配置读写逻辑
- 异常处理和默认值回退机制
- 清晰的错误报告（使用HTTPException）

## 学习来源
从项目中的 `proxy.py` 文件的 `setup_routes` 方法以及 `completions_router.py` 等模块学习。`proxy.py` 通过 `app.include_router()` 将不同模块定义的 `APIRouter` 实例集成到主 FastAPI 应用中。


