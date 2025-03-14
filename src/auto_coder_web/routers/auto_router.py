import logging
import os
import json
from fastapi import APIRouter, HTTPException, Request, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Dict, Any
from auto_coder_web.auto_coder_runner_wrapper import AutoCoderRunnerWrapper
from autocoder.events.event_manager_singleton import get_event_manager
from autocoder.events import event_content as EventContentCreator
from loguru import logger
router = APIRouter()


class AutoCommandRequest(BaseModel):
    command: str

# 获取当前应用实例的依赖函数
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
    """
    try:
        # 创建AutoCoderRunnerWrapper实例，使用从应用上下文获取的项目路径
        wrapper = AutoCoderRunnerWrapper(project_path)
        
        # 调用auto_command_wrapper方法
        result = wrapper.auto_command_wrapper(request.command)        
        get_event_manager().write_result(
            EventContentCreator.create_completion(200,"completed",result).to_dict()
        )
        
        return "success"
    except Exception as e:
        logger.error(f"Error executing auto command: {str(e)}")
        get_event_manager().write_result(
            EventContentCreator.create_error(500,"error",str(e)).to_dict()
        )
        raise HTTPException(status_code=500, detail=f"Failed to execute auto command: {str(e)}")

@router.get("/api/auto-command/events")
async def poll_auto_command_events(project_path: str = Depends(get_project_path)):
    async def event_generator():
        event_manager = get_event_manager()
        running = True
        while running:
            try:
                events = event_manager.read_events(block=True)
                for event in events:
                    # Convert event to JSON string
                    event_json = event.to_json()
                    # Format as SSE
                    yield f"data: {event_json}\n\n"
            except Exception as e:
                logger.error(f"Error in SSE stream: {str(e)}")
                yield f"data: {{\"error\": \"{str(e)}\"}}\n\n"
                # Optional: break the loop on error
                # running = False
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )
