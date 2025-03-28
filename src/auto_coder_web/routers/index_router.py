import os
import json
from threading import Thread
import time as import_time
from fastapi import APIRouter, HTTPException, Request, Depends
from pydantic import BaseModel
from typing import Optional, Any, Dict, Union, List
from auto_coder_web.auto_coder_runner_wrapper import AutoCoderRunnerWrapper
from loguru import logger

# 定义Pydantic模型
class IndexBuildResponse(BaseModel):
    status: str
    message: Optional[str] = None

class IndexStatusCompleted(BaseModel):
    status: str = "completed"
    result: Any
    timestamp: float

class IndexStatusError(BaseModel):
    status: str = "error"
    error: str
    timestamp: float

class IndexStatusUnknown(BaseModel):
    status: str = "unknown"
    message: str = "No index build status available"

class IndexStatusRunning(BaseModel):
    status: str = "running"
    message: str = "Index build in progress"
    timestamp: float

class SourceCode(BaseModel):
    module_name: str
    source_code: str
    tag: str = ""
    tokens: int = -1
    metadata: Dict[str, Any] = {}

class SourceCodeListResponse(BaseModel):
    sources: List[SourceCode]

# 组合类型
IndexStatus = Union[IndexStatusCompleted, IndexStatusError, IndexStatusUnknown, IndexStatusRunning]

router = APIRouter()


async def get_project_path(request: Request) -> str:
    """                                                                                                                                                                                                
    从FastAPI请求上下文中获取项目路径                                                                                                                                                                  
    """
    return request.app.state.project_path


@router.post("/api/index/build")
async def build_index(project_path: str = Depends(get_project_path)):
    """                                                                                                                                                                                                
    构建索引                                                                                                                                                                                           

    在单独的线程中运行索引构建，避免阻塞主线程                                                                                                                                                         

    Args:                                                                                                                                                                                              
        project_path: 项目路径                                                                                                                                                                         

    Returns:                                                                                                                                                                                           
        构建索引的状态信息                                                                                                                                                                             
    """

    # 定义在线程中运行的函数
    def run_index_build_in_thread():
        try:
            # 创建AutoCoderRunnerWrapper实例
            wrapper = AutoCoderRunnerWrapper(project_path)

            # 调用build_index_wrapper方法构建索引
            result = wrapper.build_index_wrapper()

            logger.info(f"Index build completed successfully: {result}")

            # 可以选择将结果保存到文件中，以便前端查询
            status_file = os.path.join(
                project_path, ".auto-coder", "auto-coder.web", "index-status.json")
            os.makedirs(os.path.dirname(status_file), exist_ok=True)

            # 使用Pydantic模型创建状态数据
            status_data = IndexStatusCompleted(
                result=result,
                timestamp=import_time.time()
            )

            with open(status_file, 'w') as f:
                f.write(status_data.model_dump_json())

        except Exception as e:
            logger.error(f"Error building index: {str(e)}")

            # 保存错误信息
            status_file = os.path.join(
                project_path, ".auto-coder", "auto-coder.web", "index-status.json")
            os.makedirs(os.path.dirname(status_file), exist_ok=True)

            # 使用Pydantic模型创建错误状态数据
            status_data = IndexStatusError(
                error=str(e),
                timestamp=import_time.time()
            )

            with open(status_file, 'w') as f:
                f.write(status_data.model_dump_json())

    try:
        # 先更新状态为running
        status_file = os.path.join(
            project_path, ".auto-coder", "auto-coder.web", "index-status.json")
        os.makedirs(os.path.dirname(status_file), exist_ok=True)
        
        status_data = IndexStatusRunning(
            message="Index build started",
            timestamp=import_time.time()
        )
        
        with open(status_file, 'w') as f:
            f.write(status_data.model_dump_json())

        # 创建并启动线程
        thread = Thread(target=run_index_build_in_thread)
        thread.daemon = True  # 设置为守护线程，这样当主程序退出时，线程也会退出
        thread.start()

        logger.info("Started index build in background thread")
        return IndexBuildResponse(
            status="started", 
            message="Index build started in background"
        )
    except Exception as e:
        logger.error(f"Error starting index build thread: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Failed to start index build: {str(e)}")


@router.get("/api/index/status")
async def get_index_status(project_path: str = Depends(get_project_path)):
    """                                                                                                                                                                                                
    获取索引构建状态                                                                                                                                                                                   

    从状态文件中读取索引构建的最新状态                                                                                                                                                                 

    Args:                                                                                                                                                                                              
        project_path: 项目路径                                                                                                                                                                         

    Returns:                                                                                                                                                                                           
        索引构建的状态信息                                                                                                                                                                             
    """
    try:
        status_file = os.path.join(
            project_path, ".auto-coder", "auto-coder.web", "index-status.json")

        if not os.path.exists(status_file):
            return IndexStatusUnknown()

        with open(status_file, 'r') as f:
            status_data_dict = json.load(f)
        
        # 根据状态类型返回相应的Pydantic模型
        if status_data_dict["status"] == "completed":
            return IndexStatusCompleted(**status_data_dict)
        elif status_data_dict["status"] == "error":
            return IndexStatusError(**status_data_dict)
        else:
            return IndexStatusUnknown()
    except Exception as e:
        logger.error(f"Error getting index status: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Failed to get index status: {str(e)}")


@router.get("/api/index/query", response_model=SourceCodeListResponse)
async def query_index(query: str, project_path: str = Depends(get_project_path)):
    """
    智能搜索项目文件
    
    使用索引查询相关文件
    
    Args:
        query: 搜索查询
        project_path: 项目路径
        
    Returns:
        匹配的源代码文件列表
    """
    try:
        wrapper = AutoCoderRunnerWrapper(project_path)
        result = wrapper.query_index_wrapper(query)
        
        # 将结果转换为SourceCodeListResponse格式
        if hasattr(result, 'sources'):
            sources = [
                SourceCode(
                    module_name=os.path.relpath(source.module_name, project_path),
                    source_code="",
                    tag=source.tag if hasattr(source, 'tag') else "",
                    tokens=source.tokens if hasattr(source, 'tokens') else -1,
                    metadata=source.metadata if hasattr(source, 'metadata') else {}
                )
                for source in result.sources
            ]
            return SourceCodeListResponse(sources=sources)
        else:
            # 如果结果不是预期的格式，返回空列表
            logger.warning(f"Unexpected result format from query_index_wrapper: {type(result)}")
            return SourceCodeListResponse(sources=[])
            
    except Exception as e:
        logger.error(f"Error querying index: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Failed to query index: {str(e)}")