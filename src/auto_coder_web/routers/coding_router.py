import asyncio
import json
import os
from contextlib import contextmanager
from threading import Thread
from concurrent.futures import ThreadPoolExecutor
from fastapi import APIRouter, HTTPException, Request, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Dict, Any, Optional, List
from auto_coder_web.auto_coder_runner_wrapper import AutoCoderRunnerWrapper
from autocoder.events.event_manager_singleton import get_event_manager, gengerate_event_file_path, get_event_file_path
from autocoder.events import event_content as EventContentCreator
from autocoder.events.event_types import EventType
from byzerllm.utils.langutil import asyncfy_with_semaphore
from autocoder.common.global_cancel import global_cancel, CancelRequestedException 
from loguru import logger
import byzerllm

router = APIRouter()

# 创建线程池
cancel_thread_pool = ThreadPoolExecutor(max_workers=5)

class CodingCommandRequest(BaseModel):
    command: str

class EventPollRequest(BaseModel):
    event_file_id: str    

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

class CancelTaskRequest(BaseModel):
    event_file_id: str

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

@byzerllm.prompt()
def coding_prompt(messages: List[Dict[str, Any]], request: CodingCommandRequest):
    '''
    下面是我们已经产生的一个消息列表,其中 USER_RESPONSE 表示用户的输入，RESULT 你的输出：
    <messages>
    {% for message in messages %}
    <message>
    <type>{{ message.type }}</type>
    <content>{{ message.content }}</content>
    </message>
    {% endfor %}
    </messages>
    
    下面是用户的最新需求：
    <request>
    {{ request.command }}    
    </request>
    '''

@router.post("/api/coding-command")
async def coding_command(request: CodingCommandRequest, project_path: str = Depends(get_project_path)):
    """
    执行coding命令

    通过AutoCoderRunnerWrapper调用coding方法，执行指定的命令
    在单独的线程中运行，并返回一个唯一的UUID
    """ 
    event_file, file_id = gengerate_event_file_path()       
    # 定义在线程中运行的函数
    def run_command_in_thread():        
        try:
            # 创建AutoCoderRunnerWrapper实例，使用从应用上下文获取的项目路径
            wrapper = AutoCoderRunnerWrapper(project_path)
            wrapper.configure_wrapper(f"event_file:{event_file}")

            # 获取当前会话名称
            current_session_file = os.path.join(project_path, ".auto-coder", "auto-coder.web", "current-session.json")
            current_session_name = ""
            if os.path.exists(current_session_file):
                try:
                    with open(current_session_file, 'r') as f:
                        session_data = json.load(f)
                        current_session_name = session_data.get("session_name", "")
                except Exception as e:
                    logger.error(f"Error reading current session: {str(e)}")
            
            # 获取历史消息
            messages = []
            if current_session_name:
                chat_list_file = os.path.join(project_path, ".auto-coder", "auto-coder.web", "chat-lists", f"{current_session_name}.json")
                if os.path.exists(chat_list_file):
                    try:
                        with open(chat_list_file, 'r', encoding="utf-8") as f:
                            chat_data = json.load(f)
                            # 从聊天历史中提取消息
                            for msg in chat_data.get("messages", []):
                                # 只保留用户和中间结果信息
                                if msg.get("type","") not in ["USER_RESPONSE","RESULT"]:
                                    continue     

                                if msg.get("contentType","") in ["token_stat"]:
                                    continue                            
                                
                                messages.append(msg)
                    except Exception as e:
                        logger.error(f"Error reading chat history: {str(e)}")
            
            # 构建提示信息
            prompt_text = ""
            if messages:
                # 调用coding_prompt生成包含历史消息的提示
                prompt_text = prompt_text + coding_prompt.prompt(messages, request)
                logger.info(prompt_text)
            
            # 调用coding方法，如果有历史消息，传递包含历史的提示
            if prompt_text:
                logger.info(f"Using conversation history with {len(messages)} messages for coding command")
                result = wrapper.coding_wapper(prompt_text)
            else:
                # 如果没有历史消息或获取失败，直接传递原始命令
                logger.info("Using original command without conversation history")
                result = wrapper.coding_wapper(prompt_text + request.command)            
            
            get_event_manager(event_file).write_completion(
                EventContentCreator.create_completion(
                    "200", "completed", result).to_dict()
            )
            logger.info(f"Event file id: {file_id} completed successfully")
        except Exception as e:
            logger.error(f"Error executing coding command {file_id}: {str(e)}")
            get_event_manager(event_file).write_error(
                EventContentCreator.create_error("500", "error", str(e)).to_dict()
            )
    
    # 创建并启动线程
    thread = Thread(target=run_command_in_thread)
    thread.daemon = True  # 设置为守护线程，这样当主程序退出时，线程也会退出
    thread.start()
    
    logger.info(f"Started coding command {file_id} in background thread")
    return {"event_file_id": file_id}

@router.get("/api/coding-command/events")
async def poll_coding_command_events(event_file_id: str, project_path: str = Depends(get_project_path)):
    async def event_stream():
        event_file = get_event_file_path(event_file_id, project_path)
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

@router.post("/api/coding-command/response")
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
        event_file = get_event_file_path(file_id=request.event_file_id, project_path=project_path)
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

@router.post("/api/coding-command/save-history")
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
        
        # 过滤掉系统消息和空消息
        filtered_messages = []
        for msg in request.messages:
            # 跳过系统消息和空消息
            if msg.get("type") == "SYSTEM" or not msg.get("content"):
                continue
            # 跳过token统计消息
            if msg.get("type") == "TOKEN_STAT":
                continue
            filtered_messages.append(msg)
            
        task_data = {
            "query": request.query,
            "event_file_id": request.event_file_id,
            "messages": filtered_messages,
            "status": request.status,
            "timestamp": request.timestamp,
            "type": "coding"  # 添加类型标识
        }
        
        with open(task_file, "w", encoding="utf-8") as f:
            json.dump(task_data, f, ensure_ascii=False, indent=2)
            
        return {"status": "success", "message": "Task history saved successfully"}
    except Exception as e:
        logger.error(f"Error saving task history: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Failed to save task history: {str(e)}")

@router.get("/api/coding-command/history")
async def get_task_history(project_path: str = Depends(get_project_path)):
    """
    获取任务历史列表

    从本地文件系统读取所有保存的任务历史，返回原始JSON文件内容

    Args:
        project_path: 项目路径

    Returns:
        任务历史列表，包含完整的原始数据
    """
    try:
        task_dir = ensure_task_dir(project_path)
        task_files = [f for f in os.listdir(task_dir) if f.endswith(".json")]
        
        tasks = []
        for file_name in task_files:
            file_path = os.path.join(task_dir, file_name)
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    task_data = json.load(f)
                    # 只包含类型为coding的任务
                    if task_data.get("type") == "coding":
                        tasks.append(task_data)
            except Exception as e:
                logger.error(f"Error reading task file {file_name}: {str(e)}")
                
        # 按时间戳排序，最新的在前面
        tasks.sort(key=lambda x: x.get("timestamp", 0), reverse=True)
        
        return {"tasks": tasks}
    except Exception as e:
        logger.error(f"Error getting task history: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Failed to get task history: {str(e)}")

@router.get("/api/coding-command/task/{task_id}")
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
            raise HTTPException(status_code=404, detail="Task not found")
            
        with open(task_file, "r", encoding="utf-8") as f:
            task_data = json.load(f)
            
        return task_data
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting task detail: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Failed to get task detail: {str(e)}")

@router.post("/api/coding-command/cancel")
async def cancel_task(request: CancelTaskRequest, project_path: str = Depends(get_project_path)):
    """
    取消正在运行的任务
    
    Args:
        request: 包含event_file_id的请求对象
        project_path: 项目路径
        
    Returns:
        取消操作的结果
    """
    try:
        event_file = get_event_file_path(file_id=request.event_file_id, project_path=project_path)
        
        def cancel_in_thread():
            try:
                # 设置全局取消标志
                global_cancel.set_cancel(request.event_file_id)
                
                # 获取事件管理器
                event_manager = get_event_manager(event_file)
                
                # 写入取消事件
                event_manager.write_error(
                    EventContentCreator.create_error(
                        "499", "cancelled", "Task cancelled by user").to_dict()
                )
                
                logger.info(f"Task {request.event_file_id} cancelled successfully")
            except Exception as e:
                logger.error(f"Error cancelling task: {str(e)}")
        
        # 在线程池中执行取消操作
        cancel_thread_pool.submit(cancel_in_thread)
        
        return {"status": "success", "message": "Cancel request sent"}
    except Exception as e:
        logger.error(f"Error sending cancel request: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Failed to send cancel request: {str(e)}")
