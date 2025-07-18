import os
import json
import asyncio
import aiofiles
import aiofiles.os
import re
from loguru import logger
from typing import List, Dict, Any, Optional


def get_directory_tree(root_path: str, path: str = None, lazy: bool = False) -> List[Dict[str, Any]]:
    """
    Generate a directory tree structure while ignoring common directories and files
    that should not be included in version control or IDE specific files.

    Args:
        root_path: The root directory path to start traversing from
        path: Optional path relative to root_path to get children for
        lazy: If True, only return immediate children for directories

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
        allowed_hidden_files = {'.autocoderrules', '.gitignore', '.autocoderignore'}
        # Ignore hidden files/directories, unless they are explicitly allowed
        if name.startswith('.') and name not in allowed_hidden_files:
            return True
        # Ignore exact matches and pattern matches from IGNORE_PATTERNS
        return name in IGNORE_PATTERNS

    def build_tree(current_path: str) -> List[Dict[str, Any]]:
        """Recursively build the directory tree"""
        items = []
        try:
            for name in sorted(os.listdir(current_path)):
                if should_ignore(name):
                    continue

                full_path = os.path.join(current_path, name)
                relative_path = os.path.relpath(full_path, root_path)
                # 统一使用 Linux 风格的路径分隔符
                relative_path = relative_path.replace(os.sep, '/')

                if os.path.isdir(full_path):
                    if lazy:
                        # For lazy loading, just check if directory has any visible children
                        has_children = False
                        for child_name in os.listdir(full_path):
                            if not should_ignore(child_name):
                                has_children = True
                                break
                        
                        items.append({
                            'title': name,
                            'key': relative_path,
                            'children': [],  # Empty children array for lazy loading
                            'isLeaf': False,
                            'hasChildren': has_children
                        })
                    else:
                        children = build_tree(full_path)
                        if children:  # Only add non-empty directories
                            items.append({
                                'title': name,
                                'key': relative_path,
                                'children': children,
                                'isLeaf': False,
                                'hasChildren': True
                            })
                else:
                    items.append({
                        'title': name,
                        'key': relative_path,
                        'isLeaf': True,
                        'hasChildren': False
                    })
        except PermissionError:
            # Skip directories we don't have permission to read
            pass

        return items

    if path:
        # If path is provided, get children of that specific directory
        target_path = os.path.join(root_path, path)
        if os.path.isdir(target_path):
            return build_tree(target_path)
        return []
    
    # If no path provided, build tree from root 
    # If lazy is True, only immediate children are returned.
    # If lazy is False, the full tree is built recursively.
    # If no path provided, build tree from root 
    # If lazy is True, only immediate children are returned.
    # If lazy is False, the full tree is built recursively.
    return build_tree(root_path)


async def get_directory_tree_async(root_path: str, path: str = None, lazy: bool = False, compact_folders: bool = False) -> List[Dict[str, Any]]:
    """
    Asynchronously generate a directory tree structure using aiofiles while ignoring common directories and files
    that should not be included in version control or IDE specific files.

    Args:
        root_path: The root directory path to start traversing from
        path: Optional path relative to root_path to get children for
        lazy: If True, only return immediate children for directories
        compact_folders: If True, return to the collapsed file directory

    Returns:
        A list of dictionaries representing the directory tree structure
    """
    # Common directories and files to ignore (same as synchronous version)
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
        # Hidden directories (start with .) - Note: This logic is slightly different now
        # '.hidden_file', '.hidden_dir' # Example explicit hidden items if needed
    }

    def should_ignore(name: str) -> bool:
        """Check if a file or directory should be ignored"""
        allowed_hidden_files = {'.autocoderrules', '.gitignore', '.autocoderignore',".autocodercommands"}
        # Ignore hidden files/directories (starting with '.'), unless explicitly allowed
        ## and name != ".auto-coder": # Original comment kept for context if needed
        if name.startswith('.') and name not in allowed_hidden_files:
            return True
        # Ignore exact matches from IGNORE_PATTERNS
        return name in IGNORE_PATTERNS

    async def build_tree(current_path: str) -> List[Dict[str, Any]]:
        """Recursively build the directory tree asynchronously using aiofiles"""
        items = []
        try:
            # Use aiofiles.os.listdir
            child_names = await aiofiles.os.listdir(current_path)
            tasks = []
            for name in sorted(child_names):
                if should_ignore(name):
                    continue
                tasks.append(process_item(current_path, name))
            
            results = await asyncio.gather(*tasks)
            items = [item for item in results if item is not None] # Filter out None results from ignored items or errors

        except PermissionError:
            # Skip directories we don't have permission to read
            pass
        except FileNotFoundError:
            # Handle case where directory doesn't exist during processing
            pass

        return items
    
    def replace_title(__path__:str,new_path:str)->str:
        if not bool(__path__):
            return new_path
        return new_path.replace(f"{__path__}/", '')
    
    def add_path(__path__:str,new_path:str)->str:
        if not bool(__path__):
            return new_path
        return f"{__path__}/{new_path}"
    
    def fn_compact_folders(nodes: List[Dict[str, Any]], parent_path: str = "") -> List[Dict[str, Any]]:
        def map_node(node: Dict[str, Any]) -> Dict[str, Any]:
            current_path = f"{parent_path}/{node['title']}" if parent_path else node['title']
            # 如果是文件，直接返回（不参与路径合并）
            if node.get('isLeaf', False):
                return {**node}

            # 如果是目录且只有一个子目录，则合并路径
            if not node.get('isLeaf', False) and 'children' in node and len(node['children']) == 1 and not node['children'][0].get('isLeaf', False):
                merged_child = fn_compact_folders(node['children'], current_path)[0]
                return {
                    **merged_child,
                    'title': f"{node['title']}/{merged_child['title']}",
                    'key': add_path(path, f"{current_path}/{merged_child['title']}")
                }

            # 普通目录（有多个子节点或子节点是文件）
            return {
                **node,
                'key': add_path(path, current_path),
                'children': fn_compact_folders(node['children'], current_path) if 'children' in node else []
            }

        return list(map(map_node, nodes))
    

    async def process_item(current_path: str, name: str) -> Optional[Dict[str, Any]]:
        """Process a single directory item asynchronously"""
        try:
            full_path = os.path.join(current_path, name)
            relative_path = os.path.relpath(full_path, root_path)
            # 统一使用 Linux 风格的路径分隔符
            relative_path = relative_path.replace(os.sep, '/')
            # Use aiofiles.os.path.isdir
            is_dir = await aiofiles.os.path.isdir(full_path)
            if is_dir:
                isLeaf = False
                if lazy:
                    # For lazy loading, check if directory has any visible children asynchronously
                    has_children = False
                    children = []
                    try:
                        # Use aiofiles.os.listdir
                        for child_name in await aiofiles.os.listdir(full_path):
                            if not should_ignore(child_name):
                                has_children = True
                                if compact_folders:
                                    children.append(child_name)
                                else:
                                    break    
                    except (PermissionError, FileNotFoundError):
                        pass # Ignore errors checking for children, assume no visible children
                    
                    if compact_folders:
                        if(children.__len__() > 0):
                            child = children[0]
                            __is_dir__ = await aiofiles.os.path.isdir(f"{full_path}/{child}")
                            
                            if children.__len__() == 1 and __is_dir__:
                                __obj__ = await process_item(full_path, child)
                                __title__ = __obj__.get('key')
                                return {
                                    'title': replace_title(path, __title__),
                                    'key': __title__,
                                    'children':  [],  # Empty children array for lazy loading
                                    'isLeaf': isLeaf,
                                    'hasChildren': has_children
                                }
                    
                    return {
                        'title': name,
                        'key': relative_path,
                        'children': [],  # Empty children array for lazy loading
                        'isLeaf': isLeaf,
                        'hasChildren': has_children
                    }
                else:
                    children = await build_tree(full_path)
                    return {
                        'title': name,
                        'key': relative_path,
                        'children': children,
                        'isLeaf': isLeaf,
                        'hasChildren': bool(children)
                    }
            else:
                return {
                    'title': name,
                    'key': relative_path,
                    'isLeaf': True,
                    'hasChildren': False
                }
        except (PermissionError, FileNotFoundError):
             # Skip items we can't process
            return None


    target_path = root_path
    if path:
        # If path is provided, get children of that specific directory
        potential_target_path = os.path.join(root_path, path)
        # Use aiofiles.os.path.isdir for the check
        if await aiofiles.os.path.isdir(potential_target_path):
             target_path = potential_target_path
        else:
            return [] # Path does not point to a valid directory
        
    __list__ = await build_tree(target_path)

    if bool(compact_folders) and not bool(lazy):
        return fn_compact_folders(__list__)
    
    return __list__


def normalize_path(path: str) -> str:
    """规范化路径，统一分隔符并清除不安全字符"""
    # 替换所有路径分隔符为POSIX风格
    normalized = path.replace('\\', '/')
    # 移除多个连续分隔符
    normalized = re.sub(r'/+', '/', normalized)
    # 移除开头和结尾的分隔符
    normalized = normalized.strip('/')
    return normalized


def read_file_content(project_path: str, file_path: str) -> str:
    """Read the content of a file"""
    try:
        # 规范化输入路径
        normalized_path = normalize_path(file_path)
        
        # 安全验证：路径是否包含上跳目录
        if any(part in ('..', '~') for part in normalized_path.split('/')):
            return None
        
        # 创建完整路径，使用规范化的路径组件
        if normalized_path:
            full_path = os.path.join(project_path, *normalized_path.split('/'))
        else:
            full_path = project_path
            
        # Check if the path exists and is a file before attempting to open
        if not os.path.exists(full_path) or not os.path.isfile(full_path):
            return None # Or raise a specific error like FileNotFoundError
        with open(full_path, 'r', encoding='utf-8', errors='ignore') as f: # Added errors='ignore' for robustness
            return f.read()
    except IOError: # Catching only IOError, as UnicodeDecodeError is handled by errors='ignore'
        # Log the error here if needed
        return None
    except Exception as e:
        # Catch any other unexpected error
        # Log e
        return None


async def read_file_content_async(project_path: str, file_path: str) -> Optional[str]:
    """Asynchronously read the content of a file using aiofiles"""
    try:
        # 规范化输入路径
        normalized_path = normalize_path(file_path)
        
        # 安全验证：路径是否包含上跳目录
        if any(part in ('..', '~') for part in normalized_path.split('/')):
            return None
        
        # 创建完整路径，使用规范化的路径组件
        if normalized_path:
            full_path = os.path.join(project_path, *normalized_path.split('/'))
        else:
            full_path = project_path
            
        # Check if the path exists and is a file before attempting to open using aiofiles.os
        path_exists = await aiofiles.os.path.exists(full_path)
        is_file = await aiofiles.os.path.isfile(full_path)

        if not path_exists or not is_file:
             return None # Or raise a specific error like FileNotFoundError

        # Use aiofiles for asynchronous file reading
        async with aiofiles.open(full_path, mode='r', encoding='utf-8', errors='ignore') as f:
            content = await f.read()
        return content
    except (IOError, FileNotFoundError): # Catch file-related errors
        # Log the error here if needed
        return None
    except Exception as e:
        # Catch any other unexpected error during path checks or reading
        # Log e
        return None
