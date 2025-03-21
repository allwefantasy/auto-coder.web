from fastapi import APIRouter, Request, HTTPException, Depends
from autocoder.agent.auto_filegroup import AutoFileGroup
from autocoder.utils import operate_config_api

router = APIRouter()

async def get_file_group_manager(request: Request):
    """获取FileGroupManager实例作为依赖"""
    return request.app.state.file_group_manager

async def get_project_path(request: Request):
    """获取项目路径作为依赖"""
    return request.app.state.project_path

async def get_auto_coder_runner(request: Request):
    """获取AutoCoderRunner实例作为依赖"""
    return request.app.state.auto_coder_runner

@router.post("/api/file-groups")
async def create_file_group(
    request: Request,
    file_group_manager = Depends(get_file_group_manager)
):
    data = await request.json()
    name = data.get("name")
    description = data.get("description", "")
    group = await file_group_manager.create_group(name, description)
    return group

@router.post("/api/file-groups/auto")
async def auto_create_groups(
    request: Request,
    file_group_manager = Depends(get_file_group_manager),
    project_path: str = Depends(get_project_path),
    auto_coder_runner = Depends(get_auto_coder_runner)
):            
    try:
        data = await request.json()
        file_size_limit = data.get("file_size_limit", 100)
        skip_diff = data.get("skip_diff", False)
        group_num_limit = data.get("group_num_limit", 10)

        # Create AutoFileGroup instance
        auto_grouper = AutoFileGroup(
            operate_config_api.get_llm(auto_coder_runner.memory),
            project_path,
            skip_diff=skip_diff,
            file_size_limit=file_size_limit,
            group_num_limit=group_num_limit
        )

        # Get groups
        groups = auto_grouper.group_files()

        # Create groups using file_group_manager
        for group in groups:
            await file_group_manager.create_group(
                name=group.name,
                description=group.description
            )
            # Add files to the group
            await file_group_manager.add_files_to_group(
                group.name,
                group.urls
            )

        return {"status": "success", "message": f"Created {len(groups)} groups"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/file-groups/switch")
async def switch_file_groups(
    request: Request,
    file_group_manager = Depends(get_file_group_manager)
):
    data = await request.json()
    group_names = data.get("group_names", [])
    result = await file_group_manager.switch_groups(group_names)
    return result

@router.delete("/api/file-groups/{name}")
async def delete_file_group(
    name: str,
    file_group_manager = Depends(get_file_group_manager)
):
    await file_group_manager.delete_group(name)
    return {"status": "success"}

@router.post("/api/file-groups/{name}/files")
async def add_files_to_group(
    name: str, 
    request: Request,
    file_group_manager = Depends(get_file_group_manager)
):
    data = await request.json()
    files = data.get("files", [])
    description = data.get("description")
    if description is not None:
        group = await file_group_manager.update_group_description(name, description)
    else:
        group = await file_group_manager.add_files_to_group(name, files)
    return group

@router.delete("/api/file-groups/{name}/files")
async def remove_files_from_group(
    name: str, 
    request: Request,
    file_group_manager = Depends(get_file_group_manager)
):
    data = await request.json()
    files = data.get("files", [])
    group = await file_group_manager.remove_files_from_group(name, files)
    return group

@router.get("/api/file-groups")
async def get_file_groups(
    file_group_manager = Depends(get_file_group_manager)
):
    groups = await file_group_manager.get_groups()
    return {"groups": groups} 