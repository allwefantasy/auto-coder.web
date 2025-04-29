import os
import json
import aiofiles
from fastapi import APIRouter, HTTPException, Request, Depends
from pydantic import BaseModel
from pathlib import Path
from typing import List, Optional

router = APIRouter()

# 定义数据模型
class EditorTab(BaseModel):
    path: str
    label: str
    isActive: bool = False

class EditorTabsConfig(BaseModel):
    tabs: List[EditorTab] = []
    activeTabPath: Optional[str] = None

async def get_project_path(request: Request) -> str:
    """从FastAPI请求上下文中获取项目路径"""
    return request.app.state.project_path

async def get_config_path(project_path: str) -> Path:
    """获取代码编辑器标签页配置文件路径"""
    config_path = Path(project_path) / ".auto-coder" / "auto-coder.web" / "editor_tabs.json"
    config_path.parent.mkdir(parents=True, exist_ok=True)
    return config_path

async def load_config(config_path: Path) -> EditorTabsConfig:
    """加载代码编辑器标签页配置"""
    if not config_path.exists():
        return EditorTabsConfig()
    
    try:
        async with aiofiles.open(config_path, mode='r', encoding='utf-8') as f:
            content = await f.read()
            config_data = json.loads(content)
            return EditorTabsConfig(**config_data)
    except FileNotFoundError:
        return EditorTabsConfig()
    except json.JSONDecodeError:
        # 处理配置文件损坏或为空的情况
        return EditorTabsConfig()

async def save_config(config: EditorTabsConfig, config_path: Path):
    """保存代码编辑器标签页配置"""
    async with aiofiles.open(config_path, mode='w', encoding='utf-8') as f:
        await f.write(json.dumps(config.dict(), indent=2, ensure_ascii=False))

# 获取所有编辑器标签页
@router.get("/api/editor/tabs")
async def get_editor_tabs(request: Request):
    """获取所有代码编辑器标签页配置"""
    project_path = await get_project_path(request)
    config_path = await get_config_path(project_path)
    config = await load_config(config_path)
    return config.dict()

# 更新编辑器标签页列表
@router.put("/api/editor/tabs")
async def update_editor_tabs(
    tabs: List[EditorTab],
    request: Request
):
    """更新代码编辑器标签页列表"""
    project_path = await get_project_path(request)
    config_path = await get_config_path(project_path)
    config = await load_config(config_path)
    
    config.tabs = tabs
    
    # 更新活跃标签
    active_tabs = [tab for tab in tabs if tab.isActive]
    if active_tabs:
        config.activeTabPath = active_tabs[0].path
    elif tabs:
        config.activeTabPath = tabs[0].path
    else:
        config.activeTabPath = None
        
    await save_config(config, config_path)
    return config.dict()

# 更新当前活跃标签
@router.put("/api/editor/active-tab")
async def update_active_tab(
    active_tab: dict,
    request: Request
):
    """更新当前活跃的代码编辑器标签页"""
    tab_path = active_tab.get("path")
    if not tab_path:
        raise HTTPException(status_code=400, detail="必须提供标签页路径")
    
    project_path = await get_project_path(request)
    config_path = await get_config_path(project_path)
    config = await load_config(config_path)
    
    # 确保指定的标签页存在
    tab_paths = [tab.path for tab in config.tabs]
    if tab_path not in tab_paths:
        # 如果标签不存在，添加一个新标签
        new_tab = EditorTab(
            path=tab_path,
            label=tab_path.split('/')[-1],
            isActive=True
        )
        config.tabs.append(new_tab)
    else:
        # 更新标签的活跃状态
        config.tabs = [
            EditorTab(
                path=tab.path,
                label=tab.label,
                isActive=(tab.path == tab_path)
            )
            for tab in config.tabs
        ]
    
    config.activeTabPath = tab_path
    await save_config(config, config_path)
    return {"activeTabPath": tab_path}

# 添加新标签页
@router.post("/api/editor/tabs")
async def add_editor_tab(
    tab: EditorTab,
    request: Request
):
    """添加新的代码编辑器标签页"""
    if not tab.path:
        raise HTTPException(status_code=400, detail="标签页必须包含路径")
    
    project_path = await get_project_path(request)
    config_path = await get_config_path(project_path)
    config = await load_config(config_path)
    
    # 检查路径是否已存在
    existing_paths = [existing_tab.path for existing_tab in config.tabs]
    if tab.path in existing_paths:
        # 如果标签已存在，只更新活跃状态
        config.tabs = [
            EditorTab(
                path=t.path,
                label=t.label,
                isActive=(t.path == tab.path)
            )
            for t in config.tabs
        ]
    else:
        # 添加新标签并设置为活跃
        for t in config.tabs:
            t.isActive = False
        config.tabs.append(tab)
    
    if tab.isActive:
        config.activeTabPath = tab.path
    
    await save_config(config, config_path)
    return tab.dict()

# 删除标签页
@router.delete("/api/editor/tabs/{tab_path}")
async def delete_editor_tab(
    tab_path: str,
    request: Request
):
    """删除指定的代码编辑器标签页"""
    project_path = await get_project_path(request)
    config_path = await get_config_path(project_path)
    config = await load_config(config_path)
    
    # 查找并删除标签页
    initial_length = len(config.tabs)
    config.tabs = [tab for tab in config.tabs if tab.path != tab_path]
    
    if len(config.tabs) == initial_length:
        raise HTTPException(status_code=404, detail=f"标签页路径 '{tab_path}' 不存在")
    
    # 如果删除的是当前活跃标签，切换到第一个标签
    if config.activeTabPath == tab_path:
        if config.tabs:
            config.activeTabPath = config.tabs[0].path
            config.tabs[0].isActive = True
        else:
            config.activeTabPath = None
    
    await save_config(config, config_path)
    return {"success": True, "activeTabPath": config.activeTabPath}
