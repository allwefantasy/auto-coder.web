import os
from fastapi import APIRouter, Query, Request, Depends
from auto_coder_web.types import CompletionItem, CompletionResponse

router = APIRouter()

async def get_auto_coder_runner(request: Request):
    """获取AutoCoderRunner实例作为依赖"""
    return request.app.state.auto_coder_runner

@router.get("/api/completions/files")
async def get_file_completions(
    name: str = Query(...),
    auto_coder_runner = Depends(get_auto_coder_runner)
):
    """获取文件名补全"""
    matches = auto_coder_runner.find_files_in_project([name])
    completions = []
    project_root = auto_coder_runner.project_path
    for file_name in matches:
        path_parts = file_name.split(os.sep)
        # 只显示最后三层路径，让显示更简洁
        display_name = os.sep.join(
            path_parts[-3:]) if len(path_parts) > 3 else file_name
        relative_path = os.path.relpath(file_name, project_root)

        completions.append(CompletionItem(
            name=relative_path,  # 给补全项一个唯一标识
            path=relative_path,  # 实际用于替换的路径
            display=display_name,  # 显示的简短路径
            location=relative_path  # 完整的相对路径信息
        ))
    return CompletionResponse(completions=completions)

@router.get("/api/completions/symbols")
async def get_symbol_completions(
    name: str = Query(...),
    auto_coder_runner = Depends(get_auto_coder_runner)
):
    """获取符号补全"""
    symbols = auto_coder_runner.get_symbol_list()
    matches = []

    for symbol in symbols:
        if name.lower() in symbol.symbol_name.lower():
            relative_path = os.path.relpath(
                symbol.file_name, auto_coder_runner.project_path)
            matches.append(CompletionItem(
                name=symbol.symbol_name,
                path=f"{symbol.symbol_name} ({relative_path}/{symbol.symbol_type.value})",
                display=f"{symbol.symbol_name}(location: {relative_path})"
            ))
    return CompletionResponse(completions=matches) 