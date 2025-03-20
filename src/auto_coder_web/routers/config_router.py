import os
import json
import logging
import asyncio
import aiofiles
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List, Union, Dict, Any
from datetime import datetime
from pathlib import Path

router = APIRouter()

# 配置存储路径
CONFIG_FILE = Path(".auto-coder/auto-coder.web/configs/config.json")

# 确保目录存在
CONFIG_FILE.parent.mkdir(parents=True, exist_ok=True)

logger = logging.getLogger(__name__)

# UI 配置模型
class UIConfig(BaseModel):
    mode: str = "agent"  # agent/expert
    theme: str = "dark"
    language: str = "zh-CN"

# 编辑器配置模型
class EditorConfig(BaseModel):
    fontSize: int = 14
    tabSize: int = 2
    wordWrap: str = "on"

# 功能配置模型
class FeaturesConfig(BaseModel):
    autoSave: bool = True
    livePreview: bool = True

# 配置设置模型
class ConfigSettings(BaseModel):
    ui: UIConfig = Field(default_factory=UIConfig)
    editor: EditorConfig = Field(default_factory=EditorConfig)
    features: FeaturesConfig = Field(default_factory=FeaturesConfig)
    updated_at: str = Field(default_factory=lambda: datetime.now().isoformat())

# 更新请求模型 - 所有字段都是可选的
class UIConfigUpdate(BaseModel):
    mode: Optional[str] = None
    theme: Optional[str] = None
    language: Optional[str] = None

class EditorConfigUpdate(BaseModel):
    fontSize: Optional[int] = None
    tabSize: Optional[int] = None
    wordWrap: Optional[str] = None

class FeaturesConfigUpdate(BaseModel):
    autoSave: Optional[bool] = None
    livePreview: Optional[bool] = None

class ConfigUpdateRequest(BaseModel):
    ui: Optional[UIConfigUpdate] = None
    editor: Optional[EditorConfigUpdate] = None
    features: Optional[FeaturesConfigUpdate] = None

async def load_config() -> ConfigSettings:
    """异步加载配置，如果文件不存在则返回默认配置"""
    if not await asyncio.to_thread(lambda: CONFIG_FILE.exists()):
        return ConfigSettings()
    
    try:
        async with aiofiles.open(CONFIG_FILE, mode='r') as f:
            content = await f.read()
            config_data = json.loads(content)
            return ConfigSettings(**config_data)
    except (json.JSONDecodeError, FileNotFoundError):
        logger.error("Failed to parse config.json, returning default config")
        return ConfigSettings()

async def save_config(config: ConfigSettings):
    """异步保存配置"""
    async with aiofiles.open(CONFIG_FILE, mode='w') as f:
        await f.write(json.dumps(config.dict(), indent=2, ensure_ascii=False))

@router.get("/api/config", response_model=ConfigSettings)
async def get_config():
    """获取当前所有配置"""
    return await load_config()

@router.get("/api/config/ui", response_model=UIConfig)
async def get_ui_config():
    """获取UI配置"""
    config = await load_config()
    return config.ui

@router.get("/api/config/editor", response_model=EditorConfig)
async def get_editor_config():
    """获取编辑器配置"""
    config = await load_config()
    return config.editor

@router.get("/api/config/features", response_model=FeaturesConfig)
async def get_features_config():
    """获取功能配置"""
    config = await load_config()
    return config.features

@router.put("/api/config", response_model=ConfigSettings)
async def update_config(request: ConfigUpdateRequest):
    """更新配置"""
    config = await load_config()
    
    # 更新UI配置
    if request.ui:
        ui_update = request.ui.dict(exclude_unset=True)
        if ui_update:
            config.ui = UIConfig(**{**config.ui.dict(), **ui_update})
    
    # 更新编辑器配置
    if request.editor:
        editor_update = request.editor.dict(exclude_unset=True)
        if editor_update:
            config.editor = EditorConfig(**{**config.editor.dict(), **editor_update})
    
    # 更新功能配置
    if request.features:
        features_update = request.features.dict(exclude_unset=True)
        if features_update:
            config.features = FeaturesConfig(**{**config.features.dict(), **features_update})
    
    # 更新时间戳
    config.updated_at = datetime.now().isoformat()
    
    await save_config(config)
    return config

@router.put("/api/config/ui", response_model=UIConfig)
async def update_ui_config(request: UIConfigUpdate):
    """更新UI配置"""
    config = await load_config()
    
    # 只更新提供的字段
    update_data = request.dict(exclude_unset=True)
    if update_data:
        config.ui = UIConfig(**{**config.ui.dict(), **update_data})
        config.updated_at = datetime.now().isoformat()
        await save_config(config)
    
    return config.ui

@router.put("/api/config/editor", response_model=EditorConfig)
async def update_editor_config(request: EditorConfigUpdate):
    """更新编辑器配置"""
    config = await load_config()
    
    # 只更新提供的字段
    update_data = request.dict(exclude_unset=True)
    if update_data:
        config.editor = EditorConfig(**{**config.editor.dict(), **update_data})
        config.updated_at = datetime.now().isoformat()
        await save_config(config)
    
    return config.editor

@router.put("/api/config/features", response_model=FeaturesConfig)
async def update_features_config(request: FeaturesConfigUpdate):
    """更新功能配置"""
    config = await load_config()
    
    # 只更新提供的字段
    update_data = request.dict(exclude_unset=True)
    if update_data:
        config.features = FeaturesConfig(**{**config.features.dict(), **update_data})
        config.updated_at = datetime.now().isoformat()
        await save_config(config)
    
    return config.features

# 单个配置项更新端点
@router.get("/api/config/ui/mode")
async def get_ui_mode():
    """获取UI模式配置"""
    config = await load_config()
    return {"mode": config.ui.mode}

@router.put("/api/config/ui/mode")
async def update_ui_mode(mode: str):
    """更新UI模式配置"""
    config = await load_config()
    
    # 验证模式值
    if mode not in ["agent", "expert"]:
        raise HTTPException(status_code=400, detail="Mode must be 'agent' or 'expert'")
    
    config.ui.mode = mode
    config.updated_at = datetime.now().isoformat()
    await save_config(config)
    
    return {"mode": mode}
