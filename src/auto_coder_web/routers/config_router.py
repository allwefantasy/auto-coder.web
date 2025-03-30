import os
import json
from fastapi import APIRouter, HTTPException, Request, Depends
from pydantic import BaseModel
from pathlib import Path
from typing import Optional

router = APIRouter()

from typing import Optional

class UIConfig(BaseModel):
    mode: str = "agent"  # agent/expert
    previewUrl: Optional[str] = None

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
        with open(config_path, 'r') as f:
            config_data = json.load(f)
            return UIConfig(**config_data)
    except (json.JSONDecodeError, TypeError):
        # Return default if file is corrupted or structure doesn't match
        return UIConfig()

async def save_config(config: UIConfig, config_path: Path):
    """保存配置"""
    with open(config_path, 'w') as f:
        # Use exclude_none=True if you don't want to save null values explicitly
        json.dump(config.dict(exclude_none=True), f, indent=2) 

@router.get("/api/config/ui", response_model=UIConfig)
async def get_ui_config(request: Request):
    """获取当前UI配置"""
    project_path = await get_project_path(request)    
    config_path = await get_config_path(project_path)    
    config = await load_config(config_path)    
    return config

class UIConfigUpdate(BaseModel):
    mode: Optional[str] = None
    previewUrl: Optional[str] = None

@router.put("/api/config/ui", response_model=UIConfig)
async def update_ui_config(
    update_data: UIConfigUpdate,
    request: Request
):
    """更新UI配置 (允许部分更新)"""
    if update_data.mode is not None and update_data.mode not in ["agent", "expert"]:
        raise HTTPException(status_code=400, detail="Mode must be 'agent' or 'expert'")

    project_path = await get_project_path(request)
    config_path = await get_config_path(project_path)
    current_config = await load_config(config_path)

    update_dict = update_data.dict(exclude_unset=True) # Get only fields that were provided
    updated_config = current_config.copy(update=update_dict)

    await save_config(updated_config, config_path)

    return updated_config
