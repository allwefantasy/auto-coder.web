
import os
import json
import logging
import aiofiles
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from pathlib import Path
import asyncio

router = APIRouter()

# 配置存储路径
SETTINGS_FILE = Path(".auto-coder/auto-coder.web/settings/settings.json")

# 确保目录存在
SETTINGS_FILE.parent.mkdir(parents=True, exist_ok=True)

logger = logging.getLogger(__name__)

class SettingsModel(BaseModel):
    language: str = "zh"
    theme: str = "dark"
    font_size: int = 14
    auto_save: bool = True
    show_line_numbers: bool = True

async def load_settings() -> SettingsModel:
    """异步加载设置"""
    if not await asyncio.to_thread(lambda: SETTINGS_FILE.exists()):
        # 如果文件不存在，返回默认设置
        return SettingsModel()
    
    try:
        async with aiofiles.open(SETTINGS_FILE, mode='r', encoding='utf-8') as f:
            content = await f.read()
            return SettingsModel(**json.loads(content))
    except (json.JSONDecodeError, FileNotFoundError):
        logger.error("Failed to parse settings.json, returning default settings")
        return SettingsModel()

async def save_settings(settings: SettingsModel):
    """异步保存设置"""
    async with aiofiles.open(SETTINGS_FILE, mode='w', encoding='utf-8') as f:
        await f.write(json.dumps(settings.model_dump(), indent=2, ensure_ascii=False))

@router.get("/api/settings")
async def get_settings():
    """获取当前设置"""
    return await load_settings()

@router.post("/api/settings")
async def update_settings(settings: dict):
    """更新设置"""
    current_settings = await load_settings()
    updated_settings = current_settings.copy(update=settings)
    await save_settings(updated_settings)
    return updated_settings

class LanguageUpdate(BaseModel):
    language: str

@router.post("/api/settings/language")
async def set_language(payload: LanguageUpdate):
    """设置语言"""
    if payload.language not in ["zh", "en"]:
        raise HTTPException(status_code=400, detail="Invalid language, must be 'zh' or 'en'")
    
    current_settings = await load_settings()
    current_settings.language = payload.language
    await save_settings(current_settings)
    return {"status": "success", "language": payload.language}

@router.get("/api/settings/language")
async def get_language():
    """获取当前语言设置"""
    settings = await load_settings()
    return {"language": settings.language}