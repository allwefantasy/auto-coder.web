import asyncio
import json
import os
from contextlib import contextmanager
from threading import Thread
from fastapi import APIRouter, HTTPException, Request, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Dict, Any, Optional, List
from auto_coder_web.auto_coder_runner_wrapper import AutoCoderRunnerWrapper
from autocoder.events.event_manager_singleton import get_event_manager,gengerate_event_file_path,get_event_file_path
from autocoder.events import event_content as EventContentCreator
from autocoder.events.event_types import EventType
from byzerllm.utils.langutil import asyncfy_with_semaphore
from loguru import logger
router = APIRouter()


class AutoCommandRequest(BaseModel):
    command: str

class EventPollRequest(BaseModel):
    event_file_id:str    


class UserResponseRequest(BaseModel):
    event_id: str
    event_file_id: str
    response: str


class TaskHistoryRequest(BaseModel):
    query: str
    event_file_id: str
    messages: List[Dict[str, Any]]
    status: str
    timestamp: int


async def get_project_path(request: Request) -> str:
    """
    从FastAPI请求上下文中获取项目路径
    """
    return request.app.state.project_path


def ensure_task_dir(project_path: str) -> str:
    """确保任务历史目录存在"""
    task_dir = os.path.join(project_path, ".auto-coder", "auto-coder.web", "tasks")
    os.makedirs(task_dir, exist_ok=True)
    return task_dir


@router.post("/api/auto-command")
async def auto_command(request: AutoCommandRequest, project_path: str = Depends(get_project_path)):
    """
    执行auto_command命令

    通过AutoCoderRunnerWrapper调用auto_command_wrapper方法，执行指定的命令
    在单独的线程中运行，并返回一个唯一的UUID
    """ 
    event_file,file_id = gengerate_event_file_path()       
    # 定义在线程中运行的函数
    def run_command_in_thread():        
        try:
            # 创建AutoCoderRunnerWrapper实例，使用从应用上下文获取的项目路径
            wrapper = AutoCoderRunnerWrapper(project_path)
            wrapper.configure_wrapper(f"event_file:{event_file}")

            # 调用auto_command_wrapper方法
            result = wrapper.auto_command_wrapper(request.command, {
                "event_file_id": file_id
            })            
            get_event_manager(event_file).write_completion(
                EventContentCreator.create_completion(
                    "200", "completed", result).to_dict()
            )
            logger.info(f"Event file id: {file_id} completed successfully")
        except Exception as e:
            logger.error(f"Error executing auto command {file_id}: {str(e)}")
            get_event_manager(event_file).write_error(
                EventContentCreator.create_error("500", "error", str(e)).to_dict()
            )
    
    # 创建并启动线程
    thread = Thread(target=run_command_in_thread)
    thread.daemon = True  # 设置为守护线程，这样当主程序退出时，线程也会退出
    thread.start()
    
    logger.info(f"Started command {file_id} in background thread")
    return {"event_file_id": file_id}


@router.get("/api/auto-command/events")
async def poll_auto_command_events(event_file_id: str, project_path: str = Depends(get_project_path)):
    async def event_stream():
        event_file = get_event_file_path(event_file_id,project_path)
        event_manager = get_event_manager(event_file)           
        while True:                                 
            try:                
                events = await asyncio.to_thread(event_manager.read_events, block=False)                
                
                if not events:
                    await asyncio.sleep(0.1)  # 减少休眠时间，更频繁地检查
                    continue    
                
                current_event = None                
                for event in events:
                    current_event = event
                    # Convert event to JSON string
                    event_json = event.to_json()
                    # Format as SSE
                    yield f"data: {event_json}\n\n"                    
                    
                # 防止current_event为None导致的错误
                if current_event is not None:
                    if current_event.event_type == EventType.ERROR:
                        logger.info("Breaking loop due to ERROR event")
                        break

                    if current_event.event_type == EventType.COMPLETION:
                        logger.info("Breaking loop due to COMPLETION event")
                        break
            except Exception as e:
                logger.error(f"Error in SSE stream: {str(e)}")
                yield f"data: {{\"error\": \"{str(e)}\"}}\n\n"                
                break

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "Content-Type": "text/event-stream",
            "X-Accel-Buffering": "no",
            "Transfer-Encoding": "chunked",
        },
    )


@router.post("/api/auto-command/response")
async def response_user(request: UserResponseRequest, project_path: str = Depends(get_project_path)):
    """
    响应用户询问

    接收用户对ASK_USER事件的回复，并将其传递给事件管理器

    Args:
        request: 包含event_id和response的请求对象
        project_path: 项目路径

    Returns:
        响应结果
    """
    try:
        # 获取事件管理器
        event_file = get_event_file_path(file_id=request.event_file_id,project_path=project_path)
        event_manager = get_event_manager(event_file)

        # 调用respond_to_user方法发送用户响应
        response_event = event_manager.respond_to_user(
            request.event_id, request.response)

        # 返回成功响应
        return {
            "status": "success",
            "message": "Response sent successfully",
            "event_id": response_event.event_id
        }
    except Exception as e:
        logger.error(f"Error sending user response: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Failed to send user response: {str(e)}")


@router.post("/api/auto-command/save-history")
async def save_task_history(request: TaskHistoryRequest, project_path: str = Depends(get_project_path)):
    """
    保存任务历史

    将任务的查询、消息历史和事件文件ID保存到本地文件系统

    Args:
        request: 包含任务信息的请求对象
        project_path: 项目路径

    Returns:
        保存结果
    """
    try:
        task_dir = ensure_task_dir(project_path)
        task_file = os.path.join(task_dir, f"{request.event_file_id}.json")
        
        # 准备要保存的数据
        task_data = {
            "query": request.query,
            "event_file_id": request.event_file_id,
            "messages": request.messages,
            "status": request.status,
            "timestamp": request.timestamp
        }
        
        # 写入文件
        with open(task_file, 'w', encoding='utf-8') as f:
            json.dump(task_data, f, ensure_ascii=False, indent=2)
        
        return {
            "status": "success",
            "message": "Task history saved successfully",
            "task_id": request.event_file_id
        }
    except Exception as e:
        logger.error(f"Error saving task history: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Failed to save task history: {str(e)}")


@router.get("/api/auto-command/history")
async def get_task_history(project_path: str = Depends(get_project_path)):
    """
    获取任务历史列表

    从本地文件系统读取所有保存的任务历史

    Args:
        project_path: 项目路径

    Returns:
        任务历史列表
    """
    try:
        task_dir = ensure_task_dir(project_path)
        task_files = []
        
        # 扫描目录下所有json文件
        for filename in os.listdir(task_dir):
            if filename.endswith('.json'):
                file_path = os.path.join(task_dir, filename)
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        task_data = json.load(f)
                        # 添加文件名作为ID (不含扩展名)
                        task_id = os.path.splitext(filename)[0]
                        task_summary = {
                            "id": task_id,
                            "query": task_data.get("query", ""),
                            "status": task_data.get("status", "unknown"),
                            "timestamp": task_data.get("timestamp", 0),
                            # 可以选择性地包含简短的消息摘要
                            "message_count": len(task_data.get("messages", []))
                        }
                        task_files.append(task_summary)
                except Exception as e:
                    logger.error(f"Error reading task file {filename}: {str(e)}")
        
        # 按时间戳排序，最新的在前
        task_files.sort(key=lambda x: x.get("timestamp", 0), reverse=True)
        
        return {"tasks": task_files}
    except Exception as e:
        logger.error(f"Error getting task history: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Failed to get task history: {str(e)}")


@router.get("/api/auto-command/history/{task_id}")
async def get_task_detail(task_id: str, project_path: str = Depends(get_project_path)):
    """
    获取特定任务的详细信息

    Args:
        task_id: 任务ID (event_file_id)
        project_path: 项目路径

    Returns:
        任务详细信息
    """
    try:
        task_dir = ensure_task_dir(project_path)
        task_file = os.path.join(task_dir, f"{task_id}.json")
        
        if not os.path.exists(task_file):
            raise HTTPException(status_code=404, detail=f"Task {task_id} not found")
        
        with open(task_file, 'r', encoding='utf-8') as f:
            task_data = json.load(f)
        
        return task_data
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting task detail for {task_id}: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Failed to get task detail: {str(e)}")
