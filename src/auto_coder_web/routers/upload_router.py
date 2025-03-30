import os
import hashlib
import time
from fastapi import APIRouter, UploadFile, File, HTTPException, Request
from fastapi.responses import JSONResponse
from pathlib import Path
from typing import Optional

router = APIRouter()

async def get_project_path(request: Request) -> str:
    """从FastAPI请求上下文中获取项目路径"""
    return request.app.state.project_path

async def get_upload_path(project_path: str) -> Path:
    """获取上传目录路径"""
    upload_path = Path(project_path) / ".auto-coder" / "auto-coder.web" / "uploads"
    upload_path.mkdir(parents=True, exist_ok=True)
    return upload_path

def generate_filename(file: UploadFile) -> str:
    """生成唯一的文件名: md5(原始文件名) + 时间戳"""
    filename_hash = hashlib.md5(file.filename.encode()).hexdigest()
    timestamp = int(time.time())
    ext = os.path.splitext(file.filename)[1]
    return f"{filename_hash}_{timestamp}{ext}"

@router.post("/api/upload/image")
async def upload_image(
    request: Request,
    file: UploadFile = File(...)
):
    """上传图片文件"""
    if not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="Only image files are allowed")
    
    project_path = await get_project_path(request)
    upload_path = await get_upload_path(project_path)
    
    filename = generate_filename(file)
    file_path = upload_path / filename
    
    try:
        contents = await file.read()
        with open(file_path, 'wb') as f:
            f.write(contents)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error uploading file: {str(e)}")
    
    return JSONResponse({
        "success": True,
        "path": os.path.join(".",".auto-coder", "auto-coder.web", "uploads", filename)
    })