import os
from pathlib import Path
from typing import List, Dict, Optional

def get_directory_tree(root_path: str) -> List[Dict]:
    """Generate a directory tree structure compatible with antd Tree component."""
    try:
        root = Path(root_path)
        if not root.exists():
            return []

        def create_tree_node(path: Path) -> Optional[Dict]:
            if path.name.startswith('.'):  # Skip hidden files/folders
                return None
                
            is_directory = path.is_dir()
            node = {
                "title": path.name,
                "key": str(path.relative_to(root)),
                "isLeaf": not is_directory
            }
            
            if is_directory:
                children = []
                for child in sorted(path.iterdir(), key=lambda x: (not x.is_dir(), x.name)):
                    child_node = create_tree_node(child)
                    if child_node:
                        children.append(child_node)
                if children:
                    node["children"] = children
            
            return node

        tree = create_tree_node(root)
        return [tree] if tree else []
    except Exception as e:
        print(f"Error generating directory tree: {str(e)}")
        return []

def read_file_content(project_path: str, file_path: str) -> Optional[str]:
    """Read the content of a file given its path."""
    try:
        full_path = os.path.join(project_path, file_path)
        with open(full_path, 'r', encoding='utf-8') as f:
            return f.read()
    except Exception as e:
        print(f"Error reading file {file_path}: {str(e)}")
        return None