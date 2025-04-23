import os
import shutil
import aiofiles
import aiofiles.os
import asyncio
from fastapi import APIRouter, Request, HTTPException, Depends, Query
from auto_coder_web.file_manager import (
    get_directory_tree_async,
    read_file_content_async,
)
from pydantic import BaseModel
from typing import List, Optional
import pathspec

router = APIRouter()

class CreateFileRequest(BaseModel):
    content: str = ""

DEFAULT_IGNORED_DIRS = ['.git', '.auto-coder', 'node_modules', '.mvn', '.idea', '__pycache__', '.venv', 'venv', 'dist', 'build', '.gradle']

def load_ignore_spec(source_dir: str) -> Optional[pathspec.PathSpec]:
    """
    Loads .autocoderignore file from the source_dir if it exists.
    Returns a PathSpec object or None if no ignore file.
    """
    ignore_file_path = os.path.join(source_dir, ".autocoderignore")
    if not os.path.isfile(ignore_file_path):
        return None
    try:
        with open(ignore_file_path, "r") as f:
            ignore_patterns = f.read().splitlines()
        spec = pathspec.PathSpec.from_lines("gitwildmatch", ignore_patterns)
        return spec
    except Exception:
        return None


def should_ignore(path: str, ignore_spec: Optional[pathspec.PathSpec], ignored_dirs: List[str], source_dir: str) -> bool:
    """
    Determine if a given path should be ignored based on ignore_spec and ignored_dirs.
    - path: absolute path
    - ignore_spec: PathSpec object or None
    - ignored_dirs: list of directory names to ignore
    - source_dir: root source directory absolute path
    """
    rel_path = os.path.relpath(path, source_dir)
    parts = rel_path.split(os.sep)

    # Always ignore if any part matches ignored_dirs
    for part in parts:
        if part in ignored_dirs:
            return True

    # If ignore_spec exists, use it to check
    if ignore_spec:
        # pathspec expects posix style paths
        rel_path_posix = rel_path.replace(os.sep, "/")
        # Check both file and dir ignoring
        if ignore_spec.match_file(rel_path_posix):
            return True

    return False


class FileInfo(BaseModel):
    name: str
    path: str

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


@router.get("/api/list-files", response_model=List[FileInfo])
async def list_files_in_directory(
    dir_path: str
):
    """
    List all files (not directories) under the specified directory.
    If dir_path is a file, return info of that file.
    """
    if not await aiofiles.os.path.exists(dir_path):
        raise HTTPException(status_code=404, detail="Path not found")

    # If path is a file, return info of the file
    if await aiofiles.os.path.isfile(dir_path):
        file_name = os.path.basename(dir_path)
        return [FileInfo(name=file_name, path=dir_path)]

    # If not a directory, error
    if not await aiofiles.os.path.isdir(dir_path):
        raise HTTPException(status_code=400, detail="Provided path is neither a directory nor a file")

    # Else, list all files under directory
    try:
        entries = await aiofiles.os.listdir(dir_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    result = []
    for entry in entries:
        full_path = os.path.join(dir_path, entry)
        try:
            if await aiofiles.os.path.isfile(full_path):
                result.append(FileInfo(name=entry, path=full_path))
        except Exception:
            continue  # ignore errors per file

    return result


@router.post("/api/file/{path:path}")
async def create_file(
    path: str,
    request: Request,
    project_path: str = Depends(get_project_path)
):
    """
    Create a new file at the specified path with optional initial content.
    """
    try:
        data = await request.json()
        content = data.get("content", "")

        full_path = os.path.join(project_path, path)
        dir_path = os.path.dirname(full_path)

        # Check if file already exists
        if await aiofiles.os.path.exists(full_path):
            raise HTTPException(status_code=409, detail=f"File already exists at {path}")

        # Ensure the directory exists asynchronously
        if not await aiofiles.os.path.exists(dir_path):
            await aiofiles.os.makedirs(dir_path, exist_ok=True)
        elif not await aiofiles.os.path.isdir(dir_path):
            raise HTTPException(status_code=400, detail=f"Path conflict: {dir_path} exists but is not a directory.")

        # Write the file content asynchronously
        async with aiofiles.open(full_path, 'w', encoding='utf-8') as f:
            await f.write(content)

        return {"message": f"Successfully created {path}"}
    except HTTPException as http_exc:  # Re-raise HTTP exceptions
        raise http_exc
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/directory/{path:path}")
async def create_directory(
    path: str,
    project_path: str = Depends(get_project_path)
):
    """
    Create a new directory at the specified path.
    """
    try:
        full_path = os.path.join(project_path, path)
        
        # Check if directory already exists
        if await aiofiles.os.path.exists(full_path):
            if await aiofiles.os.path.isdir(full_path):
                return {"message": f"Directory already exists at {path}"}
            else:
                raise HTTPException(status_code=409, detail=f"A file already exists at {path}")
        
        # Create the directory and any necessary parent directories
        await aiofiles.os.makedirs(full_path, exist_ok=True)
        
        return {"message": f"Successfully created directory {path}"}
    except HTTPException as http_exc:  # Re-raise HTTP exceptions
        raise http_exc
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/api/search-in-files")
async def search_in_files(
    query: str = Query(..., description="Search text"),
    project_path: str = Depends(get_project_path)
):
    """
    Search for files under the project path containing the given query string.
    Returns list of file paths.
    """
    matched_files = []
    ignore_spec = load_ignore_spec(project_path)

    for root, dirs, files in os.walk(project_path):
        # Filter ignored directories in-place to avoid descending into them
        dirs[:] = [d for d in dirs if not should_ignore(os.path.join(root, d), ignore_spec, DEFAULT_IGNORED_DIRS, project_path)]

        for file in files:
            file_path = os.path.join(root, file)
            if should_ignore(file_path, ignore_spec, DEFAULT_IGNORED_DIRS, project_path):
                continue
            try:
                async def read_and_check(fp):
                    try:
                        async with aiofiles.open(fp, mode='r', encoding='utf-8', errors='ignore') as f:
                            content = await f.read()
                            return query in content
                    except Exception:
                        return False

                found = await read_and_check(file_path)
                if found:
                    matched_files.append(os.path.relpath(file_path, project_path))
            except Exception:
                continue  # ignore read errors

    return {"files": matched_files}
