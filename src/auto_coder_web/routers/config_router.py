import os
import json
from fastapi import APIRouter, HTTPException, Request, Depends
from pydantic import BaseModel
from pathlib import Path
from typing import Optional

router = APIRouter()

class UIConfig(BaseModel):
    mode: str = "agent"  # agent/expert

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
    except json.JSONDecodeError:
        return UIConfig()

async def save_config(config: UIConfig, config_path: Path):
    """保存配置"""
    with open(config_path, 'w') as f:
        json.dump(config.dict(), f)

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
