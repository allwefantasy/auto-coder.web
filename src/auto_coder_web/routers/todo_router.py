import os
import json
import uuid
import logging
import asyncio
import aiofiles
from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
from pathlib import Path
from threading import Thread
from autocoder.events.event_manager_singleton import get_event_manager, gengerate_event_file_path, get_event_file_path
from autocoder.events import event_content as EventContentCreator
from auto_coder_web.auto_coder_runner_wrapper import AutoCoderRunnerWrapper

router = APIRouter()

# 配置存储路径
TODO_FILE = Path(".auto-coder/auto-coder.web/todos/todos.json")

# 确保目录存在
TODO_FILE.parent.mkdir(parents=True, exist_ok=True)

logger = logging.getLogger(__name__)


async def get_project_path(request: Request) -> str:
    """
    从FastAPI请求上下文中获取项目路径
    """
    return request.app.state.project_path


class Task(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    references: Optional[List[str]] = []
    steps: Optional[List[str]] = []
    acceptance_criteria: Optional[List[str]] = []
    priority: Optional[str] = None
    estimate: Optional[str] = None
    # 任务状态: pending/executing/completed/failed
    status: Optional[str] = "pending"
    event_file_id: Optional[str] = None  # 关联的执行事件ID
    next_task_ready: Optional[bool] = False  # 标记下一个任务是否已准备好执行


class Dependency(BaseModel):
    task: str
    depends_on: List[str] = []


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
    description: Optional[str] = None
    tasks: Optional[List[Task]] = None
    analysis: Optional[str] = None  # 任务拆分分析
    dependencies: Optional[List[Dependency]] = None  # 子任务间的依赖关系


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
    current_task_index: Optional[int] = None
    event_file_id: Optional[str] = None


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
        await f.write(json.dumps([todo.dict() for todo in todos], indent=2, ensure_ascii=False))


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
            updated_data = todos[index].model_dump()
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


@router.get("/api/todos/{todo_id}", response_model=TodoItem)
async def get_single_todo(todo_id: str):
    """获取单个待办事项的详细信息"""
    todos = await load_todos()
    
    # 查找指定ID的待办事项
    todo = next((t for t in todos if t.id == todo_id), None)
    
    # 如果未找到，返回404错误
    if not todo:
        raise HTTPException(status_code=404, detail="Todo not found")
    
    return todo


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

    # 确保目标索引在有效范围内
    destination_index = min(max(destination_index, 0), len(status_todos))

    # 如果目标列没有项目，直接插入到最后
    if not status_todos:
        return len(todos)

    # 返回目标列中对应位置的索引
    return status_todos[destination_index] if destination_index < len(status_todos) else status_todos[-1] + 1


async def get_project_path(request: Request) -> str:
    """从FastAPI请求上下文中获取项目路径"""
    return request.app.state.project_path


def generate_command_from_task(task: Task, todo: TodoItem) -> str:
    """
    根据任务信息生成执行命令

    Args:
        task: 要执行的任务对象
        todo: 所属的待办事项对象

    Returns:
        用于执行的coding命令
    """
    # 构建任务上下文信息
    context = {
        "todo_title": todo.title,
        "todo_description": todo.description or "",
        "task_title": task.title,
        "task_description": task.description or "",
        "references": task.references or [],
        "steps": task.steps or [],
        "acceptance_criteria": task.acceptance_criteria or []
    }

    # 构建提示
    prompt = f"""请根据以下任务需求帮我实现功能:

## 主任务
标题: {context['todo_title']}
描述: {context['todo_description']}

## 当前子任务
标题: {context['task_title']}
描述: {context['task_description']}

## 实现步骤
{chr(10).join([f"- {step}" for step in context['steps']])}

## 技术参考
{chr(10).join([f"- {ref}" for ref in context['references']])}

## 验收标准
{chr(10).join([f"- {criterion}" for criterion in context['acceptance_criteria']])}

请根据上述信息，完成这个子任务。首先分析任务需求，然后编写代码实现。如果需要，请修改或创建必要的文件。
在实现过程中，请遵循代码最佳实践，保持代码清晰、可维护。
"""

    # 创建coding命令
    return prompt


async def update_task_status(todo_id: str, task_index: int, new_status: str, event_file_id: Optional[str] = None):
    """
    更新任务状态

    Args:
        todo_id: 待办事项ID
        task_index: 任务索引
        new_status: 新状态 (pending/executing/completed/failed)
        event_file_id: 关联的事件文件ID
    """
    try:
        # 加载所有待办事项
        todos = await load_todos()

        # 查找指定的待办事项
        todo_index = next(
            (i for i, t in enumerate(todos) if t.id == todo_id), None)
        if todo_index is None:
            logger.error(f"Todo {todo_id} not found for status update")
            return

        # 更新任务状态
        if 0 <= task_index < len(todos[todo_index].tasks):
            todos[todo_index].tasks[task_index].status = new_status
            if event_file_id:
                todos[todo_index].tasks[task_index].event_file_id = event_file_id
                        
            # 保存更新后的待办事项
            await save_todos(todos)

            logger.info(
                f"Updated task {task_index} status to {new_status} for todo {todo_id}")
        else:
            logger.error(
                f"Task index {task_index} out of range for todo {todo_id}")
    except Exception as e:
        logger.error(f"Error updating task status: {str(e)}")


async def update_todo_status(todo_id: str, new_status: str):
    """
    更新待办事项的状态

    Args:
        todo_id: 待办事项ID
        new_status: 新状态
    """
    try:
        # 加载所有待办事项
        todos = await load_todos()

        # 查找指定的待办事项
        todo_index = next(
            (i for i, t in enumerate(todos) if t.id == todo_id), None)
        if todo_index is None:
            logger.error(f"Todo {todo_id} not found when updating todo status")
            return

        # 更新待办事项状态
        todos[todo_index].status = new_status

        # 保存更新后的待办事项
        await save_todos(todos)

        logger.info(f"Updated todo {todo_id} status to {new_status}")
    except Exception as e:
        logger.error(f"Error updating todo status: {str(e)}")


async def mark_next_task_ready(todo_id: str, current_task_index: int):
    """
    标记下一个任务准备好执行

    Args:
        todo_id: 待办事项ID
        current_task_index: 当前任务索引
    """
    try:
        # 加载所有待办事项
        todos = await load_todos()

        # 查找指定的待办事项
        todo_index = next(
            (i for i, t in enumerate(todos) if t.id == todo_id), None)
        if todo_index is None:
            logger.error(
                f"Todo {todo_id} not found when marking next task ready")
            return

        # 验证任务索引
        if not todos[todo_index].tasks or current_task_index < 0 or current_task_index >= len(todos[todo_index].tasks) - 1:
            logger.error(
                f"Invalid task index {current_task_index} for todo {todo_id} or no next task available")
            return

        # 标记当前任务的next_task_ready为True
        todos[todo_index].tasks[current_task_index].next_task_ready = True

        # 保存更新后的待办事项
        await save_todos(todos)

        logger.info(
            f"Marked next task ready after task {current_task_index} for todo {todo_id}")
    except Exception as e:
        logger.error(f"Error marking next task ready: {str(e)}")


@router.get("/api/todos/{todo_id}/tasks/status")
async def get_tasks_status(todo_id: str):
    """
    获取待办事项的所有任务状态

    Args:
        todo_id: 待办事项ID

    Returns:
        任务状态列表
    """
    todos = await load_todos()

    # 查找指定的待办事项
    todo = next((t for t in todos if t.id == todo_id), None)
    if not todo:
        raise HTTPException(status_code=404, detail="Todo not found")

    # 如果没有任务，返回空列表
    if not todo.tasks:
        return {"tasks": []}

    # 准备任务状态数据
    tasks_status = []
    for i, task in enumerate(todo.tasks):
        status_data = {
            "index": i,
            "title": task.title,
            "status": task.status,
            "event_file_id": task.event_file_id,
            "next_task_ready": task.next_task_ready
        }
        tasks_status.append(status_data)

    # 检查是否有下一个准备执行的任务
    next_task_index = next((i for i, task in enumerate(
        todo.tasks) if task.next_task_ready), None)

    return {
        "tasks": tasks_status,
        "next_task_index": next_task_index
    }


@router.post("/api/todos/{todo_id}/execute-tasks")
async def execute_todo_tasks(todo_id: str, project_path: str = Depends(get_project_path)):
    """
    按顺序执行待办事项的所有任务

    Args:
        todo_id: 待办事项ID

    Returns:
        执行状态
    """
    todos = await load_todos()

    # 查找指定的待办事项
    todo = next((t for t in todos if t.id == todo_id), None)
    if not todo:
        raise HTTPException(status_code=404, detail="Todo not found")

    # 检查是否有任务
    if not todo.tasks or len(todo.tasks) == 0:
        raise HTTPException(
            status_code=400, detail="No tasks found in this todo item")

    # 更新待办事项状态为正在执行
    todo_index = next(
        (i for i, t in enumerate(todos) if t.id == todo_id), None)
    if todo_index is not None:
        todos[todo_index].status = "developing"
        await save_todos(todos)

    # 创建一个列表来存储所有任务的执行状态
    task_execution_results = []

    # 定义执行单个任务的函数
    async def execute_single_task(task_index: int):
        # 获取最新的todos数据
        current_todos = await load_todos()
        current_todo_index = next((i for i, t in enumerate(current_todos) if t.id == todo_id), None)
        
        if current_todo_index is None or task_index >= len(current_todos[current_todo_index].tasks):
            raise Exception(f"Todo {todo_id} or task {task_index} not found")
            
        task = current_todos[current_todo_index].tasks[task_index]

        # 生成事件文件路径
        event_file, file_id = gengerate_event_file_path()

        # 更新任务状态为执行中
        current_todos[current_todo_index].tasks[task_index].status = "executing"
        current_todos[current_todo_index].tasks[task_index].event_file_id = file_id
        await save_todos(current_todos)

        return task, event_file, file_id

    # 定义线程中运行的函数
    def run_tasks_in_thread():
        try:
            for i, task in enumerate(todo.tasks):
                try:
                    # 获取当前任务的信息
                    current_task, event_file, file_id = asyncio.run(
                        execute_single_task(i))

                    # 创建AutoCoderRunnerWrapper实例
                    wrapper = AutoCoderRunnerWrapper(project_path)
                    wrapper.configure_wrapper(f"event_file:{event_file}")

                    # 调用coding方法执行任务
                    command = generate_command_from_task(current_task, todo)
                    result = wrapper.coding_wapper(command)

                    # 更新任务状态为已完成 - 获取最新的todos数据
                    current_todos = asyncio.run(load_todos())
                    current_todo_index = next((idx for idx, t in enumerate(current_todos) if t.id == todo_id), None)
                    
                    if current_todo_index is not None and i < len(current_todos[current_todo_index].tasks):
                        current_todos[current_todo_index].tasks[i].status = "completed"
                        current_todos[current_todo_index].tasks[i].event_file_id = file_id
                        asyncio.run(save_todos(current_todos))
                    
                    logger.info(
                        f"Task {i+1}/{len(todo.tasks)} (ID: {file_id}) for todo {todo_id} completed successfully")

                    # 标记任务完成
                    get_event_manager(event_file).write_completion(
                        EventContentCreator.create_completion(
                            "200", "completed", result).to_dict()
                    )
                                                            
                    # 添加到结果列表
                    task_execution_results.append({
                        "task_index": i,
                        "task_id": file_id,
                        "status": "completed",
                        "title": current_task.title
                    })

                except Exception as e:
                    logger.error(
                        f"Error executing task {i+1}/{len(todo.tasks)} for todo {todo_id}: {str(e)}")

                    # 标记任务失败
                    if 'event_file' in locals():
                        get_event_manager(event_file).write_error(
                            EventContentCreator.create_error(
                                "500", "error", str(e)).to_dict()
                        )

                    # 更新任务状态为失败 - 获取最新的todos数据
                    if 'file_id' in locals():
                        current_todos = asyncio.run(load_todos())
                        current_todo_index = next((idx for idx, t in enumerate(current_todos) if t.id == todo_id), None)
                        
                        if current_todo_index is not None and i < len(current_todos[current_todo_index].tasks):
                            current_todos[current_todo_index].tasks[i].status = "failed"
                            current_todos[current_todo_index].tasks[i].event_file_id = file_id
                            asyncio.run(save_todos(current_todos))

                    # 添加到结果列表
                    task_execution_results.append({
                        "task_index": i,
                        "status": "failed",
                        "error": str(e),
                        "title": task.title
                    })

                    # 如果一个任务失败，停止执行后续任务
                    break

            # 所有任务执行完成后，更新todo状态 - 获取最新的todos数据
            current_todos = asyncio.run(load_todos())
            current_todo_index = next((idx for idx, t in enumerate(current_todos) if t.id == todo_id), None)
            
            if current_todo_index is not None:
                all_completed = all(result.get("status") == "completed" for result in task_execution_results)
                final_status = "testing" if all_completed else "pending"
                current_todos[current_todo_index].status = final_status
                asyncio.run(save_todos(current_todos))

            # 记录状态变更
            logger.info(
                f"Updated todo {todo_id} status to {final_status} after task execution")

        except Exception as e:
            logger.error(
                f"Error in task execution thread for todo {todo_id}: {str(e)}")

    # 创建并启动线程
    thread = Thread(target=run_tasks_in_thread)
    thread.daemon = True
    thread.start()

    logger.info(
        f"Started sequential task execution in background thread for todo {todo_id}")

    # 返回响应
    return ExecuteTaskResponse(
        status="success",
        task_id=todo_id,
        message=f"Executing all tasks for todo: {todo.title}",
        current_task_index=0,  # 从第一个任务开始
        event_file_id=None  # 不返回单个事件ID，因为有多个任务
    )
