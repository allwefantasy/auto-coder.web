import json
import os
import aiofiles
from typing import Dict, List, Optional

class JsonFileStorage:
    def __init__(self, storage_dir: Optional[str] = None):
        self.storage_dir = storage_dir or os.path.expanduser("~/.auto-coder.web")
        os.makedirs(self.storage_dir, exist_ok=True)
        
        self.file_groups_path = os.path.join(self.storage_dir, "file_groups.json")
        self.project_path_file = os.path.join(self.storage_dir, "project_path.json")

    async def save_file_groups(self, groups: Dict[str, Dict]) -> None:
        """Save file groups to JSON file"""
        async with aiofiles.open(self.file_groups_path, 'w') as f:
            await f.write(json.dumps(groups, indent=2))

    async def load_file_groups(self) -> Dict[str, Dict]:
        """Load file groups from JSON file"""
        try:
            async with aiofiles.open(self.file_groups_path, 'r') as f:
                content = await f.read()
                return json.loads(content)
        except (FileNotFoundError, json.JSONDecodeError):
            return {}

    async def save_project_path(self, path: str) -> None:
        """Save project path to JSON file"""
        async with aiofiles.open(self.project_path_file, 'w') as f:
            await f.write(json.dumps({"project_path": path}, indent=2))

    async def load_project_path(self) -> Optional[str]:
        """Load project path from JSON file"""
        try:
            async with aiofiles.open(self.project_path_file, 'r') as f:
                content = await f.read()
                data = json.loads(content)
                return data.get("project_path")
        except (FileNotFoundError, json.JSONDecodeError):
            return None

# Global instance
storage = JsonFileStorage()