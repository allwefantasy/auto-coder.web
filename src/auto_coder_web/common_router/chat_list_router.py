import os
import json
from fastapi import APIRouter, HTTPException, Request, Depends
import aiofiles
from auto_coder_web.types import ChatList
from pydantic import BaseModel
import asyncio

class SessionNameRequest(BaseModel):
    session_name: str


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
async def save_chat_list(chat_list: ChatList, project_path: str = Depends(get_project_path)):
    try:
        chat_lists_dir = os.path.join(project_path,
                                      ".auto-coder", "auto-coder.web", "chat-lists")
        os.makedirs(chat_lists_dir, exist_ok=True)

        file_path = os.path.join(chat_lists_dir, f"{chat_list.name}.json")
        async with aiofiles.open(file_path, 'w') as f:
            await f.write(json.dumps({"messages": chat_list.messages}, indent=2, ensure_ascii=False))
        return {"status": "success", "message": f"Chat list {chat_list.name} saved successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/chat-lists")
async def get_chat_lists(project_path: str = Depends(get_project_path)):
    try:
        chat_lists_dir = os.path.join(
            project_path, ".auto-coder", "auto-coder.web", "chat-lists")
        os.makedirs(chat_lists_dir, exist_ok=True)

        # Get files with their modification times
        chat_lists = []
        files = await asyncio.to_thread(os.listdir, chat_lists_dir)
        for file in files:
            if file.endswith('.json'):
                file_path = os.path.join(chat_lists_dir, file)
                mod_time = os.path.getmtime(file_path)
                # Store tuple of (name, mod_time)
                chat_lists.append((file[:-5], mod_time))

        # Sort by modification time (newest first)
        chat_lists.sort(key=lambda x: x[1], reverse=True)

        # Return only the chat list names
        return {"chat_lists": [name for name, _ in chat_lists]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/chat-lists/{name}")
async def get_chat_list(name: str, project_path: str = Depends(get_project_path)):
    try:
        file_path = os.path.join(
            project_path, ".auto-coder", "auto-coder.web", "chat-lists", f"{name}.json")
        if not os.path.exists(file_path):
            raise HTTPException(
                status_code=404, detail=f"Chat list {name} not found")

        async with aiofiles.open(file_path, 'r') as f:
            content = await f.read()
            return json.loads(content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/api/chat-lists/{name}")
async def delete_chat_list(name: str, project_path: str = Depends(get_project_path)):
    try:
        file_path = os.path.join(
            project_path, ".auto-coder", "auto-coder.web", "chat-lists", f"{name}.json")
        if not os.path.exists(file_path):
            raise HTTPException(
                status_code=404, detail=f"Chat list {name} not found")

        os.remove(file_path)
        return {"status": "success", "message": f"Chat list {name} deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/chat-session/name")
async def get_current_session_name(project_path: str = Depends(get_project_path)):
    """
    获取当前会话名称
    """
    try:
        # 创建存储会话信息的目录
        session_dir = os.path.join(project_path, ".auto-coder", "auto-coder.web")
        os.makedirs(session_dir, exist_ok=True)
        
        # 会话信息文件路径
        session_file = os.path.join(session_dir, "current-session.json")
        
        # 如果文件不存在，返回空会话名称
        if not os.path.exists(session_file):
            return {"session_name": ""}
        
        # 读取当前会话信息
        async with aiofiles.open(session_file, 'r') as f:
            content = await f.read()
            session_data = json.loads(content)
            return {"session_name": session_data.get("session_name", "")}
            
    except Exception as e:
        # 如果发生错误，记录错误但返回空会话名
        print(f"Error getting current session name: {str(e)}")
        return {"session_name": ""}


@router.post("/api/chat-session/name")
async def set_current_session_name(request: SessionNameRequest, project_path: str = Depends(get_project_path)):
    """
    设置当前会话名称
    """
    try:
        # 创建存储会话信息的目录
        session_dir = os.path.join(project_path, ".auto-coder", "auto-coder.web")
        os.makedirs(session_dir, exist_ok=True)
        
        # 会话信息文件路径
        session_file = os.path.join(session_dir, "current-session.json")
        
        # 保存当前会话信息
        session_data = {"session_name": request.session_name}
        async with aiofiles.open(session_file, 'w') as f:
            await f.write(json.dumps(session_data, indent=2, ensure_ascii=False))
            
        return {"status": "success", "message": "Current session name updated"}
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to set current session name: {str(e)}")


@router.post("/api/chat-lists/rename")
async def rename_chat_list(request: RenameChatListRequest, project_path: str = Depends(get_project_path)):
    """
    重命名聊天列表
    
    将现有聊天列表从旧名称重命名为新名称
    """
    try:
        chat_lists_dir = os.path.join(project_path, ".auto-coder", "auto-coder.web", "chat-lists")
        old_file_path = os.path.join(chat_lists_dir, f"{request.old_name}.json")
        new_file_path = os.path.join(chat_lists_dir, f"{request.new_name}.json")
        
        # 检查旧文件是否存在
        if not os.path.exists(old_file_path):
            raise HTTPException(status_code=404, detail=f"Chat list {request.old_name} not found")
        
        # 检查新文件名是否已存在
        if os.path.exists(new_file_path):
            raise HTTPException(status_code=409, detail=f"Chat list with name {request.new_name} already exists")
        
        # 读取旧文件内容
        async with aiofiles.open(old_file_path, 'r') as f:
            content = await f.read()
        
        # 写入新文件
        async with aiofiles.open(new_file_path, 'w') as f:
            await f.write(content)
        
        # 删除旧文件
        os.remove(old_file_path)
        
        # 如果当前会话名称是旧名称，则更新为新名称
        session_file = os.path.join(project_path, ".auto-coder", "auto-coder.web", "current-session.json")
        if os.path.exists(session_file):
            try:
                async with aiofiles.open(session_file, 'r') as f:
                    session_content = await f.read()
                    session_data = json.loads(session_content)
                    
                if session_data.get("session_name") == request.old_name:
                    session_data["session_name"] = request.new_name
                    async with aiofiles.open(session_file, 'w') as f:
                        await f.write(json.dumps(session_data, indent=2, ensure_ascii=False))
            except Exception as e:
                print(f"Error updating current session name: {str(e)}")
        
        return {"status": "success", "message": f"Chat list renamed from {request.old_name} to {request.new_name}"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to rename chat list: {str(e)}")
