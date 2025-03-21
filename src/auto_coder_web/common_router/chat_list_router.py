import os
import json
from fastapi import APIRouter, HTTPException
import aiofiles
from auto_coder_web.types import ChatList

router = APIRouter()

@router.post("/api/chat-lists/save")
async def save_chat_list(chat_list: ChatList):
    try:
        chat_lists_dir = os.path.join(
            ".auto-coder", "auto-coder.web", "chat-lists")
        os.makedirs(chat_lists_dir, exist_ok=True)

        file_path = os.path.join(
            chat_lists_dir, f"{chat_list.name}.json")
        async with aiofiles.open(file_path, 'w') as f:
            await f.write(json.dumps({"messages": chat_list.messages}, indent=2))
        return {"status": "success", "message": f"Chat list {chat_list.name} saved successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/api/chat-lists")
async def get_chat_lists():
    try:
        chat_lists_dir = os.path.join(
            ".auto-coder", "auto-coder.web", "chat-lists")
        os.makedirs(chat_lists_dir, exist_ok=True)

        # Get files with their modification times
        chat_lists = []
        for file in os.listdir(chat_lists_dir):
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
async def get_chat_list(name: str):
    try:
        file_path = os.path.join(
            ".auto-coder", "auto-coder.web", "chat-lists", f"{name}.json")
        if not os.path.exists(file_path):
            raise HTTPException(
                status_code=404, detail=f"Chat list {name} not found")

        async with aiofiles.open(file_path, 'r') as f:
            content = await f.read()
            return json.loads(content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/api/chat-lists/{name}")
async def delete_chat_list(name: str):
    try:
        file_path = os.path.join(
            ".auto-coder", "auto-coder.web", "chat-lists", f"{name}.json")
        if not os.path.exists(file_path):
            raise HTTPException(
                status_code=404, detail=f"Chat list {name} not found")

        os.remove(file_path)
        return {"status": "success", "message": f"Chat list {name} deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 