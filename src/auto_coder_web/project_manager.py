import os
from pathlib import Path
from typing import Optional
from .json_file_storage import storage

class ProjectManager:
    _instance = None
    _project_path: Optional[str] = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(ProjectManager, cls).__new__(cls)
        return cls._instance

    @classmethod
    async def init(cls):
        """Initialize project path from storage"""
        cls._project_path = await storage.load_project_path()

    @classmethod
    async def set_project_path(cls, path: str) -> bool:
        """Set the project path and validate it exists."""
        try:
            abs_path = os.path.abspath(path)
            if not os.path.exists(abs_path):
                return False
            cls._project_path = abs_path
            await storage.save_project_path(abs_path)
            return True
        except Exception:
            return False

    @classmethod
    async def get_project_path(cls) -> Optional[str]:
        """Get the currently set project path."""
        if cls._project_path is None:
            cls._project_path = await storage.load_project_path()
        return cls._project_path