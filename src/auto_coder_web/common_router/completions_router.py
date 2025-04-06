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
import aiofiles
import aiofiles.os

from auto_coder_web.file_cacher.file_cacher import FileCacher

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

async def get_file_cacher(request: Request) -> FileCacher:
    return request.app.state.file_cacher

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
    project_path: str = Depends(get_project_path),
    file_cacher: FileCacher = Depends(get_file_cacher)
):
    """获取文件名补全"""
    patterns = [name]
    matches = await file_cacher.get_files(patterns)
    completions = []
    project_root = project_path
    for file_name in matches:
        display_name = os.path.basename(file_name)
        relative_path = os.path.relpath(file_name, project_root)

        completions.append(CompletionItem(
            name=relative_path,
            path=relative_path,
            display=display_name,
            location=relative_path
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
