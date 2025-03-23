from typing import List
import asyncio
from fastapi import APIRouter, Request, HTTPException, Depends
from autocoder.agent.auto_filegroup import AutoFileGroup
from autocoder.utils import operate_config_api
from autocoder.auto_coder_runner import get_memory,save_memory, load_memory
import json
import os

router = APIRouter()


async def get_project_path(request: Request):
    """获取项目路径作为依赖"""
    return request.app.state.project_path


def _create_file_group(group_name: str, description: str):
    memory = get_memory()
    if group_name in memory["current_files"]["groups"]:
        return None

    memory["current_files"]["groups"][group_name] = []

    if "groups_info" not in memory["current_files"]:
        memory["current_files"]["groups_info"] = {}

    memory["current_files"]["groups_info"][group_name] = {
        "query_prefix": description
    }
    save_memory()


def _add_files_to_group(project_path: str, name: str, files: List[str]):
    memory = get_memory()
    for file in files:
        memory["current_files"]["groups"][name].append(
            os.path.join(project_path, file))
    save_memory()


def _remove_file_from_group(project_path: str, name: str, files: List[str]):
    memory = get_memory()
    for file in files:
        memory["current_files"]["groups"][name].remove(
            os.path.join(project_path, file))
    save_memory()


def _update_group_description(name: str, description: str):
    memory = get_memory()
    memory["current_files"]["groups_info"][name]["query_prefix"] = description
    save_memory()


def _get_groups(project_path: str):
    memory = get_memory()     
    v = [
        {
            "name": group_name,
            "files": memory["current_files"]["groups"][group_name],
            "description": memory["current_files"]["groups_info"][group_name]["query_prefix"]
        } for group_name in memory["current_files"]["groups"]
    ]
    return v

def _switch_groups(group_names: List[str], file_paths: List[str] = None):
    memory = get_memory()
    new_files = []
    for group_name in group_names:
        files = memory["current_files"]["groups"][group_name]
        new_files.extend(files)
    
    # Add individual file paths if provided
    if file_paths:
        for file_path in file_paths:
            # Only add unique paths
            if file_path not in new_files:
                new_files.append(file_path)
    
    memory["current_files"]["files"] = new_files
    memory["current_files"]["current_groups"] = group_names
    save_memory()


def _delete_file_group(project_path: str, group_name: str):
    memory = get_memory()
    if group_name not in memory["current_files"]["groups"]:
        return None
    del memory["current_files"]["groups"][group_name]
    if group_name in memory["current_files"]["groups_info"]:
        del memory["current_files"]["groups_info"][group_name]
    save_memory()


@router.post("/api/file-groups")
async def create_file_group(
    request: Request
):
    data = await request.json()
    group_name = data.get("name")
    description = data.get("description", "")
    await asyncio.to_thread(_create_file_group, group_name, description)
    return {"status": "success", "message": f"Created group: {group_name}"}


@router.post("/api/file-groups/auto")
async def auto_create_groups(
    request: Request,
    project_path: str = Depends(get_project_path)
):
    try:
        memory = get_memory()
        data = await request.json()
        file_size_limit = data.get("file_size_limit", 100)
        skip_diff = data.get("skip_diff", False)
        group_num_limit = data.get("group_num_limit", 10)

        # Create AutoFileGroup instance
        auto_grouper = AutoFileGroup(
            operate_config_api.get_llm(memory),
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
                                    name=group.name,
                                    description=group.description
                                    )
            # Add files to the group
            await asyncio.to_thread(_add_files_to_group,
                                    group.name,
                                    group.urls
                                    )

        return {"status": "success", "message": f"Created {len(groups)} groups"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/file-groups/switch")
async def switch_file_groups(
    request: Request,
    project_path: str = Depends(get_project_path)
):
    data = await request.json()
    group_names = data.get("group_names", [])
    file_paths = data.get("file_paths", [])
    
    # Convert relative file paths to absolute paths
    absolute_file_paths = []
    for file_path in file_paths:
        absolute_path = os.path.join(project_path, file_path)
        absolute_file_paths.append(absolute_path)
    
    await asyncio.to_thread(_switch_groups, group_names, absolute_file_paths)
    return {"status": "success", "message": f"Switched to groups: {group_names} and additional files"}


@router.delete("/api/file-groups/{name}")
async def delete_file_group(
    name: str,
    project_path: str = Depends(get_project_path)
):
    await asyncio.to_thread(_delete_file_group, project_path, name)
    return {"status": "success", "message": f"Deleted group: {name}"}


@router.post("/api/file-groups/{name}/files")
async def add_files_to_group(
    name: str,
    request: Request,
    project_path: str = Depends(get_project_path)
):
    data = await request.json()
    files = data.get("files", [])
    description = data.get("description")
    if description is not None:
        await asyncio.to_thread(_update_group_description, name, description)
    else:
        await asyncio.to_thread(_add_files_to_group, project_path, name, files)
    return {"status": "success", "message": f"Added files to group: {name}"}


@router.delete("/api/file-groups/{name}/files")
async def remove_files_from_group(
    name: str,
    request: Request,
    project_path: str = Depends(get_project_path)
):
    data = await request.json()
    files = data.get("files", [])
    await asyncio.to_thread(_remove_file_from_group, project_path, name, files)
    return {"status": "success", "message": f"Removed files from group: {name}"}


@router.get("/api/file-groups")
async def get_file_groups(
    project_path: str = Depends(get_project_path)
):
    groups = await asyncio.to_thread(_get_groups, project_path)
    return {"groups": groups}
