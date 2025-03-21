from fastapi import APIRouter, Request, HTTPException, Depends

router = APIRouter()

async def get_auto_coder_runner(request: Request):
    """获取AutoCoderRunner实例作为依赖"""
    return request.app.state.auto_coder_runner

@router.get("/api/conf")
async def get_conf(
    auto_coder_runner = Depends(get_auto_coder_runner)
):
    """获取配置信息"""
    return {"conf": auto_coder_runner.get_config()}

@router.post("/api/conf")
async def config(
    request: Request,
    auto_coder_runner = Depends(get_auto_coder_runner)
):
    """更新配置信息"""
    data = await request.json()
    try:
        for key, value in data.items():
            auto_coder_runner.configure(key, str(value))
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/api/conf/{key}")
async def delete_config(
    key: str,
    auto_coder_runner = Depends(get_auto_coder_runner)
):
    """删除配置项"""
    try:
        result = auto_coder_runner.drop_config(key)
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e)) 