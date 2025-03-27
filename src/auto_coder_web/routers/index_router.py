import os
import json
from threading import Thread
import time as import_time
from fastapi import APIRouter, HTTPException, Request, Depends
from auto_coder_web.auto_coder_runner_wrapper import AutoCoderRunnerWrapper
from loguru import logger

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

            with open(status_file, 'w') as f:
                json.dump({
                    "status": "completed",
                    "result": result,
                    "timestamp": import_time.time()
                }, f)

        except Exception as e:
            logger.error(f"Error building index: {str(e)}")

            # 保存错误信息
            status_file = os.path.join(
                project_path, ".auto-coder", "auto-coder.web", "index-status.json")
            os.makedirs(os.path.dirname(status_file), exist_ok=True)

            with open(status_file, 'w') as f:
                json.dump({
                    "status": "error",
                    "error": str(e),
                    "timestamp": import_time.time()
                }, f)

    try:
        # 创建并启动线程
        thread = Thread(target=run_index_build_in_thread)
        thread.daemon = True  # 设置为守护线程，这样当主程序退出时，线程也会退出
        thread.start()

        logger.info("Started index build in background thread")
        return {"status": "started", "message": "Index build started in background"}
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
            return {"status": "unknown", "message": "No index build status available"}

        with open(status_file, 'r') as f:
            status_data = json.load(f)

        return status_data
    except Exception as e:
        logger.error(f"Error getting index status: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Failed to get index status: {str(e)}")
