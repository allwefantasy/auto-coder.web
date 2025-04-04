import os
import json
import asyncio
import aiofiles
import aiofiles.os
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
        # Ignore hidden files/directories
        if name.startswith('.'):
            return True
        # Ignore exact matches and pattern matches
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
    return build_tree(root_path)


async def async_get_directory_tree(root_path: str, path: str = None, lazy: bool = False) -> List[Dict[str, Any]]:
    """
    Asynchronously generate a directory tree structure while ignoring common directories and files
    that should not be included in version control or IDE specific files.

    Args:
        root_path: The root directory path to start traversing from
        path: Optional path relative to root_path to get children for
        lazy: If True, only return immediate children for directories

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
        # Ignore hidden files/directories (starting with '.')
        if name.startswith('.'):
            return True
        # Ignore exact matches
        return name in IGNORE_PATTERNS

    async def listdir_async(current_path: str):
        return await asyncio.to_thread(os.listdir, current_path)

    async def isdir_async(full_path: str):
        return await asyncio.to_thread(os.path.isdir, full_path)

    async def build_tree(current_path: str) -> List[Dict[str, Any]]:
        """Recursively build the directory tree asynchronously"""
        items = []
        try:
            child_names = await listdir_async(current_path)
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

    async def process_item(current_path: str, name: str) -> Optional[Dict[str, Any]]:
        """Process a single directory item asynchronously"""
        try:
            full_path = os.path.join(current_path, name)
            relative_path = os.path.relpath(full_path, root_path)

            if await isdir_async(full_path):
                if lazy:
                    # For lazy loading, check if directory has any visible children asynchronously
                    has_children = False
                    try:
                        for child_name in await listdir_async(full_path):
                            if not should_ignore(child_name):
                                has_children = True
                                break
                    except (PermissionError, FileNotFoundError):
                        pass # Ignore errors checking for children, assume no visible children

                    return {
                        'title': name,
                        'key': relative_path,
                        'children': [],  # Empty children array for lazy loading
                        'isLeaf': False,
                        'hasChildren': has_children
                    }
                else:
                    children = await build_tree(full_path)
                    if children:  # Only add non-empty directories
                        return {
                            'title': name,
                            'key': relative_path,
                            'children': children,
                            'isLeaf': False,
                            'hasChildren': True
                        }
                    else: # Represent empty directories as leaves if not lazy loading
                         return {
                            'title': name,
                            'key': relative_path,                            
                            'isLeaf': True,
                            'hasChildren': False
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
        if await isdir_async(potential_target_path):
             target_path = potential_target_path
        else:
            return [] # Path does not point to a valid directory

    return await build_tree(target_path)


def read_file_content(project_path: str, file_path: str) -> str:
    """Read the content of a file"""
    try:
        full_path = os.path.join(project_path, file_path)
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


async def async_read_file_content(project_path: str, file_path: str) -> Optional[str]:
    """Asynchronously read the content of a file"""
    full_path = os.path.join(project_path, file_path)

    try:
        # Check if the path exists and is a file before attempting to open
        # aiofiles doesn't have direct async equivalents for exists/isfile, so use asyncio.to_thread
        path_exists = await asyncio.to_thread(os.path.exists, full_path)
        is_file = await asyncio.to_thread(os.path.isfile, full_path)

        if not path_exists or not is_file:
            return None # Or raise a specific error like FileNotFoundError

        # Use aiofiles for asynchronous file reading
        async with aiofiles.open(full_path, mode='r', encoding='utf-8', errors='ignore') as f:
            content = await f.read()
        return content
    except IOError: # Catch file-related errors
        # Log the error here if needed
        return None
    except Exception as e:
        # Catch any other unexpected error during path checks or reading
        # Log e
        return None
