import os
import re
import asyncio
from datetime import datetime
from typing import Dict, List, Optional, Any
from concurrent.futures import ThreadPoolExecutor
import functools

from fastapi import APIRouter, HTTPException, Request, Depends, Query
from pydantic import BaseModel
from loguru import logger
import git
from git import Repo, GitCommandError
from loguru import logger

# 导入获取事件和action文件的相关模块
from autocoder.events.event_manager_singleton import get_event_manager, get_event_file_path
from autocoder.events.event_types import EventType
from autocoder.common.action_yml_file_manager import ActionYmlFileManager

router = APIRouter()

# 创建线程池
thread_pool = ThreadPoolExecutor(max_workers=4)


class Query(BaseModel):
    query: str
    timestamp: Optional[str] = None
    response: Optional[str] = None
    urls: Optional[List[str]] = None
    file_number: int
    is_reverted: bool = False


class HistoryResponse(BaseModel):
    success: bool
    message: Optional[str] = None
    queries: Optional[List[Query]] = None


class DiffResponse(BaseModel):
    success: bool
    message: Optional[str] = None
    diff: Optional[str] = None
    file_changes: Optional[List[Dict[str, str]]] = None


class FileDiffResponse(BaseModel):
    success: bool
    message: Optional[str] = None
    file_diff: Optional[Dict[str, str]] = None


async def get_project_path(request: Request) -> str:
    """
    从FastAPI请求上下文中获取项目路径
    """
    return request.app.state.project_path


def get_repo(project_path: str) -> Repo:
    """
    获取Git仓库对象
    """
    try:
        return Repo(project_path)
    except (git.NoSuchPathError, git.InvalidGitRepositoryError) as e:
        logger.error(f"Git repository error: {str(e)}")
        raise HTTPException(
            status_code=404, 
            detail="No Git repository found in the project path"
        )


@router.get("/api/history/validate-and-load", response_model=HistoryResponse)
async def validate_and_load_history(
    project_path: str = Depends(get_project_path)
):
    """
    验证并加载历史记录
    
    Args:
        project_path: 项目路径
        
    Returns:
        历史记录查询列表
    """
    # 定义在线程中执行的函数
    def load_history_task(project_path, max_history_count=10):
        try:
            # 过滤出聊天动作事件
            action_manager = ActionYmlFileManager(project_path)
            chat_action_files = action_manager.get_action_files(limit=max_history_count)
            
            # 获取Git仓库，用于检查提交是否被撤销
            repo = get_repo(project_path)
            
            # 查找所有撤销提交
            reverted_commits = {}

            commit_inter_count = 0
            try:
                # 遍历所有提交查找撤销提交
                for commit in repo.iter_commits():
                    message = commit.message.strip()
                    if message.startswith("<revert>"):
                        # 尝试从撤销提交消息中提取原始提交哈希值
                        # <revert>原始消息\n原始提交哈希
                        lines = message.split('\n')
                        if len(lines) > 1:
                            original_hash = lines[-1].strip()
                            reverted_commits[original_hash] = True
                            # logger.info(f"找到撤销提交 {commit.hexsha[:7]} 撤销了 {original_hash[:7]}")                            
                    if commit_inter_count > 2*max_history_count:
                        break
                    commit_inter_count += 1
            except Exception as e:
                logger.error(f"获取撤销提交信息时出错: {str(e)}")
            
            queries = []
            for file_path in chat_action_files:
                try:                                                
                    # 获取文件内容                        
                    action_data = action_manager.load_yaml_content(file_path)
                    timestamp = os.path.getmtime(os.path.join(action_manager.actions_dir, file_path))
                    
                    if not action_data:
                        continue
                                    
                    # 提取查询内容
                    file_number_str = file_path.split("_")[0]
                    try:
                        file_number = int(file_number_str)
                    except ValueError:
                        file_number = 0
                        
                    query_content = action_data.get("query", "")
                    
                    # 提取响应ID（如果有）
                    response_id = action_manager.get_commit_id_from_file(file_path)
                    
                    # 检查该提交是否已被撤销
                    is_reverted = False
                    if response_id and response_id in reverted_commits:                        
                        is_reverted = True
                    
                    # 提取上下文URL（如果有）
                    context_urls = action_data.get("urls", []) + action_data.get("dynamic_urls", [])
                    if context_urls is None:
                        context_urls = []
                    
                    # 格式化时间戳为字符串
                    timestamp_str = datetime.fromtimestamp(timestamp).strftime('%Y-%m-%d %H:%M:%S')
                    
                    # 创建查询对象
                    query = Query(
                        query=query_content[-200:],
                        timestamp=timestamp_str,
                        response=response_id,
                        urls=context_urls,
                        file_number=file_number,
                        is_reverted=is_reverted
                    )
                    
                    queries.append(query)
                except Exception as e:
                    logger.error(f"Error processing file {file_path}: {str(e)}")
                    continue
            
            # 按文件编号降序排序
            queries.sort(key=lambda x: x.file_number, reverse=True)
            
            return {"success": True, "queries": queries[:max_history_count]}
        except Exception as e:
            logger.error(f"Error loading history: {str(e)}")
            return {"success": False, "message": f"加载历史记录失败: {str(e)}"}
    
    # 使用线程池提交任务并等待结果
    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(
        thread_pool,
        functools.partial(load_history_task, project_path)
    )
    
    return result


@router.get("/api/history/commit-diff/{response_id}", response_model=DiffResponse)
async def get_commit_diff(
    response_id: str,
    project_path: str = Depends(get_project_path)
):
    """
    获取指定响应ID对应的提交差异
    
    Args:
        response_id: 响应ID，通常是提交哈希值
        project_path: 项目路径
        
    Returns:
        提交差异信息
    """
    try:
        repo = get_repo(project_path)
        
        # 尝试获取提交
        try:
            commit = repo.commit(response_id)
        except GitCommandError:
            return {"success": False, "message": f"找不到提交: {response_id}"}
        
        # 获取父提交
        if not commit.parents:
            # 如果没有父提交，这是第一个提交
            diff = repo.git.show(commit.hexsha, format="")
            file_changes = []
            
            # 解析diff获取文件变更
            for file_path in commit.stats.files:
                file_changes.append({
                    "path": file_path,
                    "change_type": "added"
                })
        else:
            # 获取与父提交的差异
            parent = commit.parents[0]
            diff = repo.git.diff(parent.hexsha, commit.hexsha)
            
            # 获取文件变更列表
            file_changes = []
            for file_path, stats in commit.stats.files.items():
                # 判断文件变更类型
                if not os.path.exists(os.path.join(project_path, file_path)):
                    change_type = "deleted"
                elif file_path not in parent.stats.files:
                    change_type = "added"
                else:
                    change_type = "modified"
                
                file_changes.append({
                    "path": file_path,
                    "change_type": change_type
                })
        
        return {
            "success": True,
            "diff": diff,
            "file_changes": file_changes
        }
    except Exception as e:
        logger.error(f"Error getting commit diff: {str(e)}")
        return {"success": False, "message": f"获取差异失败: {str(e)}"}


@router.get("/api/history/file-diff/{response_id}", response_model=FileDiffResponse)
async def get_file_diff(
    response_id: str,
    file_path: str,
    project_path: str = Depends(get_project_path)
):
    """
    获取指定提交中特定文件的差异详情
    
    Args:
        response_id: 响应ID，通常是提交哈希值
        file_path: 文件路径
        project_path: 项目路径
        
    Returns:
        文件差异详情
    """
    try:
        repo = get_repo(project_path)
        
        # 尝试获取提交
        try:
            commit = repo.commit(response_id)
        except GitCommandError:
            return {"success": False, "message": f"找不到提交: {response_id}"}
        
        # 获取文件差异信息
        file_status = ""
        before_content = ""
        after_content = ""
        diff_content = ""
        
        # 处理父提交
        if not commit.parents:
            # 如果没有父提交，这是第一个提交
            try:
                # 检查文件是否在提交中
                blob = commit.tree[file_path]
                after_content = blob.data_stream.read().decode('utf-8', errors='replace')
                diff_content = repo.git.show(f"{commit.hexsha} -- {file_path}")
                file_status = "added"
            except (KeyError, UnicodeDecodeError, git.GitCommandError) as e:
                logger.error(f"Error getting file content: {str(e)}")
                return {"success": False, "message": f"获取文件内容失败: {str(e)}"}
        else:
            # 有父提交，获取差异
            parent = commit.parents[0]
            
            # 检查文件在当前提交中是否存在
            file_in_current = False
            try:
                blob = commit.tree[file_path]
                after_content = blob.data_stream.read().decode('utf-8', errors='replace')
                file_in_current = True
            except (KeyError, UnicodeDecodeError):
                after_content = ""
            
            # 检查文件在父提交中是否存在
            file_in_parent = False
            try:
                blob = parent.tree[file_path]
                before_content = blob.data_stream.read().decode('utf-8', errors='replace')
                file_in_parent = True
            except (KeyError, UnicodeDecodeError):
                before_content = ""
            
            # 确定文件状态
            if file_in_current and file_in_parent:
                file_status = "modified"
            elif file_in_current:
                file_status = "added"
            else:
                file_status = "deleted"
            
            # 获取文件差异
            try:
                diff_content = repo.git.diff(f"{parent.hexsha}..{commit.hexsha}", "--", file_path)
            except git.GitCommandError as e:
                logger.error(f"Error getting file diff: {str(e)}")
                diff_content = ""
        
        return {
            "success": True,
            "file_diff": {
                "before_content": before_content,
                "after_content": after_content,
                "diff_content": diff_content,
                "file_status": file_status
            }
        }
    except Exception as e:
        logger.error(f"Error getting file diff: {str(e)}")
        return {"success": False, "message": f"获取文件差异失败: {str(e)}"}
