import os
import json
from fastapi import APIRouter, HTTPException, Request, Depends
import aiofiles
from auto_coder_web.types import ChatList
from pydantic import BaseModel
import asyncio
from loguru import logger
# 导入会话管理函数
from .chat_session_manager import read_session_name, write_session_name
# 导入聊天列表管理函数
from .chat_list_manager import save_chat_list, get_chat_lists, get_chat_list, delete_chat_list, rename_chat_list

class SessionNameRequest(BaseModel):
    session_name: str
    panel_id: str = ""  # 添加panel_id字段，默认为空字符串


class RenameChatListRequest(BaseModel):
    old_name: str
    new_name: str


async def get_project_path(request: Request) -> str:
    """
    从FastAPI请求上下文中获取项目路径
    """
    return request.app.state.project_path

router = APIRouter()


@router.post("/api/chat-lists/save")
async def save_chat_list_endpoint(chat_list: ChatList, project_path: str = Depends(get_project_path)):
    try:
        # 调用管理模块保存聊天列表，支持 metadata
        await save_chat_list(project_path, chat_list.name, chat_list.messages, metadata=chat_list.metadata.dict() if chat_list.metadata else None)
        return {"status": "success", "message": f"Chat list {chat_list.name} saved successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/chat-lists")
async def get_chat_lists_endpoint(project_path: str = Depends(get_project_path)):
    try:
        # 调用管理模块获取聊天列表
        chat_lists = await get_chat_lists(project_path)
        return {"chat_lists": chat_lists}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/chat-lists/{name}")
async def get_chat_list_endpoint(name: str, project_path: str = Depends(get_project_path)):
    try:
        # 调用管理模块获取特定聊天列表
        return await get_chat_list(project_path, name)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"Chat list {name} not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/api/chat-lists/{name}")
async def delete_chat_list_endpoint(name: str, project_path: str = Depends(get_project_path)):
    try:
        # 调用管理模块删除聊天列表
        await delete_chat_list(project_path, name)
        return {"status": "success", "message": f"Chat list {name} deleted successfully"}
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"Chat list {name} not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/chat-session/name")
async def get_current_session_name(panel_id: str = "", project_path: str = Depends(get_project_path)):
    """
    获取当前会话名称
    
    Args:
        panel_id: 可选的面板ID，用于区分不同的聊天面板
        project_path: 项目路径
    """
    try:
        # 调用新的函数读取会话名称
        session_name = await read_session_name(project_path, panel_id)
        return {"session_name": session_name}
            
    except Exception as e:
        # 如果发生错误，记录错误但返回空会话名 (read_session_name内部已处理部分错误)
        logger.error(f"Error in get_current_session_name endpoint: {str(e)}")
        return {"session_name": ""}


@router.post("/api/chat-session/name")
async def set_current_session_name(request: SessionNameRequest, project_path: str = Depends(get_project_path)):
    """
    设置当前会话名称
    
    Args:
        request: 包含会话名称和可选面板ID的请求
        project_path: 项目路径
    """
    try:
        # 调用新的函数写入会话名称
        await write_session_name(project_path, request.session_name, request.panel_id)
        return {"status": "success", "message": "Current session name updated"}
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to set current session name: {str(e)}")


@router.post("/api/chat-lists/rename")
async def rename_chat_list_endpoint(request: RenameChatListRequest, project_path: str = Depends(get_project_path)):
    """
    重命名聊天列表
    
    将现有聊天列表从旧名称重命名为新名称
    """
    try:
        # 调用管理模块重命名聊天列表
        await rename_chat_list(project_path, request.old_name, request.new_name)
        
        # 如果当前会话名称是旧名称，则更新为新名称
        # 注意：这里只更新默认的会话文件（panel_id=""）
        # 如果需要根据panel_id更新所有相关会话文件，逻辑会更复杂
        try:
            current_session_name = await read_session_name(project_path, panel_id="") # P读取默认会话
            if current_session_name == request.old_name:
                await write_session_name(project_path, request.new_name, panel_id="") # 更新默认会话
        except Exception as e:
            # 记录错误，但不影响重命名操作的主要流程
            logger.error(f"Error updating default current session name during rename: {str(e)}")
        
        return {"status": "success", "message": f"Chat list renamed from {request.old_name} to {request.new_name}"}
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"Chat list {request.old_name} not found")
    except FileExistsError:
        raise HTTPException(status_code=409, detail=f"Chat list with name {request.new_name} already exists")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to rename chat list: {str(e)}")
