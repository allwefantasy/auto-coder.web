from fastapi import HTTPException
from typing import List, Dict, Optional
import os
from .auto_coder_runner import AutoCoderRunner

class FileGroupManager:
    def __init__(self,auto_coder_runner: AutoCoderRunner):
        self.runner = auto_coder_runner        
        
    async def create_group(self, name: str, description: str) -> Dict:
        group = self.runner.add_group(name,description=description)
        if group is None:
            raise HTTPException(status_code=400, detail="Group already exists")
        return {
            "name": name,
            "description": description,
            "files": []  
        }
    
    async def switch_groups(self, group_names: List[str]) -> Dict:
        result = self.runner.switch_groups(group_names)
        if result is None:
            raise HTTPException(status_code=404, detail="Group not found")
        return result
    
    async def delete_group(self, name: str) -> None:
        result = self.runner.remove_group(name)
        if result is None:
            raise HTTPException(status_code=404, detail="Group not found")
    
    async def add_files_to_group(self, group_name: str, files: List[str]) -> Dict:
        result = self.runner.add_files_to_group(group_name, files)
        if result is None:
            raise HTTPException(status_code=404, detail="Group not found")
        return {
            "name": group_name,
            "files": result.get("files", [])
        }
    
    async def remove_files_from_group(self, group_name: str, files: List[str]) -> Dict:
        result = self.runner.remove_files_from_group(group_name, files)
        if result is None:
            raise HTTPException(status_code=404, detail="Group not found")
        return {
            "name": group_name, 
            "files": result.get("files", [])
        }
    
    async def get_groups(self) -> List[Dict]:
        groups = self.runner.get_groups()
        if not groups:
            return []
        return [
            {
                "name": group_name,
                "files": self.runner.get_files_in_group(group_name).get("files", []),
                "description": self.runner.get_group_description(group_name)
            }
            for group_name in groups.get("groups", [])
        ]
    
    async def get_group(self, name: str) -> Optional[Dict]:
        files = self.runner.get_files_in_group(name)
        if files is None:
            return None
        return {
            "name": name,
            "files": files.get("files", [])
        }