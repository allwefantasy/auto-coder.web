import os
import json
from typing import List, Dict, Any, Optional
from enum import Enum
from pydantic import BaseModel

class SymbolType(str,Enum):
    CLASSES = "classes"
    FUNCTIONS = "functions" 
    VARIABLES = "variables"

class SymbolItem(BaseModel):
    symbol_name: str
    symbol_type: SymbolType
    file_name: str


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

def get_symbol_list(project_path: str) -> List[SymbolItem]:
    """获取所有符号列表"""
    list_of_symbols = []
    index_file = os.path.join(project_path, ".auto-coder", "index.json")
    
    if os.path.exists(index_file):
        with open(index_file, "r") as file:
            index_data = json.load(file)
    else:
        return []

    for item in index_data.values():
        symbols_str = item["symbols"]
        module_name = item["module_name"]
        for name, symbol_type in extract_symbols(symbols_str).items():
            list_of_symbols.append(
                SymbolItem(
                    symbol_name=name,
                    symbol_type=SymbolType(symbol_type.lower()),
                    file_name=module_name
                )
            )
    return list_of_symbols

def extract_symbols(symbols_str: str) -> Dict[str, str]:
    """从符号字符串中提取符号名和类型"""
    symbols = {}
    try:
        data = json.loads(symbols_str)
        for symbol_type in ["classes", "functions", "variables"]:
            for name in data.get(symbol_type, []):
                symbols[name] = symbol_type
    except json.JSONDecodeError:
        pass
    return symbols

def find_files_by_name(project_path: str, name: str, active_files: Optional[List[str]] = None) -> List[Dict[str, str]]:
    """根据文件名查找文件"""
    matches = []
    
    # 优先在当前活动文件中查找
    if active_files:
        for file_path in active_files:
            if name.lower() in os.path.basename(file_path).lower():
                relative_path = os.path.relpath(file_path, project_path)
                matches.append({
                    "path": relative_path,
                    "display": f"{relative_path} (in active files)"
                })
    
    # 遍历项目目录查找其他匹配文件
    for root, _, files in os.walk(project_path):
        for file in files:
            if name.lower() in file.lower():
                full_path = os.path.join(root, file)
                if full_path not in (active_files or []):
                    relative_path = os.path.relpath(full_path, project_path)
                    matches.append({
                        "path": relative_path,
                        "display": relative_path
                    })
                    
    return matches