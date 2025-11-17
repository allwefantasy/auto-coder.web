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

async def scan_directory_for_files(directory: str) -> List[str]:
    """异步递归扫描目录，返回所有非忽略的文件"""
    all_files = []
    
    try:
        # 使用 os.walk 遍历目录（在线程池中运行以避免阻塞）
        def walk_directory():
            files = []
            for root, dirs, filenames in os.walk(directory):
                # 过滤掉应该忽略的目录
                dirs[:] = [d for d in dirs if not should_ignore(os.path.join(root, d))]
                
                for filename in filenames:
                    file_path = os.path.join(root, filename)
                    if not should_ignore(file_path):
                        files.append(file_path)
            return files
        
        all_files = await asyncio.to_thread(walk_directory)
    except Exception as e:
        logger.error(f"Error scanning directory {directory}: {e}", exc_info=True)
    
    return all_files

async def find_files_in_project(patterns: List[str], project_path: str) -> List[str]:
    memory = get_memory()
    active_file_list = memory["current_files"]["files"]
    project_root = project_path
    
    # 如果没有提供有效模式，返回所有文件
    if not patterns or (len(patterns) == 1 and patterns[0] == ""):
        # 扫描整个项目目录
        all_files = await scan_directory_for_files(project_root)
        # 合并活动文件列表
        combined_files = set(all_files)
        combined_files.update([f for f in active_file_list if not should_ignore(f)])
        return list(combined_files)

    matched_files = set()  # 使用集合避免重复
    
    # 1. 首先从活动文件列表中匹配，这通常是最近编辑的文件
    for pattern in patterns:
        for file_path in active_file_list:
            if not should_ignore(file_path):
                basename = os.path.basename(file_path)
                # 支持通配符和普通字符串匹配
                if "*" in pattern or "?" in pattern:
                    if fnmatch.fnmatch(basename.lower(), pattern.lower()):
                        matched_files.add(file_path)
                elif pattern.lower() in basename.lower():
                    matched_files.add(file_path)
    
    # 2. 扫描项目目录查找匹配的文件
    all_project_files = await scan_directory_for_files(project_root)
    for pattern in patterns:
        for file_path in all_project_files:
            basename = os.path.basename(file_path)
            # 支持通配符和普通字符串匹配
            if "*" in pattern or "?" in pattern:
                if fnmatch.fnmatch(basename.lower(), pattern.lower()):
                    matched_files.add(file_path)
            elif pattern.lower() in basename.lower():
                matched_files.add(file_path)
    
    # 3. 如果pattern本身是文件路径，直接添加
    for pattern in patterns:
        # 尝试相对路径和绝对路径
        abs_pattern = os.path.join(project_root, pattern) if not os.path.isabs(pattern) else pattern
        if os.path.exists(abs_pattern) and os.path.isfile(abs_pattern) and not should_ignore(abs_pattern):
            matched_files.add(abs_pattern)

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
