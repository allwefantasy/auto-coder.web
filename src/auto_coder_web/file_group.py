from fastapi import HTTPException
from typing import List, Dict, Optional
import os
import json

class FileGroupManager:
    _groups: Dict[str, Dict] = {}
    
    @classmethod
    def create_group(cls, name: str, description: str) -> Dict:
        if name in cls._groups:
            raise HTTPException(status_code=400, detail="Group already exists")
        
        group = {
            "name": name,
            "description": description,
            "files": []
        }
        cls._groups[name] = group
        return group
    
    @classmethod
    def delete_group(cls, name: str) -> None:
        if name not in cls._groups:
            raise HTTPException(status_code=404, detail="Group not found")
        del cls._groups[name]
    
    @classmethod
    def add_files_to_group(cls, group_name: str, files: List[str]) -> Dict:
        if group_name not in cls._groups:
            raise HTTPException(status_code=404, detail="Group not found")
        
        group = cls._groups[group_name]
        existing_files = set(group["files"])
        new_files = [f for f in files if f not in existing_files]
        group["files"].extend(new_files)
        return group
    
    @classmethod
    def remove_files_from_group(cls, group_name: str, files: List[str]) -> Dict:
        if group_name not in cls._groups:
            raise HTTPException(status_code=404, detail="Group not found")
        
        group = cls._groups[group_name]
        group["files"] = [f for f in group["files"] if f not in files]
        return group
    
    @classmethod
    def get_groups(cls) -> List[Dict]:
        return list(cls._groups.values())
    
    @classmethod
    def get_group(cls, name: str) -> Optional[Dict]:
        return cls._groups.get(name)