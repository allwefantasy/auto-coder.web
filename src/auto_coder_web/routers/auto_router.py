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
from autocoder.events.event_manager_singleton import get_event_manager,gengerate_event_file_path,get_event_file_path
from autocoder.events import event_content as EventContentCreator
from autocoder.events.event_types import EventType
from byzerllm.utils.langutil import asyncfy_with_semaphore
from autocoder.common.global_cancel import global_cancel, CancelRequestedException 
from autocoder.common.file_checkpoint.manager import FileChangeManager
from loguru import logger
import byzerllm
# 导入聊天会话和聊天列表管理器
from auto_coder_web.common_router.chat_session_manager import read_session_name_sync
from auto_coder_web.common_router.chat_list_manager import get_chat_list_sync

router = APIRouter()

# 创建线程池
cancel_thread_pool = ThreadPoolExecutor(max_workers=5)

class AutoCommandRequest(BaseModel):
    command: str
    include_conversation_history: bool = True
    buildin_conversation_history: bool = False
    panel_id: Optional[str] = None

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
def coding_prompt(messages: List[Dict[str, Any]], query: str):
    '''        
    【历史对话】按时间顺序排列，从旧到新：
    {% for message in messages %}
    <message>
    {% if message.type == "USER" or message.type == "USER_RESPONSE" or message.metadata.path == "/agent/edit/tool/result" %}【用户】{% else %}【助手】{% endif %}    
    <content>
    {{ message.content }}
    </content>
    </message>
    {% endfor %}
    
    【当前问题】用户的最新需求如下:
    <current_query>
    {{ query }}
    </current_query>            
    '''
    # 使用消息解析器处理消息
    from auto_coder_web.agentic_message_parser import parse_messages
    processed_messages = parse_messages(messages)
    
    return {
        "messages": processed_messages,
        "query": query
    }



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
            global_cancel.register_token(event_file)         
            prompt_text = request.command

            if request.include_conversation_history:
                # 获取当前会话名称
                panel_id = request.panel_id or ""
                current_session_name = ""
                try:
                    # 使用chat_session_manager模块获取当前会话名称
                    # 使用同步版本的函数，避免在线程中使用asyncio.run
                    current_session_name = read_session_name_sync(project_path, panel_id)
                except Exception as e:                        
                    logger.error(f"Error reading current session: {str(e)}")
                    logger.exception(e)
                
                # 获取历史消息
                messages = []
                if current_session_name:
                    try:
                        # 使用chat_list_manager模块获取聊天列表内容
                        logger.info(f"Loading chat history for session: {current_session_name}")
                        # 使用同步版本的函数，避免在线程中使用asyncio.run
                        chat_data = get_chat_list_sync(project_path, current_session_name)
                        
                        # 从聊天历史中提取消息
                        for msg in chat_data.get("messages", []):                                    
                            # if msg.get("metadata",{}).get("stream_out_type","") == "/agent/edit":
                            #     messages.append(msg)
                            #     continue
                            
                            # if msg.get("type","") not in ["USER_RESPONSE","RESULT","COMPLETION"]:
                            #     continue     
                            if msg.get("contentType","") in ["token_stat"]:
                                continue                                                                
                            messages.append(msg)
                    except Exception as e:                                                       
                        logger.error(f"Error reading chat history: {str(e)}")
                        logger.exception(e) 
                                                
                if messages:
                    # 调用coding_prompt生成包含历史消息的提示
                    prompt_text = coding_prompt.prompt(messages, request.command)                                    

            # 调用auto_command_wrapper方法  
            logger.info(f"Executing auto command {file_id} with prompt: {prompt_text}")          
            wrapper.auto_command_wrapper(prompt_text, {
                "event_file_id": file_id
            })            
            # get_event_manager(event_file).write_completion(
            #     EventContentCreator.create_completion(
            #         "200", "completed", result).to_dict()
            # )
            logger.info(f"Event file id: {file_id} completed successfully")
        except Exception as e:
            logger.error(f"Error executing auto command {file_id}: {str(e)}")
            logger.exception(e)
            get_event_manager(event_file).write_error(
                EventContentCreator.create_error(error_code="500", error_message=str(e), details={}).to_dict()
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
        logger.info(f"Sending user response to event_file_id: {request.event_file_id}")
        event_file = get_event_file_path(file_id=request.event_file_id,project_path=project_path)
        logger.info(f"Event file from event_file_id: {event_file}")
        event_manager = get_event_manager(event_file)

        # 调用respond_to_user方法发送用户响应
        logger.info(f"Responding to user with event ID: {request.event_id}")
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
        logger.exception(e)
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
        task_data = request.model_dump()
        
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

    从本地文件系统读取所有保存的任务历史，返回原始JSON文件内容

    Args:
        project_path: 项目路径

    Returns:
        任务历史列表，包含完整的原始数据
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
                        # 只添加文件名作为ID (不含扩展名)
                        task_id = os.path.splitext(filename)[0]
                        # 返回完整的原始数据，只添加ID
                        task_data["id"] = task_id
                        task_files.append(task_data)
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


@router.post("/api/auto-command/cancel")
async def cancel_task(request: CancelTaskRequest, project_path: str = Depends(get_project_path)):
    """
    取消正在运行的任务
    
    Args:
        request: 包含event_file_id的请求对象
        project_path: 项目路径
        
    Returns:
        取消操作的结果
    """
    # 定义在线程中执行的取消任务函数
    def cancel_task_thread(event_file_id: str, project_path: str):
        try:                        
            # 获取事件文件路径和事件管理器
            event_file = get_event_file_path(file_id=event_file_id, project_path=project_path)
            global_cancel.set(token=event_file)
            event_manager = get_event_manager(event_file)
            file_change_manager = FileChangeManager(project_dir=project_path,
            backup_dir=os.path.join(project_path,".auto-coder","checkpoint"),
            store_dir=os.path.join(project_path,".auto-coder","checkpoint_store"),
            max_history=50)
            undo_result = file_change_manager.undo_change_group(group_id=event_file)
            if not undo_result.success:
                logger.error(f"Error in undo change group: {undo_result.errors}")
                raise Exception(f"Error in undo change group: {undo_result.errors}")
            else:
                logger.info(f"Undo change group {event_file} successfully {undo_result.restored_files}")
            
            # 向事件流写入取消事件
            event_manager.write_error(
                EventContentCreator.create_error(
                    error_code="USER_CANCELLED", 
                    error_message="Task was cancelled by the user",
                    details={"message": "Task was cancelled by the user"}
                ).to_dict()
            )
            
            logger.info(f"Task {event_file_id} cancelled by user")
            return True
        except Exception as e:
            logger.error(f"Error in cancel thread for task {event_file_id}: {str(e)}")
            return False
    
    try:
        # 在线程池中执行取消操作并获取 Future 对象
        future = cancel_thread_pool.submit(
            cancel_task_thread, 
            request.event_file_id, 
            project_path
        )
        
        # 使用 asyncio 来等待线程完成
        result = await asyncio.to_thread(future.result)
        
        if result:
            # 线程成功完成
            return {
                "status": "success",
                "message": "Task successfully cancelled",
                "event_file_id": request.event_file_id
            }
        else:
            # 线程返回了 False，表示出现了错误
            raise HTTPException(
                status_code=500, 
                detail=f"Failed to cancel task {request.event_file_id}"
            )
    except Exception as e:
        logger.error(f"Error cancelling task: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Failed to cancel task: {str(e)}")
