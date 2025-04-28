import os
import json
import aiofiles
from fastapi import APIRouter, HTTPException, Request, Depends
from pydantic import BaseModel
from pathlib import Path
from typing import List, Optional

router = APIRouter()

# 定义数据模型
class ChatTab(BaseModel):
    id: str
    name: str

class ChatPanelsConfig(BaseModel):
    tabs: List[ChatTab] = [
        ChatTab(id="main", name="主线面板"),
        ChatTab(id="secondary", name="支线面板")
    ]
    activeTabId: str = "main"

async def get_project_path(request: Request) -> str:
    """从FastAPI请求上下文中获取项目路径"""
    return request.app.state.project_path

async def get_config_path(project_path: str) -> Path:
    """获取聊天面板配置文件路径"""
    config_path = Path(project_path) / ".auto-coder" / "auto-coder.web" / "chat_panels.json"
    config_path.parent.mkdir(parents=True, exist_ok=True)
    return config_path

async def load_config(config_path: Path) -> ChatPanelsConfig:
    """加载聊天面板配置"""
    if not config_path.exists():
        return ChatPanelsConfig()
    
    try:
        async with aiofiles.open(config_path, mode='r', encoding='utf-8') as f:
            content = await f.read()
            config_data = json.loads(content)
            return ChatPanelsConfig(**config_data)
    except FileNotFoundError:
        return ChatPanelsConfig()
    except json.JSONDecodeError:
        # 处理配置文件损坏或为空的情况
        return ChatPanelsConfig()

async def save_config(config: ChatPanelsConfig, config_path: Path):
    """保存聊天面板配置"""
    async with aiofiles.open(config_path, mode='w', encoding='utf-8') as f:
        await f.write(json.dumps(config.dict(), indent=2, ensure_ascii=False))

# 获取所有聊天标签页
@router.get("/api/chat/panels")
async def get_chat_panels(request: Request):
    """获取所有聊天标签页配置"""
    project_path = await get_project_path(request)
    config_path = await get_config_path(project_path)
    config = await load_config(config_path)
    return config.dict()

# 更新聊天标签页列表
@router.put("/api/chat/panels/tabs")
async def update_chat_tabs(
    tabs: List[ChatTab],
    request: Request
):
    """更新聊天标签页列表"""
    if not tabs:
        raise HTTPException(status_code=400, detail="聊天标签页列表不能为空")
    
    project_path = await get_project_path(request)
    config_path = await get_config_path(project_path)
    config = await load_config(config_path)
    config.tabs = tabs
    
    # 如果当前活跃标签不在新列表中，设置为第一个标签
    tab_ids = [tab.id for tab in tabs]
    if config.activeTabId not in tab_ids and tab_ids:
        config.activeTabId = tab_ids[0]
        
    await save_config(config, config_path)
    return config.dict()

# 更新当前活跃标签
@router.put("/api/chat/panels/active-tab")
async def update_active_tab(
    active_tab: dict,
    request: Request
):
    """更新当前活跃的聊天标签页"""
    tab_id = active_tab.get("id")
    if not tab_id:
        raise HTTPException(status_code=400, detail="必须提供标签页ID")
    
    project_path = await get_project_path(request)
    config_path = await get_config_path(project_path)
    config = await load_config(config_path)
    
    # 确保指定的标签页存在
    tab_ids = [tab.id for tab in config.tabs]
    if tab_id not in tab_ids:
        raise HTTPException(status_code=404, detail=f"标签页ID '{tab_id}' 不存在")
    
    config.activeTabId = tab_id
    await save_config(config, config_path)
    return {"activeTabId": tab_id}

# 添加新标签页
@router.post("/api/chat/panels/tabs")
async def add_chat_tab(
    tab: ChatTab,
    request: Request
):
    """添加新的聊天标签页"""
    if not tab.id or not tab.name:
        raise HTTPException(status_code=400, detail="标签页必须包含ID和名称")
    
    project_path = await get_project_path(request)
    config_path = await get_config_path(project_path)
    config = await load_config(config_path)
    
    # 检查ID是否已存在
    if any(existing_tab.id == tab.id for existing_tab in config.tabs):
        raise HTTPException(status_code=400, detail=f"标签页ID '{tab.id}' 已存在")
    
    config.tabs.append(tab)
    await save_config(config, config_path)
    return tab.dict()

# 删除标签页
@router.delete("/api/chat/panels/tabs/{tab_id}")
async def delete_chat_tab(
    tab_id: str,
    request: Request
):
    """删除指定的聊天标签页"""
    project_path = await get_project_path(request)
    config_path = await get_config_path(project_path)
    config = await load_config(config_path)
    
    # 确保至少保留一个标签页
    if len(config.tabs) <= 1:
        raise HTTPException(status_code=400, detail="必须至少保留一个聊天标签页")
    
    # 查找并删除标签页
    initial_length = len(config.tabs)
    config.tabs = [tab for tab in config.tabs if tab.id != tab_id]
    
    if len(config.tabs) == initial_length:
        raise HTTPException(status_code=404, detail=f"标签页ID '{tab_id}' 不存在")
    
    # 如果删除的是当前活跃标签，切换到第一个标签
    if config.activeTabId == tab_id:
        config.activeTabId = config.tabs[0].id
    
    await save_config(config, config_path)
    return {"success": True, "activeTabId": config.activeTabId} 