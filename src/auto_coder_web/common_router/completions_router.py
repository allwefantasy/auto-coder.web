import os
import glob
import json
from typing import List
from pydantic import BaseModel
from fastapi import APIRouter, Query, Request, Depends
from auto_coder_web.types import CompletionItem, CompletionResponse
from autocoder.index.symbols_utils import (
    extract_symbols,
    symbols_info_to_str,
    SymbolsInfo,
    SymbolType,
)

from autocoder.auto_coder_runner import get_memory
import json
import asyncio


router = APIRouter()

class SymbolItem(BaseModel):
    symbol_name: str
    symbol_type: SymbolType
    file_name: str

async def get_auto_coder_runner(request: Request):
    """获取AutoCoderRunner实例作为依赖"""
    return request.app.state.auto_coder_runner


async def get_project_path(request: Request):
    """获取项目路径作为依赖"""
    return request.app.state.project_path    

def find_files_in_project(patterns: List[str], project_path: str) -> List[str]:
    memory = get_memory()
    default_exclude_dirs = [".git", "node_modules", "dist", "build", "__pycache__", ".venv", ".auto-coder"]
    active_file_list = memory["current_files"]["files"]
    final_exclude_dirs = default_exclude_dirs + memory.get("exclude_dirs", [])
    project_root = project_path
    
    def should_exclude_path(path: str) -> bool:
        """检查路径是否应该被排除（路径中包含排除目录或以.开头的目录/文件）"""
        # 处理相对/绝对路径
        rel_path = path
        if os.path.isabs(path):
            try:
                rel_path = os.path.relpath(path, project_root)
            except ValueError:
                rel_path = path
                
        # 检查文件或目录本身是否以.开头
        if os.path.basename(rel_path).startswith('.'):
            return True
            
        # 检查路径中是否包含排除目录
        path_parts = rel_path.split(os.sep)
        return any(part in final_exclude_dirs or part.startswith('.') for part in path_parts)

    # 如果没有提供有效模式，返回过滤后的活动文件列表
    if not patterns or (len(patterns) == 1 and patterns[0] == ""):
        return [f for f in active_file_list if not should_exclude_path(f)]

    matched_files = set()  # 使用集合避免重复

    for pattern in patterns:
        # 1. 从活动文件列表中匹配
        for file_path in active_file_list:
            if not should_exclude_path(file_path) and pattern in os.path.basename(file_path):
                matched_files.add(file_path)
        
        # 2. 如果是通配符模式，使用glob
        if "*" in pattern or "?" in pattern:
            for file_path in glob.glob(pattern, recursive=True):
                if os.path.isfile(file_path) and not should_exclude_path(file_path):
                    matched_files.add(os.path.abspath(file_path))
            continue
        
        # 3. 使用os.walk在文件系统中查找
        for root, dirs, files in os.walk(project_root, followlinks=True):
            # 过滤不需要遍历的目录
            dirs[:] = [d for d in dirs if d not in final_exclude_dirs and not d.startswith('.')]
            
            if should_exclude_path(root):
                continue
            
            # 查找匹配文件
            for file in files:
                if pattern in file:
                    file_path = os.path.join(root, file)
                    if not should_exclude_path(file_path):
                        matched_files.add(file_path)
        
        # 4. 如果pattern本身是文件路径
        if os.path.exists(pattern) and os.path.isfile(pattern) and not should_exclude_path(pattern):
            matched_files.add(os.path.abspath(pattern))

    return list(matched_files)

def get_symbol_list(project_path: str) -> List[SymbolItem]:
    list_of_symbols = []
    index_file = os.path.join(
        project_path, ".auto-coder", "index.json")

    if os.path.exists(index_file):
        with open(index_file, "r") as file:
            index_data = json.load(file)
    else:
        index_data = {}

    for item in index_data.values():
        symbols_str = item["symbols"]
        module_name = item["module_name"]
        info1 = extract_symbols(symbols_str)
        for name in info1.classes:
            list_of_symbols.append(
                SymbolItem(
                    symbol_name=name,
                    symbol_type=SymbolType.CLASSES,
                    file_name=module_name,
                )
            )
        for name in info1.functions:
            list_of_symbols.append(
                SymbolItem(
                    symbol_name=name,
                    symbol_type=SymbolType.FUNCTIONS,
                    file_name=module_name,
                )
            )
        for name in info1.variables:
            list_of_symbols.append(
                SymbolItem(
                    symbol_name=name,
                    symbol_type=SymbolType.VARIABLES,
                    file_name=module_name,
                )
            )
    return list_of_symbols

@router.get("/api/completions/files")
async def get_file_completions(
    name: str = Query(...),
    project_path: str = Depends(get_project_path)
):
    """获取文件名补全"""
    patterns = [name]
    matches = await asyncio.to_thread(find_files_in_project, patterns,project_path)
    completions = []
    project_root = project_path
    for file_name in matches:
        # path_parts = file_name.split(os.sep)
        # 只显示最后三层路径，让显示更简洁
        display_name = os.path.basename(file_name)
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
    project_path: str = Depends(get_project_path)
):
    """获取符号补全"""
    symbols = await asyncio.to_thread(get_symbol_list, project_path)
    matches = []

    for symbol in symbols:
        if name.lower() in symbol.symbol_name.lower():
            relative_path = os.path.relpath(
                symbol.file_name, project_path)
            matches.append(CompletionItem(
                name=symbol.symbol_name,
                path=relative_path,
                display=f"{symbol.symbol_name}(location: {relative_path})"
            ))
    return CompletionResponse(completions=matches) 
