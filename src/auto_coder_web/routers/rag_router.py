import os
import json
import logging
import aiofiles
from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from typing import List, Optional
from pathlib import Path as FilePath
import asyncio
from fastapi.responses import JSONResponse

router = APIRouter()

# Configuration storage path
def get_rags_file_path(project_path: str) -> FilePath:
    return FilePath(project_path) / ".auto-coder" / "auto-coder.web" / "rags" / "rags.json"

logger = logging.getLogger(__name__)

class Rag(BaseModel):
    name: str
    base_url: str
    api_key: str = "xxxx"

class RagList(BaseModel):
    data: List[Rag] = []

async def get_project_path(request: Request) -> str:
    """
    从FastAPI请求上下文中获取项目路径
    """
    return request.app.state.project_path

async def load_rags(project_path: str) -> RagList:
    """Asynchronously load RAGs"""
    rags_file = get_rags_file_path(project_path)
    
    # Ensure directory exists
    rags_file.parent.mkdir(parents=True, exist_ok=True)
    
    if not await asyncio.to_thread(lambda: rags_file.exists()):
        # If file doesn't exist, return default empty list
        return RagList()
    
    try:
        async with aiofiles.open(rags_file, mode='r') as f:
            content = await f.read()
            return RagList(**json.loads(content))
    except (json.JSONDecodeError, FileNotFoundError):
        logger.error("Failed to parse rags.json, returning empty list")
        return RagList()

async def save_rags(rags: RagList, project_path: str):
    """Asynchronously save RAGs"""
    rags_file = get_rags_file_path(project_path)
    
    # Ensure directory exists
    rags_file.parent.mkdir(parents=True, exist_ok=True)
    
    async with aiofiles.open(rags_file, mode='w') as f:
        await f.write(json.dumps(rags.dict(), indent=2, ensure_ascii=False))

@router.get("/api/rags")
async def get_rags(project_path: str = Depends(get_project_path)):
    """Get all RAGs"""
    rags = await load_rags(project_path)
    return rags

@router.post("/api/rags")
async def create_rag(rag: Rag, project_path: str = Depends(get_project_path)):
    """Create a new RAG"""    
    rags = await load_rags(project_path)
    
    # Check if RAG with same name already exists
    if any(r.name == rag.name for r in rags.data):
        raise HTTPException(status_code=400, detail=f"RAG with name '{rag.name}' already exists")
    
    rags.data.append(rag)
    await save_rags(rags, project_path)
    return {"status": "success", "message": "RAG created successfully"}

@router.get("/api/rags/{name}")
async def get_rag(name: str, project_path: str = Depends(get_project_path)):
    """Get a specific RAG by name"""
    rags = await load_rags(project_path)
    
    for rag in rags.data:
        if rag.name == name:
            return rag
    
    raise HTTPException(status_code=404, detail=f"RAG with name '{name}' not found")

@router.put("/api/rags/{name}")
async def update_rag(name: str, updated_rag: Rag, project_path: str = Depends(get_project_path)):
    """Update an existing RAG"""
    rags = await load_rags(project_path)
    
    for i, rag in enumerate(rags.data):
        if rag.name == name:
            # Ensure name doesn't change
            if updated_rag.name != name:
                raise HTTPException(status_code=400, detail="RAG name cannot be changed")
            
            rags.data[i] = updated_rag
            await save_rags(rags, project_path)
            return {"status": "success", "message": "RAG updated successfully"}
    
    raise HTTPException(status_code=404, detail=f"RAG with name '{name}' not found")

@router.delete("/api/rags/{name}")
async def delete_rag(name: str, project_path: str = Depends(get_project_path)):
    """Delete a RAG by name"""
    rags = await load_rags(project_path)
    
    initial_count = len(rags.data)
    rags.data = [rag for rag in rags.data if rag.name != name]
    
    if len(rags.data) == initial_count:
        raise HTTPException(status_code=404, detail=f"RAG with name '{name}' not found")
    
    await save_rags(rags, project_path)
    return {"status": "success", "message": "RAG deleted successfully"}