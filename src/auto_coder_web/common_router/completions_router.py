import os
import glob
import json
import fnmatch
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
from autocoder.common.ignorefiles.ignore_file_utils import should_ignore
from autocoder.common.directory_cache.cache import DirectoryCache, initialize_cache
import json
import asyncio
import aiofiles
import aiofiles.os
import logging

logger = logging.getLogger(__name__)
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

async def find_files_in_project(patterns: List[str], project_path: str) -> List[str]:
    memory = get_memory()
    active_file_list = memory["current_files"]["files"]
    project_root = project_path
    
    # 确保目录缓存已初始化
    try:
        cache = DirectoryCache.get_instance(project_root)
    except ValueError:
        # 如果缓存未初始化，则初始化它
        initialize_cache(project_root)
        cache = DirectoryCache.get_instance()
    
    # 如果没有提供有效模式，返回过滤后的活动文件列表
    if not patterns or (len(patterns) == 1 and patterns[0] == ""):
        # 使用缓存中的所有文件
        all_files = await cache.query([])
        # 合并活动文件列表和缓存文件
        combined_files = set(all_files)
        combined_files.update([f for f in active_file_list if not should_ignore(f)])
        return list(combined_files)

    matched_files = set()  # 使用集合避免重复
    
    # 1. 首先从活动文件列表中匹配，这通常是最近编辑的文件
    for pattern in patterns:
        for file_path in active_file_list:
            if not should_ignore(file_path) and pattern.lower() in os.path.basename(file_path).lower():
                matched_files.add(file_path)
    
    # 2. 使用DirectoryCache进行高效查询
    cache_patterns = []
    for pattern in patterns:
        # 处理通配符模式
        if "*" in pattern or "?" in pattern:
            cache_patterns.append(pattern)
        else:
            # 对于非通配符模式，我们添加一个通配符以进行部分匹配
            cache_patterns.append(f"*{pattern}*")
    
    # 执行缓存查询
    if cache_patterns:
        try:
            cache_results = await cache.query(cache_patterns)
            matched_files.update(cache_results)
        except Exception as e:
            logger.error(f"Error querying directory cache: {e}", exc_info=True)
    
    # 3. 如果pattern本身是文件路径，直接添加
    for pattern in patterns:
        if os.path.exists(pattern) and os.path.isfile(pattern) and not should_ignore(pattern):
            matched_files.add(os.path.abspath(pattern))

    return list(matched_files)

async def get_symbol_list_async(project_path: str) -> List[SymbolItem]:
    """Asynchronously reads the index file and extracts symbols."""
    list_of_symbols = []
    index_file = os.path.join(project_path, ".auto-coder", "index.json")

    if await aiofiles.os.path.exists(index_file):
        try:
            async with aiofiles.open(index_file, "r", encoding='utf-8') as file:
                content = await file.read()
                index_data = json.loads(content)
        except (IOError, json.JSONDecodeError):
             # Handle file reading or JSON parsing errors
             index_data = {}
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
    # 直接调用异步函数，不需要使用asyncio.to_thread
    matches = await find_files_in_project(patterns, project_path)
    completions = []
    project_root = project_path
    for file_name in matches:
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
    symbols = await get_symbol_list_async(project_path)
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
