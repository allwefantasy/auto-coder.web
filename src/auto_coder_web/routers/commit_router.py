import os
import re
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any

from fastapi import APIRouter, HTTPException, Request, Depends, Query
from pydantic import BaseModel
from loguru import logger
import git
from git import Repo, GitCommandError

# 导入获取事件和action文件的相关模块
from autocoder.events.event_manager_singleton import get_event_manager, get_event_file_path
from autocoder.events.event_types import EventType
from autocoder.common.action_yml_file_manager import ActionYmlFileManager

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
    limit: int = 10, 
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
                    "diff_content": repo.git.show(f"{commit.hexsha} -- {file_path}"),
                    "file_status": "added"
                }
            else:
                raise HTTPException(status_code=404, detail=f"File {file_path} not found in commit {commit_hash}")
        
        # 获取父提交
        parent = commit.parents[0]
        
        # 获取提交的差异索引
        diff_index = parent.diff(commit)
        
        # 初始化变量
        before_content = ""
        after_content = ""
        diff_content = ""
        file_status = "unknown"
        found_file = False
        
        # 查找匹配的文件差异
        for diff_item in diff_index:
            # 检查文件路径是否匹配当前或重命名后的文件
            if diff_item.a_path == file_path or diff_item.b_path == file_path:
                found_file = True
                # 根据diff_item确定文件状态
                file_status = get_file_status_from_diff(diff_item)
                
                # 根据文件状态获取内容
                if file_status == "added":
                    # 新增文件
                    after_content = repo.git.show(f"{commit.hexsha}:{file_path}")
                    diff_content = repo.git.diff(f"{parent.hexsha}..{commit.hexsha}", "--", file_path)
                elif file_status == "deleted":
                    # 删除文件
                    before_content = repo.git.show(f"{parent.hexsha}:{file_path}")
                    diff_content = repo.git.diff(f"{parent.hexsha}..{commit.hexsha}", "--", file_path)
                elif file_status == "renamed":
                    # 重命名文件
                    if diff_item.a_path == file_path:
                        # 查询的是原文件名
                        before_content = repo.git.show(f"{parent.hexsha}:{diff_item.a_path}")
                        after_content = repo.git.show(f"{commit.hexsha}:{diff_item.b_path}")
                    else:
                        # 查询的是新文件名
                        before_content = repo.git.show(f"{parent.hexsha}:{diff_item.a_path}")
                        after_content = repo.git.show(f"{commit.hexsha}:{diff_item.b_path}")
                    diff_content = repo.git.diff(f"{parent.hexsha}..{commit.hexsha}", "--", diff_item.a_path, diff_item.b_path)
                else:
                    # 修改文件
                    before_content = repo.git.show(f"{parent.hexsha}:{file_path}")
                    after_content = repo.git.show(f"{commit.hexsha}:{file_path}")
                    diff_content = repo.git.diff(f"{parent.hexsha}..{commit.hexsha}", "--", file_path)
                
                break
        
        # 如果没有找到匹配的文件
        if not found_file:
            raise HTTPException(status_code=404, detail=f"File {file_path} not found in commit {commit_hash} or its parent")
        
        return {
            "before_content": before_content,
            "after_content": after_content,
            "diff_content": diff_content,
            "file_status": file_status
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting file diff: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to get file diff: {str(e)}"
        )


def get_file_status_from_diff(diff_item) -> str:
    """
    根据Git diff对象确定文件变更类型
    
    Args:
        diff_item: Git diff对象
        
    Returns:
        文件状态: added(新增), deleted(删除), renamed(重命名) 或 modified(修改)
    """
    if diff_item.new_file:
        return "added"
    elif diff_item.deleted_file:
        return "deleted"
    elif diff_item.renamed:
        return "renamed"
    else:
        return "modified"


@router.get("/api/current-changes")
async def get_current_changes(
    limit: int = 3, 
    hours_ago: int = 24,
    event_file_id: Optional[str] = None,
    project_path: str = Depends(get_project_path)
):
    """
    获取当前变更的提交列表
    
    有两种模式:
    1. 如果提供了event_file_id，则从事件文件中提取相关的提交
    2. 如果没有提供event_file_id，则返回最近的提交
    
    Args:
        limit: 返回的最大提交数量，默认3
        hours_ago: 从几小时前开始查找，默认24小时
        event_file_id: 事件文件ID，可选
        project_path: 项目路径
        
    Returns:
        提交哈希列表
    """
    logger.info(f"开始获取当前变更 - 参数: limit={limit}, hours_ago={hours_ago}, event_file_id={event_file_id}, project_path={project_path}")
    try:
        repo = get_repo(project_path)
        logger.info(f"成功获取Git仓库: {project_path}")
        
        # 如果提供了事件文件ID，从事件中获取相关提交
        if event_file_id:
            logger.info(f"使用事件文件模式获取提交, event_file_id={event_file_id}")
            try:
                # 获取事件文件路径
                event_file_path = get_event_file_path(event_file_id, project_path)                
                
                # 获取事件管理器
                event_manager = get_event_manager(event_file_path)                
                
                # 获取所有事件
                all_events = event_manager.event_store.get_events()                
                
                # 创建ActionYmlFileManager实例
                action_manager = ActionYmlFileManager(project_path)                                                                

                action_files = set()
                final_action_files = []
                
                # 记录事件中包含action_file字段的事件数量
                action_file_count = 0
                
                for i, event in enumerate(all_events):                    
                    # 检查元数据中是否有action_file字段
                    if 'action_file' in event.metadata and event.metadata['action_file']:
                        action_file_count += 1
                        action_file = event.metadata['action_file']                        
                        
                        if action_file in action_files:                            
                            continue
                                                
                        action_files.add(action_file)
                        # 从action文件获取提交ID       
                        # action_file 这里的值是 类似这样的 actions/000000000104_chat_action.yml
                        if action_file.startswith("actions"):
                            action_file = action_file[len("actions/"):]                            

                        final_action_files.append(action_file)
                                
                
                commits = []
                for i, action_file in enumerate(final_action_files):                    
                    commit_ids = action_manager.get_all_commit_id_from_file(action_file)                                        
                                        
                    
                    if not commit_ids:
                        logger.warning(f"无法从action文件 {action_file} 获取提交ID")
                        continue
                    
                    # 如果有两个提交，检查是否有一个是revert提交
                    if len(commit_ids) == 2:
                        logger.info(f"检测到两个提交ID，可能存在revert操作: {commit_ids}")
                        revert_commit_id = None
                        
                        # 检查每个提交是否是revert提交
                        for cid in commit_ids:
                            try:
                                commit = repo.commit(cid)
                                message = commit.message.strip()                                
                                
                                if message.startswith("<revert>"):
                                    logger.info(f"找到revert提交: {cid}")
                                    revert_commit_id = cid
                                    break
                            except Exception as e:
                                logger.warning(f"检查提交 {cid} 时出错: {str(e)}")
                        
                        # 如果找到revert提交，只处理这个提交
                        if revert_commit_id:                            
                            commit_ids = [revert_commit_id]
                    
                    # 处理所有提交ID（或者只处理revert提交）
                    for commit_id in commit_ids:
                        # 验证提交ID是否存在于仓库中
                        try:                            
                            commit = repo.commit(commit_id)
                            # 获取提交统计信息
                            stats = commit.stats.total                            
                            # 构建提交信息
                            commit_info = {
                                "hash": commit.hexsha,
                                "short_hash": commit.hexsha[:7],
                                "author": f"{commit.author.name} <{commit.author.email}>",
                                "date": datetime.fromtimestamp(commit.committed_date).isoformat(),
                                "timestamp": commit.committed_date,
                                "message": commit.message.strip(),
                                "stats": {
                                    "insertions": stats["insertions"],
                                    "deletions": stats["deletions"],
                                    "files_changed": stats["files"]
                                }
                            }
                            commits.append(commit_info)
                        except Exception as e:
                            logger.warning(f"无法获取提交 {commit_id} 的详情: {str(e)}")
                
                
                # 按提交时间戳排序（降序 - 最新的在前面）
                if commits:
                    commits.sort(key=lambda x: x['timestamp'], reverse=True)
                                                
                return {"commits": commits, "total": len(commits)}
            
            except Exception as e:
                logger.error(f"从事件文件获取提交失败: {str(e)}")
                import traceback
                logger.error(f"详细错误信息: {traceback.format_exc()}")
                return {"commits": [], "total": 0}
        else:
            # 如果没有提供事件文件ID，返回最近的提交
            logger.info("未提供event_file_id，应返回最近的提交，但当前实现返回空列表")
            # 这里应该调用get_recent_commits函数获取最近的提交
            # recent_commits = await get_recent_commits(repo, limit, hours_ago)
            # logger.info(f"获取到 {len(recent_commits.get('commit_hashes', []))} 个最近的提交")
            # return recent_commits
            return {"commits": [], "total": 0}
            
    except Exception as e:
        logger.error(f"获取当前变更失败: {str(e)}")
        import traceback
        logger.error(f"详细错误信息: {traceback.format_exc()}")
        raise HTTPException(
            status_code=500, 
            detail=f"获取当前变更失败: {str(e)}"
        )

async def get_recent_commits(repo: Repo, limit: int, hours_ago: int):
    """
    获取最近的提交
    
    Args:
        repo: Git仓库对象
        limit: 最大提交数量
        hours_ago: 时间范围（小时）
        
    Returns:
        最近的提交哈希列表，按时间降序排序
    """
    # 计算时间范围
    since_time = datetime.now() - timedelta(hours=hours_ago)
    since_timestamp = since_time.timestamp()
    
    # 获取最近的提交，带时间戳
    commit_data = []
    
    for commit in repo.iter_commits():
        if commit.committed_date >= since_timestamp:
            commit_data.append({
                'hash': commit.hexsha,
                'timestamp': commit.committed_date
            })
            if len(commit_data) >= limit:
                break
    
    # 按时间戳排序（降序 - 最新的在前面）
    commit_data.sort(key=lambda x: x['timestamp'], reverse=True)
    
    # 提取排序后的哈希值，并去重（保持顺序）
    seen_hashes = set()
    commit_hashes_list = []
    for item in commit_data:
        if item['hash'] not in seen_hashes:
            seen_hashes.add(item['hash'])
            commit_hashes_list.append(item['hash'])
    
    return {"commit_hashes": commit_hashes_list}

@router.post("/api/commits/{commit_hash}/revert")
async def revert_commit(
    commit_hash: str, 
    project_path: str = Depends(get_project_path)
):
    """
    撤销指定的提交，创建一个新的 revert 提交
    
    Args:
        commit_hash: 要撤销的提交哈希值
        project_path: 项目路径
        
    Returns:
        新创建的 revert 提交信息
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
        
        # 检查工作目录是否干净
        if repo.is_dirty():
            raise HTTPException(
                status_code=400, 
                detail="Cannot revert: working directory has uncommitted changes"
            )
        
        try:
            # 执行 git revert
            # 使用 -n 选项不自动创建提交，而是让我们手动提交
            repo.git.revert(commit.hexsha, no_commit=True)
            
            # 创建带有信息的 revert 提交
            revert_message = f"<revert>{commit.message.strip()}\n{commit.hexsha}"
            new_commit = repo.index.commit(
                revert_message,
                author=repo.active_branch.commit.author,
                committer=repo.active_branch.commit.committer
            )
            
            # 构建新提交的信息
            stats = new_commit.stats.total
            new_commit_info = {
                "new_commit_hash": new_commit.hexsha,
                "new_commit_short_hash": new_commit.hexsha[:7],
                "reverted_commit": {
                    "hash": commit.hexsha,
                    "short_hash": commit.hexsha[:7],
                    "message": commit.message.strip()
                },
                "stats": {
                    "insertions": stats["insertions"],
                    "deletions": stats["deletions"],
                    "files_changed": stats["files"]
                }
            }
            
            return new_commit_info
            
        except git.GitCommandError as e:
            # 如果发生 Git 命令错误，尝试恢复工作目录
            try:
                repo.git.reset("--hard", "HEAD")
            except:
                pass  # 如果恢复失败，继续抛出原始错误
                
            if "patch does not apply" in str(e):
                raise HTTPException(
                    status_code=409, 
                    detail="Cannot revert: patch does not apply (likely due to conflicts)"
                )
            else:
                raise HTTPException(
                    status_code=500, 
                    detail=f"Git error during revert: {str(e)}"
                )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error reverting commit: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to revert commit: {str(e)}"
        ) 