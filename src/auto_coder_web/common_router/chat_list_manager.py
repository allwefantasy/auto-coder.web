import os
import json
import asyncio
import aiofiles
from typing import List, Dict, Any, Tuple
from loguru import logger

def _get_chat_lists_dir(project_path: str) -> str:
    """获取聊天列表目录的路径，并确保目录存在"""
    chat_lists_dir = os.path.join(project_path, ".auto-coder", "auto-coder.web", "chat-lists")
    os.makedirs(chat_lists_dir, exist_ok=True)
    return chat_lists_dir

def _get_chat_list_file_path(project_path: str, name: str) -> str:
    """获取特定聊天列表文件的完整路径"""
    chat_lists_dir = _get_chat_lists_dir(project_path)
    return os.path.join(chat_lists_dir, f"{name}.json")

async def save_chat_list(project_path: str, name: str, messages: List[Dict[str, Any]], metadata: dict = None) -> None:
    """
    保存聊天列表到文件
    
    Args:
        project_path: 项目路径
        name: 聊天列表名称
        messages: 聊天消息列表
        metadata: 聊天元数据
        
    Raises:
        Exception: 如果保存失败
    """
    file_path = _get_chat_list_file_path(project_path, name)
    try:
        data = {
            "name": name,
            "messages": messages
        }
        if metadata is not None:
            data["metadata"] = metadata
        async with aiofiles.open(file_path, 'w') as f:
            await f.write(json.dumps(data, indent=2, ensure_ascii=False))
    except Exception as e:
        logger.error(f"Error saving chat list {name}: {str(e)}")
        raise e

async def get_chat_lists(project_path: str) -> List[str]:
    """
    获取所有聊天列表的名称，按修改时间倒序排列（最新的在前）
    
    Args:
        project_path: 项目路径
        
    Returns:
        聊天列表名称列表
        
    Raises:
        Exception: 如果获取列表失败
    """
    chat_lists_dir = _get_chat_lists_dir(project_path)
    
    try:
        # 获取文件及其修改时间
        chat_lists = []
        files = await asyncio.to_thread(os.listdir, chat_lists_dir)
        for file in files:
            if file.endswith('.json'):
                file_path = os.path.join(chat_lists_dir, file)
                mod_time = os.path.getmtime(file_path)
                # 存储(名称, 修改时间)的元组
                chat_lists.append((file[:-5], mod_time))

        # 按修改时间倒序排序（最新的在前）
        chat_lists.sort(key=lambda x: x[1], reverse=True)

        # 只返回聊天列表名称
        return [name for name, _ in chat_lists]
    except Exception as e:
        logger.error(f"Error getting chat lists: {str(e)}")
        raise e

async def get_chat_list(project_path: str, name: str) -> Dict[str, Any]:
    """
    获取特定聊天列表的内容（兼容旧结构）
    """
    file_path = _get_chat_list_file_path(project_path, name)
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Chat list {name} not found")
        
    try:
        async with aiofiles.open(file_path, 'r') as f:
            content = await f.read()
            data = json.loads(content)
            # 兼容旧数据结构（只有messages）
            if "name" not in data:
                data["name"] = name
            if "metadata" not in data:
                data["metadata"] = None
            return data
    except json.JSONDecodeError as e:
        logger.error(f"Invalid JSON in chat list {name}: {str(e)}")
        raise Exception(f"Invalid JSON in chat list file: {str(e)}")
    except Exception as e:
        logger.error(f"Error reading chat list {name}: {str(e)}")
        raise e

def get_chat_list_sync(project_path: str, name: str) -> Dict[str, Any]:
    """
    获取特定聊天列表的内容（同步版本）
    
    Args:
        project_path: 项目路径
        name: 聊天列表名称
        
    Returns:
        聊天列表内容
        
    Raises:
        FileNotFoundError: 如果聊天列表不存在
        Exception: 如果读取失败
    """
    file_path = _get_chat_list_file_path(project_path, name)
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Chat list {name} not found")
        
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            return json.loads(content)
    except json.JSONDecodeError as e:
        logger.error(f"Invalid JSON in chat list {name}: {str(e)}")
        raise Exception(f"Invalid JSON in chat list file: {str(e)}")
    except Exception as e:
        logger.error(f"Error reading chat list {name}: {str(e)}")
        raise e

async def delete_chat_list(project_path: str, name: str) -> None:
    """
    删除聊天列表
    
    Args:
        project_path: 项目路径
        name: 聊天列表名称
        
    Raises:
        FileNotFoundError: 如果聊天列表不存在
        Exception: 如果删除失败
    """
    file_path = _get_chat_list_file_path(project_path, name)
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Chat list {name} not found")
        
    try:
        os.remove(file_path)
    except Exception as e:
        logger.error(f"Error deleting chat list {name}: {str(e)}")
        raise e

async def rename_chat_list(project_path: str, old_name: str, new_name: str) -> None:
    """
    重命名聊天列表
    
    Args:
        project_path: 项目路径
        old_name: 旧的聊天列表名称
        new_name: 新的聊天列表名称
        
    Raises:
        FileNotFoundError: 如果原聊天列表不存在
        FileExistsError: 如果新名称的聊天列表已存在
        Exception: 如果重命名失败
    """
    old_file_path = _get_chat_list_file_path(project_path, old_name)
    new_file_path = _get_chat_list_file_path(project_path, new_name)
    
    # 检查旧文件是否存在
    if not os.path.exists(old_file_path):
        raise FileNotFoundError(f"Chat list {old_name} not found")
    
    # 检查新文件名是否已存在
    if os.path.exists(new_file_path):
        raise FileExistsError(f"Chat list with name {new_name} already exists")
    
    try:
        # 读取旧文件内容
        async with aiofiles.open(old_file_path, 'r') as f:
            content = await f.read()
        
        # 写入新文件
        async with aiofiles.open(new_file_path, 'w') as f:
            await f.write(content)
        
        # 删除旧文件
        os.remove(old_file_path)
    except Exception as e:
        logger.error(f"Error renaming chat list from {old_name} to {new_name}: {str(e)}")
        raise e 