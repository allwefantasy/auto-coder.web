import logging
import os
import json
import asyncio
import time
import uuid
import sys
import io
from contextlib import contextmanager
from threading import Thread
from fastapi import APIRouter, HTTPException, Request, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Dict, Any, Optional
from auto_coder_web.auto_coder_runner_wrapper import AutoCoderRunnerWrapper
from autocoder.events.event_manager_singleton import get_event_manager
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


async def get_project_path(request: Request) -> str:
    """
    从FastAPI请求上下文中获取项目路径
    """
    return request.app.state.project_path


@router.post("/api/auto-command")
async def auto_command(request: AutoCommandRequest, project_path: str = Depends(get_project_path)):
    """
    执行auto_command命令

    通过AutoCoderRunnerWrapper调用auto_command_wrapper方法，执行指定的命令
    在单独的线程中运行，并返回一个唯一的UUID
    """
    # 生成唯一的UUID
    event_file_id = str(uuid.uuid4())
    
    # 定义在线程中运行的函数
    def run_command_in_thread():
        event_file = os.path.join(project_path,".auto-coder","auto-coder.web","events",f"{event_file_id}.json")
        try:
            # 创建AutoCoderRunnerWrapper实例，使用从应用上下文获取的项目路径
            wrapper = AutoCoderRunnerWrapper(project_path)

            # 调用auto_command_wrapper方法
            result = wrapper.auto_command_wrapper(request.command, {
                "event_file_id": event_file_id
            })            
            get_event_manager(event_file).write_completion(
                EventContentCreator.create_completion(
                    "200", "completed", result).to_dict()
            )
            logger.info(f"Event file id: {event_file_id} completed successfully")
        except Exception as e:
            logger.error(f"Error executing auto command {event_file_id}: {str(e)}")
            get_event_manager(event_file).write_error(
                EventContentCreator.create_error("500", "error", str(e)).to_dict()
            )
    
    # 创建并启动线程
    thread = Thread(target=run_command_in_thread)
    thread.daemon = True  # 设置为守护线程，这样当主程序退出时，线程也会退出
    thread.start()
    
    logger.info(f"Started command {event_file_id} in background thread")
    return {"event_file_id": event_file_id}


@router.get("/api/auto-command/events")
async def poll_auto_command_events(event_file_id: str, project_path: str = Depends(get_project_path)):
    async def event_stream():
        event_file = os.path.join(project_path,".auto-coder","auto-coder.web","events",f"{event_file_id}.json")
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
        event_file = os.path.join(project_path,".auto-coder","auto-coder.web","events",f"{request.event_file_id}.json")
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
