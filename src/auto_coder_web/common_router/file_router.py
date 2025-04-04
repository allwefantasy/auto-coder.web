import os
import shutil
import aiofiles
import aiofiles.os
from fastapi import APIRouter, Request, HTTPException, Depends
from auto_coder_web.file_manager import (
    get_directory_tree_async,
    read_file_content_async,
)

router = APIRouter()

async def get_project_path(request: Request) -> str:
    """获取项目路径作为依赖"""
    return request.app.state.project_path

async def get_auto_coder_runner(request: Request):
    """获取AutoCoderRunner实例作为依赖"""
    return request.app.state.auto_coder_runner

@router.delete("/api/files/{path:path}")
async def delete_file(
    path: str,    
    project_path: str = Depends(get_project_path)
):
    try:
        full_path = os.path.join(project_path, path)
        if await aiofiles.os.path.exists(full_path):
            if await aiofiles.os.path.isdir(full_path):
                # Use shutil.rmtree for directories as aiofiles doesn't have a recursive delete
                # Consider adding a custom async recursive delete if performance is critical
                shutil.rmtree(full_path)
            else:
                await aiofiles.os.remove(full_path)
            return {"message": f"Successfully deleted {path}"}
        else:
            raise HTTPException(
                status_code=404, detail="File not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/api/files")
async def get_files(
    request: Request, # Need request to access project_path if not using Depends
    path: str = None, # Optional path parameter for lazy loading
    lazy: bool = False, # Optional lazy parameter
    project_path: str = Depends(get_project_path)
):
    try:
        # Pass path and lazy parameters if provided in the query
        query_params = request.query_params
        path_param = query_params.get("path")
        lazy_param = query_params.get("lazy", "false").lower() == "true"

        tree = await get_directory_tree_async(project_path, path=path_param, lazy=lazy_param)
        return {"tree": tree}
    except Exception as e:
        # Log the error e
        raise HTTPException(status_code=500, detail=f"Failed to get directory tree: {str(e)}")

@router.put("/api/file/{path:path}")
async def update_file(
    path: str, 
    request: Request,
    project_path: str = Depends(get_project_path)
):
    try:
        data = await request.json()
        content = data.get("content")
        if content is None:
            raise HTTPException(
                status_code=400, detail="Content is required")

        full_path = os.path.join(project_path, path)
        dir_path = os.path.dirname(full_path)

        # Ensure the directory exists asynchronously
        if not await aiofiles.os.path.exists(dir_path):
            await aiofiles.os.makedirs(dir_path, exist_ok=True)
        elif not await aiofiles.os.path.isdir(dir_path):
             raise HTTPException(status_code=400, detail=f"Path conflict: {dir_path} exists but is not a directory.")


        # Write the file content asynchronously
        async with aiofiles.open(full_path, 'w', encoding='utf-8') as f:
            await f.write(content)

        return {"message": f"Successfully updated {path}"}
    except HTTPException as http_exc: # Re-raise HTTP exceptions
        raise http_exc
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/api/file/{path:path}")
async def get_file_content(
    path: str,
    project_path: str = Depends(get_project_path)
):
    content = await read_file_content_async(project_path, path)
    if content is None:
        raise HTTPException(
            status_code=404, detail="File not found or cannot be read")

    return {"content": content} 