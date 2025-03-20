import os
import json
import uuid
import logging
import asyncio
import aiofiles
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
from pathlib import Path

router = APIRouter()

# 配置存储路径
TODO_FILE = Path(".auto-coder/auto-coder.web/todos/todos.json")

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

class ExecuteTaskResponse(BaseModel):
    status: str
    task_id: str
    message: str
    split_result: Optional[Dict[str, Any]] = None

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

@router.post("/api/todos/{todo_id}/execute", response_model=ExecuteTaskResponse)
async def execute_task(todo_id: str):
    """执行任务（从待评估移到进行中后用户确认执行）"""
    # 获取所有待办事项
    todos = await load_todos()
    
    # 查找指定的待办事项
    todo = next((t for t in todos if t.id == todo_id), None)
    if not todo:
        raise HTTPException(status_code=404, detail="Todo not found")
    
    # 确保任务状态为"进行中"
    if todo.status != "developing":
        todo.status = "developing"
        todo.updated_at = datetime.now().isoformat()
        # 更新任务状态
        await save_todos([t if t.id != todo_id else todo for t in todos])
    
    # 添加"正在拆解"标签，如果还没有的话
    if "正在拆解" not in todo.tags:
        todo.tags.append("正在拆解")
        todo.updated_at = datetime.now().isoformat()
        await save_todos([t if t.id != todo_id else todo for t in todos])
    
    # 获取任务的原始需求（这里就是任务标题）
    original_task = {
        "title": todo.title,
        "description": f"优先级: {todo.priority}, 标签: {', '.join(todo.tags)}"
    }
    
    # 打印日志，显示我们正在处理这个任务
    logger.info(f"执行任务: {todo_id}, 标题: {todo.title}")
    logger.info(f"原始需求: {original_task}")
    
    # 模拟任务拆分 - 这里只是创建一个示例结果
    # 实际实现中，这里可能会调用AI服务或其他逻辑来拆分任务
    mock_split_result = {
        "original_task": original_task,
        "analysis": f"这是对任务 '{todo.title}' 的分析...",
        "tasks": [
            {
                "title": f"{todo.title} - 子任务 1",
                "description": "这是子任务1的描述",
                "steps": ["步骤1", "步骤2", "步骤3"],
                "priority": todo.priority,
                "estimate": "2小时",
                "references": [],
                "acceptance_criteria": ["验收标准1", "验收标准2"]
            },
            {
                "title": f"{todo.title} - 子任务 2",
                "description": "这是子任务2的描述",
                "steps": ["步骤1", "步骤2"],
                "priority": todo.priority,
                "estimate": "3小时",
                "references": [],
                "acceptance_criteria": ["验收标准1"]
            }
        ],
        "tasks_count": 2,
        "dependencies": [
            {
                "task": f"{todo.title} - 子任务 2",
                "depends_on": [f"{todo.title} - 子任务 1"]
            }
        ]
    }
    
    # 打印拆分结果
    logger.info(f"任务拆分结果: {json.dumps(mock_split_result, ensure_ascii=False, indent=2)}")
    
    # 返回响应
    return ExecuteTaskResponse(
        status="success",
        task_id=todo_id,
        message="任务已开始执行",
        split_result=mock_split_result
    )

async def get_insert_index(todos: List[TodoItem], status: str, destination_index: int) -> int:
    """计算插入位置的绝对索引"""
    status_todos = [i for i, t in enumerate(todos) if t.status == status]
    if not status_todos:
        return len(todos)
    
    # 确保目标索引在有效范围内
    destination_index = min(max(destination_index, 0), len(status_todos))
    
    # 如果目标列没有项目，直接插入到最后
    if not status_todos:
        return len(todos)
    
    # 返回目标列中对应位置的索引
    return status_todos[destination_index] if destination_index < len(status_todos) else status_todos[-1] + 1