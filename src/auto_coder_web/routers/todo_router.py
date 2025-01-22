import os
import json
import uuid
import logging
import asyncio
import aiofiles
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from pathlib import Path

router = APIRouter()

# 配置存储路径
TODO_FILE = Path(".auto-coder/auto-coder.web/todos.json")

# 确保目录存在
TODO_FILE.parent.mkdir(parents=True, exist_ok=True)

logger = logging.getLogger(__name__)

class TodoItem(BaseModel):
    id: str
    title: str
    status: str  # pending/developing/testing/done
    priority: str  # P0/P1/P2/P3
    tags: List[str] = []
    owner: Optional[str] = None
    due_date: Optional[str] = None
    created_at: str
    updated_at: str

class CreateTodoRequest(BaseModel):
    title: str
    priority: str
    tags: List[str] = []

class ReorderTodoRequest(BaseModel):
    source_status: str
    source_index: int
    destination_status: str
    destination_index: int
    todo_id: str

async def load_todos() -> List[TodoItem]:
    """异步加载所有待办事项"""
    if not await asyncio.to_thread(lambda: TODO_FILE.exists()):
        return []
    
    try:
        async with aiofiles.open(TODO_FILE, mode='r') as f:
            content = await f.read()
            return [TodoItem(**item) for item in json.loads(content)]
    except (json.JSONDecodeError, FileNotFoundError):
        logger.error("Failed to parse todos.json, returning empty list")
        return []

async def save_todos(todos: List[TodoItem]):
    """异步保存待办事项"""
    async with aiofiles.open(TODO_FILE, mode='w') as f:
        await f.write(json.dumps([todo.dict() for todo in todos], indent=2,ensure_ascii=False))

@router.get("/api/todos", response_model=List[TodoItem])
async def get_all_todos():
    """获取所有待办事项"""
    return await load_todos()

@router.post("/api/todos", response_model=TodoItem)
async def create_todo(request: CreateTodoRequest):
    """创建新待办事项"""
    todos = await load_todos()
    
    new_todo = TodoItem(
        id=str(uuid.uuid4()),
        title=request.title,
        status="pending",
        priority=request.priority,
        tags=request.tags,
        created_at=datetime.now().isoformat(),
        updated_at=datetime.now().isoformat()
    )
    
    todos.append(new_todo)
    await save_todos(todos)
    return new_todo

@router.put("/api/todos/{todo_id}", response_model=TodoItem)
async def update_todo(todo_id: str, update_data: dict):
    """更新待办事项"""
    todos = await load_todos()
    
    for index, todo in enumerate(todos):
        if todo.id == todo_id:
            updated_data = todos[index].dict()
            updated_data.update(update_data)
            updated_data["updated_at"] = datetime.now().isoformat()
            todos[index] = TodoItem(**updated_data)
            await save_todos(todos)
            return todos[index]
    
    raise HTTPException(status_code=404, detail="Todo not found")

@router.delete("/api/todos/{todo_id}")
async def delete_todo(todo_id: str):
    """删除待办事项"""
    todos = await load_todos()
    new_todos = [todo for todo in todos if todo.id != todo_id]
    
    if len(new_todos) == len(todos):
        raise HTTPException(status_code=404, detail="Todo not found")
    
    await save_todos(new_todos)
    return {"status": "success"}

@router.post("/api/todos/reorder")
async def reorder_todos(request: ReorderTodoRequest):
    """处理拖放排序"""
    todos = await load_todos()
    
    # 找到移动的待办事项
    moved_todo = next((t for t in todos if t.id == request.todo_id), None)
    if not moved_todo:
        raise HTTPException(status_code=404, detail="Todo not found")
    
    # 移除原位置
    todos = [t for t in todos if t.id != request.todo_id]
    
    # 更新状态
    moved_todo.status = request.destination_status
    moved_todo.updated_at = datetime.now().isoformat()
    
    # 插入新位置
    todos.insert(
        await get_insert_index(todos, request.destination_status, request.destination_index),
        moved_todo
    )
    
    await save_todos(todos)
    return {"status": "success"}

async def get_insert_index(todos: List[TodoItem], status: str, destination_index: int) -> int:
    """计算插入位置的绝对索引"""
    status_todos = [i for i, t in enumerate(todos) if t.status == status]
    if not status_todos:
        return len(todos)
    
    if destination_index >= len(status_todos):
        return status_todos[-1] + 1
    return status_todos[destination_index]