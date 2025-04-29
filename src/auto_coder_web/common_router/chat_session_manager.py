import os
import json
import aiofiles
from loguru import logger

def _get_session_file_path(project_path: str, panel_id: str = "") -> str:
    """获取会话信息文件的完整路径"""
    session_dir = os.path.join(project_path, ".auto-coder", "auto-coder.web")
    os.makedirs(session_dir, exist_ok=True)
    file_name = "current-session.json" if not panel_id else f"current-session-{panel_id}.json"
    return os.path.join(session_dir, file_name)

async def read_session_name(project_path: str, panel_id: str = "") -> str:
    """
    从文件读取当前会话名称
    
    Args:
        project_path: 项目路径
        panel_id: 可选的面板ID

    Returns:
        当前会话名称，如果文件不存在或出错则返回空字符串
    """
    session_file = _get_session_file_path(project_path, panel_id)
    
    if not os.path.exists(session_file):
        return ""
        
    try:
        async with aiofiles.open(session_file, 'r') as f:
            content = await f.read()
            session_data = json.loads(content)
            return session_data.get("session_name", "")
    except Exception as e:
        logger.error(f"Error reading session name from {session_file}: {str(e)}")
        return ""

def read_session_name_sync(project_path: str, panel_id: str = "") -> str:
    """
    从文件读取当前会话名称（同步版本）
    
    Args:
        project_path: 项目路径
        panel_id: 可选的面板ID

    Returns:
        当前会话名称，如果文件不存在或出错则返回空字符串
    """
    session_file = _get_session_file_path(project_path, panel_id)
    
    if not os.path.exists(session_file):
        return ""
        
    try:
        with open(session_file, 'r', encoding='utf-8') as f:
            content = f.read()
            session_data = json.loads(content)
            return session_data.get("session_name", "")
    except Exception as e:
        logger.error(f"Error reading session name from {session_file}: {str(e)}")
        return ""

async def write_session_name(project_path: str, session_name: str, panel_id: str = ""):
    """
    将当前会话名称写入文件
    
    Args:
        project_path: 项目路径
        session_name: 要写入的会话名称
        panel_id: 可选的面板ID

    Raises:
        Exception: 如果写入文件失败
    """
    session_file = _get_session_file_path(project_path, panel_id)
    
    session_data = {
        "session_name": session_name,
        "panel_id": panel_id
    }
    try:
        async with aiofiles.open(session_file, 'w') as f:
            await f.write(json.dumps(session_data, indent=2, ensure_ascii=False))
    except Exception as e:
        logger.error(f"Error writing session name to {session_file}: {str(e)}")
        raise e

def write_session_name_sync(project_path: str, session_name: str, panel_id: str = ""):
    """
    将当前会话名称写入文件（同步版本）
    
    Args:
        project_path: 项目路径
        session_name: 要写入的会话名称
        panel_id: 可选的面板ID

    Raises:
        Exception: 如果写入文件失败
    """
    session_file = _get_session_file_path(project_path, panel_id)
    
    session_data = {
        "session_name": session_name,
        "panel_id": panel_id
    }
    try:
        with open(session_file, 'w', encoding='utf-8') as f:
            f.write(json.dumps(session_data, indent=2, ensure_ascii=False))
    except Exception as e:
        logger.error(f"Error writing session name to {session_file}: {str(e)}")
        raise e 