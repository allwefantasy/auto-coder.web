import os
import json
from typing import List, Dict, Any, Optional


def get_directory_tree(root_path: str) -> List[Dict[str, Any]]:
    """
    Generate a directory tree structure while ignoring common directories and files
    that should not be included in version control or IDE specific files.

    Args:
        root_path: The root directory path to start traversing from

    Returns:
        A list of dictionaries representing the directory tree structure
    """
    # Common directories and files to ignore
    IGNORE_PATTERNS = {
        # Version control
        '.git', '.svn', '.hg',
        # Dependencies
        'node_modules', 'venv', '.venv', 'env', '.env',
        '__pycache__', '.pytest_cache',
        # Build outputs
        'dist', 'build', 'target',
        # IDE specific
        '.idea', '.vscode', '.vs',
        # OS specific
        '.DS_Store', 'Thumbs.db',
        # Other common patterns
        'coverage', '.coverage', 'htmlcov',
        # Hidden directories (start with .)
        '.*'
    }

    def should_ignore(name: str) -> bool:
        """Check if a file or directory should be ignored"""
        # Ignore hidden files/directories
        if name.startswith('.'):
            return True
        # Ignore exact matches and pattern matches
        return name in IGNORE_PATTERNS

    def build_tree(path: str) -> List[Dict[str, Any]]:
        """Recursively build the directory tree"""
        items = []
        try:
            for name in sorted(os.listdir(path)):
                if should_ignore(name):
                    continue

                full_path = os.path.join(path, name)
                relative_path = os.path.relpath(full_path, root_path)

                if os.path.isdir(full_path):
                    children = build_tree(full_path)
                    if children:  # Only add non-empty directories
                        items.append({
                            'title': name,
                            'key': relative_path,
                            'children': children,
                            'isLeaf': False
                        })
                else:
                    items.append({
                        'title': name,
                        'key': relative_path,
                        'isLeaf': True
                    })
        except PermissionError:
            # Skip directories we don't have permission to read
            pass

        return items

    return build_tree(root_path)


def read_file_content(project_path: str, file_path: str) -> str:
    """Read the content of a file"""
    try:
        full_path = os.path.join(project_path, file_path)
        with open(full_path, 'r', encoding='utf-8') as f:
            return f.read()
    except (IOError, UnicodeDecodeError):
        return None



