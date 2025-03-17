import os
import re
from datetime import datetime
from typing import Dict, List, Optional, Any

from fastapi import APIRouter, HTTPException, Request, Depends
from pydantic import BaseModel
from loguru import logger
import git
from git import Repo, GitCommandError

router = APIRouter()


class CommitDetail(BaseModel):
    hash: str
    short_hash: str
    author: str
    date: str
    message: str
    stats: Dict[str, int]
    files: Optional[List[Dict[str, Any]]] = None


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


@router.get("/api/commits")
async def get_commits(
    limit: int = 50, 
    skip: int = 0, 
    project_path: str = Depends(get_project_path)
):
    """
    获取Git提交历史

    Args:
        limit: 返回的最大提交数量，默认50
        skip: 跳过的提交数量，用于分页
        project_path: 项目路径

    Returns:
        提交列表
    """
    try:
        repo = get_repo(project_path)
        commits = []
        
        # 获取提交列表
        for i, commit in enumerate(repo.iter_commits()):
            if i < skip:
                continue
            if len(commits) >= limit:
                break
                
            # 获取提交统计信息
            stats = commit.stats.total
            
            # 构建提交信息
            commit_info = {
                "hash": commit.hexsha,
                "short_hash": commit.hexsha[:7],
                "author": f"{commit.author.name} <{commit.author.email}>",
                "date": datetime.fromtimestamp(commit.committed_date).isoformat(),
                "message": commit.message.strip(),
                "stats": {
                    "insertions": stats["insertions"],
                    "deletions": stats["deletions"],
                    "files_changed": stats["files"]
                }
            }
            commits.append(commit_info)
        
        return {"commits": commits, "total": len(list(repo.iter_commits()))}
    except Exception as e:
        logger.error(f"Error getting commits: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to get commits: {str(e)}"
        )


@router.get("/api/commits/{commit_hash}")
async def get_commit_detail(
    commit_hash: str, 
    project_path: str = Depends(get_project_path)
):
    """
    获取特定提交的详细信息

    Args:
        commit_hash: 提交哈希值
        project_path: 项目路径

    Returns:
        提交详情
    """
    try:
        repo = get_repo(project_path)
        
        # 尝试获取指定的提交
        try:
            commit = repo.commit(commit_hash)
        except ValueError:
            # 如果是短哈希，尝试匹配
            matching_commits = [c for c in repo.iter_commits() if c.hexsha.startswith(commit_hash)]
            if not matching_commits:
                raise HTTPException(status_code=404, detail=f"Commit {commit_hash} not found")
            commit = matching_commits[0]
        
        # 获取提交统计信息
        stats = commit.stats.total
        
        # 获取变更的文件列表
        changed_files = []
        diff_index = commit.diff(commit.parents[0] if commit.parents else git.NULL_TREE)
        
        for diff in diff_index:
            file_path = diff.a_path if diff.a_path else diff.b_path
            
            # 确定文件状态
            if diff.new_file:
                status = "added"
            elif diff.deleted_file:
                status = "deleted"
            elif diff.renamed:
                status = "renamed"
            else:
                status = "modified"
            
            # 获取文件级别的变更统计
            file_stats = None
            for filename, file_stat in commit.stats.files.items():
                norm_filename = filename.replace('/', os.sep)
                if norm_filename == file_path or filename == file_path:
                    file_stats = file_stat
                    break
            
            file_info = {
                "filename": file_path,
                "status": status,
            }
            
            if file_stats:
                file_info["changes"] = {
                    "insertions": file_stats["insertions"],
                    "deletions": file_stats["deletions"],
                }
            
            changed_files.append(file_info)
        
        # 构建详细的提交信息
        commit_detail = {
            "hash": commit.hexsha,
            "short_hash": commit.hexsha[:7],
            "author": f"{commit.author.name} <{commit.author.email}>",
            "date": datetime.fromtimestamp(commit.committed_date).isoformat(),
            "message": commit.message.strip(),
            "stats": {
                "insertions": stats["insertions"],
                "deletions": stats["deletions"],
                "files_changed": stats["files"]
            },
            "files": changed_files
        }
        
        return commit_detail
    except HTTPException:
        raise
    except IndexError:
        # 处理没有父提交的情况（首次提交）
        raise HTTPException(status_code=404, detail=f"Commit {commit_hash} has no parent commit")
    except Exception as e:
        logger.error(f"Error getting commit detail: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to get commit detail: {str(e)}"
        )


@router.get("/api/commit/action")
async def get_action_from_commit_msg(
    commit_msg: str,
    project_path: str = Depends(get_project_path)
):
    """
    从提交消息中获取对应的 action 文件名和内容
    
    Args:
        commit_msg: 提交消息
        project_path: 项目路径
        
    Returns:
        action 文件名和内容
    """
    try:
        # 初始化 ActionYmlFileManager
        from autocoder.common.action_yml_file_manager import ActionYmlFileManager
        
        action_manager = ActionYmlFileManager(project_path)
        
        # 从提交消息中获取文件名
        file_name = action_manager.get_file_name_from_commit_msg(commit_msg)
        
        if not file_name:
            raise HTTPException(
                status_code=404,
                detail="No action file found in commit message"
            )
                
        # 使用 ActionYmlFileManager 的 load_yaml_content 方法读取文件内容
        content = action_manager.load_yaml_content(file_name)
        
        if not content:
            logger.warning(f"Empty or invalid YAML content in file {file_name}")
            raise HTTPException(
                status_code=404,
                detail=f"No valid content found in action file {file_name}"
            )
        
        return {
            "file_name": file_name,
            "content": content
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting action from commit message: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get action from commit message: {str(e)}"
        )


@router.get("/api/branches")
async def get_branches(project_path: str = Depends(get_project_path)):
    """
    获取Git分支列表

    Args:
        project_path: 项目路径

    Returns:
        分支列表
    """
    try:
        repo = get_repo(project_path)
        branches = []
        
        current_branch = repo.active_branch.name
        
        for branch in repo.branches:
            branches.append({
                "name": branch.name,
                "is_current": branch.name == current_branch,
                "commit": {
                    "hash": branch.commit.hexsha,
                    "short_hash": branch.commit.hexsha[:7],
                    "message": branch.commit.message.strip()
                }
            })
        
        return {"branches": branches, "current": current_branch}
    except Exception as e:
        logger.error(f"Error getting branches: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to get branches: {str(e)}"
        )


@router.get("/api/commits/{commit_hash}/file")
async def get_file_diff(
    commit_hash: str,
    file_path: str,
    project_path: str = Depends(get_project_path)
):
    """
    获取特定提交中特定文件的变更前后内容和差异
    
    Args:
        commit_hash: 提交哈希值
        file_path: 文件路径
        project_path: 项目路径
        
    Returns:
        文件变更前后内容和差异
    """
    try:
        repo = get_repo(project_path)
        
        # 尝试获取指定的提交
        try:
            commit = repo.commit(commit_hash)
        except ValueError:
            # 如果是短哈希，尝试匹配
            matching_commits = [c for c in repo.iter_commits() if c.hexsha.startswith(commit_hash)]
            if not matching_commits:
                raise HTTPException(status_code=404, detail=f"Commit {commit_hash} not found")
            commit = matching_commits[0]
        
        # 处理父提交，如果没有父提交（初始提交）
        if not commit.parents:
            # 如果是新增文件
            if file_path in [item.path for item in commit.tree.traverse() if item.type == 'blob']:
                file_content = repo.git.show(f"{commit.hexsha}:{file_path}")
                return {
                    "before_content": "",  # 初始提交前没有内容
                    "after_content": file_content,
                    "diff_content": repo.git.show(f"{commit.hexsha} -- {file_path}")
                }
            else:
                raise HTTPException(status_code=404, detail=f"File {file_path} not found in commit {commit_hash}")
        
        # 获取父提交
        parent = commit.parents[0]
        
        # 检查文件是否存在于当前提交
        file_in_commit = False
        try:
            after_content = repo.git.show(f"{commit.hexsha}:{file_path}")
            file_in_commit = True
        except git.GitCommandError:
            after_content = ""  # 文件在当前提交中不存在（可能被删除）
        
        # 检查文件是否存在于父提交
        file_in_parent = False
        try:
            before_content = repo.git.show(f"{parent.hexsha}:{file_path}")
            file_in_parent = True
        except git.GitCommandError:
            before_content = ""  # 文件在父提交中不存在（新增文件）
        
        # 获取文件差异
        try:
            diff_content = repo.git.diff(f"{parent.hexsha}..{commit.hexsha}", "--", file_path)
        except git.GitCommandError:
            # 如果无法直接获取差异，可能是重命名或其他特殊情况
            diff_content = ""
            
            # 尝试查找可能的重命名
            diff_index = parent.diff(commit)
            for diff_item in diff_index:
                if diff_item.renamed:
                    if diff_item.b_path == file_path:  # 重命名后的路径匹配
                        before_content = repo.git.show(f"{parent.hexsha}:{diff_item.a_path}")
                        diff_content = repo.git.diff(f"{parent.hexsha}..{commit.hexsha}", "--", diff_item.a_path, file_path)
                        break
                    elif diff_item.a_path == file_path:  # 重命名前的路径匹配
                        after_content = repo.git.show(f"{commit.hexsha}:{diff_item.b_path}")
                        diff_content = repo.git.diff(f"{parent.hexsha}..{commit.hexsha}", "--", file_path, diff_item.b_path)
                        break
        
        # 检查我们是否找到了内容
        if not file_in_commit and not file_in_parent:
            raise HTTPException(status_code=404, detail=f"File {file_path} not found in commit {commit_hash} or its parent")
        
        return {
            "before_content": before_content,
            "after_content": after_content,
            "diff_content": diff_content,
            "file_status": "added" if not file_in_parent else "deleted" if not file_in_commit else "modified"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting file diff: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to get file diff: {str(e)}"
        ) 