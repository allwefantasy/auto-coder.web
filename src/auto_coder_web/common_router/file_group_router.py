from typing import List, Optional
import asyncio
from fastapi import APIRouter, Request, HTTPException, Depends
from autocoder.agent.auto_filegroup import AutoFileGroup
from autocoder.utils import operate_config_api
from autocoder.common.core_config import get_memory_manager
import os
from autocoder.rag.token_counter import count_tokens
import aiofiles
from loguru import logger
from autocoder.rag.loaders import (
    extract_text_from_pdf,
    extract_text_from_docx,
    extract_text_from_ppt
)

router = APIRouter()


async def get_project_path(request: Request):
    """获取项目路径作为依赖"""
    return request.app.state.project_path


async def get_memory_manager_instance(request: Request):
    """获取MemoryManager实例作为依赖"""
    project_path = request.app.state.project_path
    return get_memory_manager(project_path)


def _create_file_group(manager, group_name: str, description: str):
    if manager.has_file_group(group_name):
        return None

    manager.set_file_group(group_name, [])
    manager.set_group_info(group_name, {
        "query_prefix": description
    })


def _add_files_to_group(manager, project_path: str, name: str, files: List[str]):
    absolute_files = [os.path.join(project_path, file) for file in files]
    existing_files = manager.get_file_groups().get(name, [])
    existing_files.extend(absolute_files)
    manager.set_file_group(name, existing_files)


def _remove_file_from_group(manager, project_path: str, name: str, files: List[str]):
    absolute_files = [os.path.join(project_path, file) for file in files]
    existing_files = manager.get_file_groups().get(name, [])
    for file in absolute_files:
        if file in existing_files:
            existing_files.remove(file)
    manager.set_file_group(name, existing_files)


def _update_group_description(manager, name: str, description: str):
    group_info = manager.get_group_info(name) or {}
    group_info["query_prefix"] = description
    manager.set_group_info(name, group_info)


def _get_groups(manager, project_path: str):
    groups = manager.get_file_groups()
    groups_info = manager.get_groups_info()
    
    v = [
        {
            "name": group_name,
            "files": groups[group_name],
            "description": groups_info.get(group_name, {}).get("query_prefix", "")
        } for group_name in groups
    ]
    return v


def _switch_groups(manager, group_names: List[str], file_paths: Optional[List[str]] = None):
    new_files = []
    groups = manager.get_file_groups()
    
    for group_name in group_names:
        files = groups.get(group_name, [])
        new_files.extend(files)
    
    # Add individual file paths if provided
    if file_paths:
        for file_path in file_paths:
            # Only add unique paths
            if file_path not in new_files:
                new_files.append(file_path)
    
    manager.set_current_files(new_files)
    manager.set_current_groups(group_names)


def _delete_file_group(manager, project_path: str, group_name: str):
    if not manager.has_file_group(group_name):
        return None
    manager.delete_file_group(group_name)


@router.post("/api/file-groups")
async def create_file_group(
    request: Request,
    manager = Depends(get_memory_manager_instance)
):
    data = await request.json()
    group_name = data.get("name")
    description = data.get("description", "")
    await asyncio.to_thread(_create_file_group, manager, group_name, description)
    return {"status": "success", "message": f"Created group: {group_name}"}


@router.post("/api/file-groups/auto")
async def auto_create_groups(
    request: Request,
    project_path: str = Depends(get_project_path),
    manager = Depends(get_memory_manager_instance)
):
    try:
        data = await request.json()
        file_size_limit = data.get("file_size_limit", 100)
        skip_diff = data.get("skip_diff", False)
        group_num_limit = data.get("group_num_limit", 10)

        # Get LLM from memory manager
        memory_dict = manager.get_memory_dict()
        llm = operate_config_api.get_llm(memory_dict)
        
        if llm is None:
            raise HTTPException(status_code=400, detail="LLM configuration not found")

        # Create AutoFileGroup instance
        auto_grouper = AutoFileGroup(
            llm,
            project_path,
            skip_diff=skip_diff,
            file_size_limit=file_size_limit,
            group_num_limit=group_num_limit
        )

        # Get groups
        groups = auto_grouper.group_files()

        # Create groups using file_group_manager
        for group in groups:
            await asyncio.to_thread(_create_file_group,
                                    manager,
                                    group.name,
                                    group.description
                                    )
            # Add files to the group
            await asyncio.to_thread(_add_files_to_group,
                                    manager,
                                    project_path,
                                    group.name,
                                    group.urls
                                    )

        return {"status": "success", "message": f"Created {len(groups)} groups"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


async def _read_file(file_path_to_read: str) -> str:
    """使用线程模拟异步读取文件内容
    
    Args:
        file_path_to_read: 要读取的文件路径
        
    Returns:
        str: 文件内容
    """
    ext = os.path.splitext(file_path_to_read)[1].lower()
    
    # 定义各种文件类型的读取函数
    def read_pdf():
        logger.info(f"Extracting text from PDF: {file_path_to_read}")
        return extract_text_from_pdf(file_path_to_read)
        
    def read_docx():
        logger.info(f"Extracting text from DOCX: {file_path_to_read}")
        return extract_text_from_docx(file_path_to_read)
        
    def read_ppt():
        logger.info(f"Extracting text from PPT/PPTX: {file_path_to_read}")
        slide_texts = []
        for slide_identifier, slide_text_content in extract_text_from_ppt(file_path_to_read):
            slide_texts.append(f"--- Slide {slide_identifier} ---\n{slide_text_content}")
        return "\n\n".join(slide_texts) if slide_texts else ""
        
    def read_text():
        logger.info(f"Reading plain text file: {file_path_to_read}")
        with open(file_path_to_read, 'r', encoding='utf-8', errors='replace') as f:
            return f.read()
    
    # 根据文件类型选择相应的读取函数
    if ext == '.pdf':
        read_func = read_pdf
    elif ext == '.docx':
        read_func = read_docx
    elif ext in ('.pptx', '.ppt'):
        read_func = read_ppt
    else:
        read_func = read_text
    
    # 使用线程执行耗时的文件读取操作
    content = await asyncio.to_thread(read_func)
    return content


async def count_tokens_from_file(file_path: str) -> int:
    """异步计算文件的token数
    
    Args:
        file_path: 文件的绝对路径
        
    Returns:
        int: token数量，出错时返回0
    """
    try:            
        logger.info(f"计算文件token: {file_path}")
        content = await _read_file(file_path)
        
        if content is None:
            return 0
        
        file_tokens = count_tokens(content)
        return file_tokens if file_tokens > 0 else 0
    except Exception as e:
        logger.error(f"计算文件token出错: {file_path}, 错误: {str(e)}")
        return 0


@router.post("/api/file-groups/switch")
async def switch_file_groups(
    request: Request,
    project_path: str = Depends(get_project_path),
    manager = Depends(get_memory_manager_instance)
):
    data = await request.json()
    group_names = data.get("group_names", [])
    file_paths = data.get("file_paths", [])
    
    # Convert relative file paths to absolute paths
    absolute_file_paths = []
    total_tokens = 0
    
    for file_path in file_paths:
        absolute_path = os.path.join(project_path, file_path)
        absolute_file_paths.append(absolute_path)
    
    # 计算所有文件的tokens
    token_tasks = []
    
    # 收集组里的文件
    groups = manager.get_file_groups()
    for group_name in group_names:
        files = groups.get(group_name, [])
        for file_path in files:
            token_tasks.append(count_tokens_from_file(file_path))
    
    # 收集额外的文件
    for file_path in absolute_file_paths:
        token_tasks.append(count_tokens_from_file(file_path))
    
    # 异步等待所有token计算任务完成
    if token_tasks:
        token_results = await asyncio.gather(*token_tasks)
        total_tokens = sum(token_results)
    
    await asyncio.to_thread(_switch_groups, manager, group_names, absolute_file_paths)
    return {
        "status": "success", 
        "message": f"Switched to groups: {group_names} and additional files",
        "total_tokens": total_tokens,
        "absolute_file_paths": absolute_file_paths
    }


@router.delete("/api/file-groups/{name}")
async def delete_file_group(
    name: str,
    project_path: str = Depends(get_project_path),
    manager = Depends(get_memory_manager_instance)
):
    await asyncio.to_thread(_delete_file_group, manager, project_path, name)
    return {"status": "success", "message": f"Deleted group: {name}"}


@router.post("/api/file-groups/{name}/files")
async def add_files_to_group(
    name: str,
    request: Request,
    project_path: str = Depends(get_project_path),
    manager = Depends(get_memory_manager_instance)
):
    data = await request.json()
    files = data.get("files", [])
    description = data.get("description")
    if description is not None:
        await asyncio.to_thread(_update_group_description, manager, name, description)
    else:
        await asyncio.to_thread(_add_files_to_group, manager, project_path, name, files)
    return {"status": "success", "message": f"Added files to group: {name}"}


@router.delete("/api/file-groups/{name}/files")
async def remove_files_from_group(
    name: str,
    request: Request,
    project_path: str = Depends(get_project_path),
    manager = Depends(get_memory_manager_instance)
):
    data = await request.json()
    files = data.get("files", [])
    await asyncio.to_thread(_remove_file_from_group, manager, project_path, name, files)
    return {"status": "success", "message": f"Removed files from group: {name}"}


@router.get("/api/file-groups")
async def get_file_groups(
    project_path: str = Depends(get_project_path),
    manager = Depends(get_memory_manager_instance)
):
    groups = await asyncio.to_thread(_get_groups, manager, project_path)
    return {"groups": groups}


@router.post("/api/file-groups/clear")
async def clear_current_files(
    manager = Depends(get_memory_manager_instance)
):
    manager.set_current_files([])
    manager.set_current_groups([])
    return {"status": "success", "message": "Cleared current files"}
