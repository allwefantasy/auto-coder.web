import os
from pathlib import Path
from typing import Optional

class ProjectManager:
    _instance = None
    _project_path: Optional[str] = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(ProjectManager, cls).__new__(cls)
        return cls._instance

    @classmethod
    def set_project_path(cls, path: str) -> bool:
        """Set the project path and validate it exists."""
        try:
            abs_path = os.path.abspath(path)
            if not os.path.exists(abs_path):
                return False
            cls._project_path = abs_path
            return True
        except Exception:
            return False

    @classmethod
    def get_project_path(cls) -> Optional[str]:
        """Get the currently set project path."""
        return cls._project_path