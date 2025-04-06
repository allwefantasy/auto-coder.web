from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from autocoder.memory.active_context_manager import ActiveContextManager
from autocoder.auto_coder_runner import get_final_config
from autocoder.common.action_yml_file_manager import ActionYmlFileManager
import threading

router = APIRouter()

class TaskInfo(BaseModel):
    task_id: str = Field(..., description="任务ID")
    status: str = Field(..., description="任务状态")
    start_time: Optional[str] = Field(None, description="任务开始时间")
    completion_time: Optional[str] = Field(None, description="任务完成时间")
    file_name: Optional[str] = Field(None, description="关联的文件名")
    total_tokens: int = Field(0, description="总token数")
    input_tokens: int = Field(0, description="输入token数")
    output_tokens: int = Field(0, description="输出token数")
    cost: float = Field(0.0, description="费用")
    processed_dirs: Optional[List[str]] = Field(None, description="已处理的目录列表")
    error: Optional[str] = Field(None, description="错误信息")

class TaskListResponse(BaseModel):
    tasks: List[TaskInfo] = Field(default_factory=list, description="任务列表")


_active_context_manager_lock = threading.Lock()
_active_context_manager_instance: Optional[ActiveContextManager] = None

def get_active_context_manager() -> ActiveContextManager:
    """
    获取ActiveContextManager单例实例
    """
    global _active_context_manager_instance
    with _active_context_manager_lock:
        if _active_context_manager_instance is None:
            args = get_final_config()
            llm = None
            try:
                from autocoder.utils.llms import get_single_llm
                llm = get_single_llm(args.model, product_mode=args.product_mode)
            except Exception:
                llm = None
            _active_context_manager_instance = ActiveContextManager(llm, args.source_dir)
        return _active_context_manager_instance

@router.get("/api/active-context/tasks", response_model=TaskListResponse)
async def list_active_context_tasks():
    """
    获取所有活动上下文任务的列表
    """
    try:
        manager = get_active_context_manager()
        all_tasks_raw = manager.get_all_tasks()
        tasks = []
        for t in all_tasks_raw:
            # 处理时间格式
            start_time = t.get('start_time')
            if isinstance(start_time, str):
                start_time_str = start_time
            elif start_time:
                try:
                    start_time_str = start_time.strftime("%Y-%m-%d %H:%M:%S")
                except:
                    start_time_str = str(start_time)
            else:
                start_time_str = None
            
            completion_time = t.get('completion_time')
            if isinstance(completion_time, str):
                completion_time_str = completion_time
            elif completion_time:
                try:
                    completion_time_str = completion_time.strftime("%Y-%m-%d %H:%M:%S")
                except:
                    completion_time_str = str(completion_time)
            else:
                completion_time_str = None
            
            task_info = TaskInfo(
                task_id = t.get("task_id", ""),
                status = t.get("status", ""),
                start_time = start_time_str,
                completion_time = completion_time_str,
                file_name = t.get("file_name", ""),
                total_tokens = t.get("total_tokens", 0),
                input_tokens = t.get("input_tokens", 0),
                output_tokens = t.get("output_tokens", 0),
                cost = t.get("cost", 0.0),
                processed_dirs = t.get("processed_dirs", []),
                error = t.get("error", None)
            )
            tasks.append(task_info)
        return TaskListResponse(tasks=tasks)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get active context tasks: {str(e)}")