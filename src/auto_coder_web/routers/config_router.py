import os
import json
import aiofiles
from fastapi import APIRouter, HTTPException, Request, Depends
from pydantic import BaseModel
from pathlib import Path
from typing import Optional

router = APIRouter()

class UIConfig(BaseModel):
    mode: str = "agent"  # agent/expert
    preview_url: str = "http://127.0.0.1:3000"

async def get_project_path(request: Request) -> str:
    """从FastAPI请求上下文中获取项目路径"""
    return request.app.state.project_path

async def get_config_path(project_path: str) -> Path:
    """获取配置文件路径"""
    config_path = Path(project_path) / ".auto-coder" / "auto-coder.web" / "config.json"
    config_path.parent.mkdir(parents=True, exist_ok=True)
    return config_path

async def load_config(config_path: Path) -> UIConfig:
    """加载配置"""
    if not config_path.exists():
        return UIConfig()
    
    try:
        async with aiofiles.open(config_path, mode='r', encoding='utf-8') as f:
            content = await f.read()
            config_data = json.loads(content)
            return UIConfig(**config_data)
    except FileNotFoundError:
        return UIConfig()
    except json.JSONDecodeError:
        # Handle cases where the file is corrupted or empty
        return UIConfig()

async def save_config(config: UIConfig, config_path: Path):
    """保存配置"""
    async with aiofiles.open(config_path, mode='w', encoding='utf-8') as f:
        await f.write(json.dumps(config.dict()))

@router.get("/api/config/ui/mode")
async def get_ui_mode(request: Request):
    """获取当前UI模式"""
    project_path = await get_project_path(request)
    config_path = await get_config_path(project_path)
    config = await load_config(config_path)
    return {"mode": config.mode}

class UIModeUpdate(BaseModel):
    mode: str

@router.put("/api/config/ui/mode")
async def update_ui_mode(
    update: UIModeUpdate,
    request: Request
):
    """更新UI模式"""
    if update.mode not in ["agent", "expert"]:
        raise HTTPException(status_code=400, detail="Mode must be 'agent' or 'expert'")
    
    project_path = await get_project_path(request)
    config_path = await get_config_path(project_path)
    config = await load_config(config_path)
    config.mode = update.mode
    await save_config(config, config_path)
    
    return {"mode": update.mode}

@router.get("/api/config/ui/preview-url")
async def get_preview_url(request: Request):
    """获取预览URL"""
    project_path = await get_project_path(request)
    config_path = await get_config_path(project_path)
    config = await load_config(config_path)
    return {"preview_url": config.preview_url}

class PreviewUrlUpdate(BaseModel):
    preview_url: str

@router.put("/api/config/ui/preview-url")
async def update_preview_url(
    update: PreviewUrlUpdate,
    request: Request
):
    """更新预览URL"""
    project_path = await get_project_path(request)
    config_path = await get_config_path(project_path)
    config = await load_config(config_path)
    config.preview_url = update.preview_url
    await save_config(config, config_path)
    
    return {"preview_url": update.preview_url}
