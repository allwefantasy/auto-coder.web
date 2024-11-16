from fastapi import HTTPException
from typing import List, Dict, Optional
import os
from .auto_coder_runner import AutoCoderRunner

class FileGroupManager:
    _runner = None

    @classmethod
    def _ensure_initialized(cls):
        if cls._runner is None:
            cls._runner = AutoCoderRunner()

    @classmethod
    async def create_group(cls, name: str, description: str) -> Dict:
        cls._ensure_initialized()
        group = cls._runner.add_group(name)
        if group is None:
            raise HTTPException(status_code=400, detail="Group already exists")
        return {
            "name": name,
            "description": description,
            "files": []  
        }
    
    @classmethod
    async def delete_group(cls, name: str) -> None:
        cls._ensure_initialized()
        result = cls._runner.remove_group(name) if hasattr(cls._runner, "remove_group") else None
        if result is None:
            raise HTTPException(status_code=404, detail="Group not found")
    
    @classmethod
    async def add_files_to_group(cls, group_name: str, files: List[str]) -> Dict:
        cls._ensure_initialized()
        result = cls._runner.add_files_to_group(group_name, files)
        if result is None:
            raise HTTPException(status_code=404, detail="Group not found")
        return {
            "name": group_name,
            "files": result.get("files", [])
        }
    
    @classmethod
    async def remove_files_from_group(cls, group_name: str, files: List[str]) -> Dict:
        cls._ensure_initialized()
        result = cls._runner.remove_files_from_group(group_name, files)
        if result is None:
            raise HTTPException(status_code=404, detail="Group not found")
        return {
            "name": group_name,
            "files": result.get("files", [])
        }
    
    @classmethod
    async def get_groups(cls) -> List[Dict]:
        cls._ensure_initialized()
        groups = cls._runner.get_groups()
        if not groups:
            return []
        return [
            {
                "name": group_name,
                "files": cls._runner.get_files_in_group(group_name).get("files", [])
            }
            for group_name in groups.get("groups", [])
        ]
    
    @classmethod
    async def get_group(cls, name: str) -> Optional[Dict]:
        cls._ensure_initialized()
        files = cls._runner.get_files_in_group(name)
        if files is None:
            return None
        return {
            "name": name,
            "files": files.get("files", [])
        }