from fastapi import APIRouter, Request, HTTPException, Depends
from autocoder.auto_coder_runner import get_memory, configure
import asyncio

router = APIRouter()


@router.get("/api/conf")
async def get_conf():
    """获取配置信息"""
    memory = get_memory()
    return {"conf": memory["conf"]}


@router.post("/api/conf")
async def config(
    request: Request,
):
    """更新配置信息"""
    data = await request.json()
    try:
        for key, value in data.items():
            await asyncio.to_thread(configure, f"{key}:{str(value)}")
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/api/conf/{key}")
async def delete_config(
    key: str
):
    """删除配置项"""
    try:
        await asyncio.to_thread(configure, f"/drop {key}")
        return {"status": "success"}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
