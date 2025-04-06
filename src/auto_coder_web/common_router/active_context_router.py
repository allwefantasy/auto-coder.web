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
    获取最新的50条活动上下文任务，按开始时间降序排列。
    如果发现有超过10分钟还未结束（running/queued）的任务，自动标记为failed。
    """
    try:
        import datetime

        manager = get_active_context_manager()
        all_tasks_raw = manager.get_all_tasks()

        # 排序，降序，优先使用 start_time，没有则用 completion_time，没有则不排序
        def get_sort_time(t):
            st = t.get('start_time')
            ct = t.get('completion_time')
            if st:
                if isinstance(st, str):
                    try:
                        return datetime.datetime.strptime(st, "%Y-%m-%d %H:%M:%S")
                    except:
                        return st
                else:
                    return st
            elif ct:
                if isinstance(ct, str):
                    try:
                        return datetime.datetime.strptime(ct, "%Y-%m-%d %H:%M:%S")
                    except:
                        return ct
                else:
                    return ct
            else:
                return 0

        sorted_tasks = sorted(all_tasks_raw, key=get_sort_time, reverse=True)

        latest_tasks = sorted_tasks[:50]

        now = datetime.datetime.now()

        # 检查是否有超过10分钟还未完成的任务，将其状态置为failed
        for t in latest_tasks:
            status = t.get("status", "")
            if status in ("running", "queued"):
                st = t.get("start_time")
                start_time_dt = None
                if isinstance(st, str):
                    try:
                        start_time_dt = datetime.datetime.strptime(st, "%Y-%m-%d %H:%M:%S")
                    except:
                        start_time_dt = None
                elif isinstance(st, datetime.datetime):
                    start_time_dt = st
                else:
                    start_time_dt = None

                if start_time_dt:
                    elapsed = now - start_time_dt
                    if elapsed.total_seconds() > 600:  # 超过10分钟
                        t["status"] = "failed"
                        t["error"] = "Timeout: Task exceeded 10 minutes and was automatically marked as failed."

        tasks = []
        for t in latest_tasks:
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