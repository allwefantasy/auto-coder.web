import os
import shutil
from fastapi import APIRouter, Request, HTTPException, Depends
from auto_coder_web.file_manager import get_directory_tree, read_file_content

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
        if os.path.exists(full_path):
            if os.path.isdir(full_path):
                shutil.rmtree(full_path)
            else:
                os.remove(full_path)
            return {"message": f"Successfully deleted {path}"}
        else:
            raise HTTPException(
                status_code=404, detail="File not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/api/files")
async def get_files(
    project_path: str = Depends(get_project_path)
):
    tree = get_directory_tree(project_path)
    # print(tree)
    return {"tree": tree}

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

        # Ensure the directory exists
        os.makedirs(os.path.dirname(full_path), exist_ok=True)

        # Write the file content
        with open(full_path, 'w', encoding='utf-8') as f:
            f.write(content)

        return {"message": f"Successfully updated {path}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/api/file/{path:path}")
async def get_file_content(
    path: str,
    project_path: str = Depends(get_project_path)
):
    content = read_file_content(project_path, path)
    if content is None:
        raise HTTPException(
            status_code=404, detail="File not found or cannot be read")

    return {"content": content} 