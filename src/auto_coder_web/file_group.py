from fastapi import HTTPException
from typing import List, Dict, Optional
import os
import json
from .json_file_storage import storage

class FileGroupManager:
    _groups: Dict[str, Dict] = {}
    _initialized = False
    
    @classmethod
    async def _ensure_initialized(cls):
        if not cls._initialized:
            cls._groups = await storage.load_file_groups()
            cls._initialized = True
    
    @classmethod
    async def create_group(cls, name: str, description: str) -> Dict:
        await cls._ensure_initialized()
        
        if name in cls._groups:
            raise HTTPException(status_code=400, detail="Group already exists")
        
        group = {
            "name": name,
            "description": description,
            "files": []
        }
        cls._groups[name] = group
        await storage.save_file_groups(cls._groups)
        return group
    
    @classmethod
    async def delete_group(cls, name: str) -> None:
        await cls._ensure_initialized()
        
        if name not in cls._groups:
            raise HTTPException(status_code=404, detail="Group not found")
        del cls._groups[name]
        await storage.save_file_groups(cls._groups)
    
    @classmethod
    async def add_files_to_group(cls, group_name: str, files: List[str]) -> Dict:
        await cls._ensure_initialized()
        
        if group_name not in cls._groups:
            raise HTTPException(status_code=404, detail="Group not found")
        
        group = cls._groups[group_name]
        existing_files = set(group["files"])
        new_files = [f for f in files if f not in existing_files]
        group["files"].extend(new_files)
        await storage.save_file_groups(cls._groups)
        return group
    
    @classmethod
    async def remove_files_from_group(cls, group_name: str, files: List[str]) -> Dict:
        await cls._ensure_initialized()
        
        if group_name not in cls._groups:
            raise HTTPException(status_code=404, detail="Group not found")
        
        group = cls._groups[group_name]
        group["files"] = [f for f in group["files"] if f not in files]
        await storage.save_file_groups(cls._groups)
        return group
    
    @classmethod
    async def get_groups(cls) -> List[Dict]:
        await cls._ensure_initialized()
        return list(cls._groups.values())
    
    @classmethod
    async def get_group(cls, name: str) -> Optional[Dict]:
        await cls._ensure_initialized()
        return cls._groups.get(name)