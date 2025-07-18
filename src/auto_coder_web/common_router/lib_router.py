from fastapi import APIRouter, Depends, Request, HTTPException, Body
from pydantic import BaseModel
from typing import Dict, List, Optional
import os
import git
import json
from pathlib import Path
from autocoder.common.core_config import get_memory_manager

router = APIRouter()

# 定义依赖项函数
async def get_project_path(request: Request) -> str:
    """获取项目路径作为依赖"""
    return request.app.state.project_path

async def get_memory_manager_instance(request: Request):
    """获取MemoryManager实例作为依赖"""
    project_path = request.app.state.project_path
    return get_memory_manager(project_path)

# 模型定义
class LibAddRequest(BaseModel):
    lib_name: str

class LibRemoveRequest(BaseModel):
    lib_name: str

class LibProxyRequest(BaseModel):
    proxy_url: Optional[str] = None

class LibGetRequest(BaseModel):
    package_name: str

class LibResponse(BaseModel):
    success: bool
    message: str
    data: Optional[Dict] = None

class LibItem(BaseModel):
    domain: str
    username: str
    lib_name: str
    full_path: str
    is_added: bool

@router.get("/api/lib/list", response_model=LibResponse)
async def list_libs(
    request: Request,
    manager = Depends(get_memory_manager_instance)
):
    """列出所有已添加的库"""
    libs = manager.get_libs()
    
    return LibResponse(
        success=True,
        message="Libraries retrieved successfully",
        data={"libraries": list(libs.keys())}
    )

@router.post("/api/lib/add", response_model=LibResponse)
async def add_lib(
    request: Request,
    lib_request: LibAddRequest,
    manager = Depends(get_memory_manager_instance),
    project_path: str = Depends(get_project_path)
):
    """添加一个库"""
    lib_name = lib_request.lib_name.strip()
    
    # 初始化目录
    lib_dir = os.path.join(project_path, ".auto-coder", "libs")
    llm_friendly_packages_dir = os.path.join(lib_dir, "llm_friendly_packages")
    
    if not os.path.exists(lib_dir):
        os.makedirs(lib_dir, exist_ok=True)
        
    # 已存在的库直接返回
    if manager.has_lib(lib_name):
        return LibResponse(
            success=True,
            message=f"Library {lib_name} is already added"
        )
        
    # 克隆仓库(如果不存在)
    if not os.path.exists(llm_friendly_packages_dir):
        try:
            proxy_url = manager.get_lib_proxy() or "https://github.com/allwefantasy/llm_friendly_packages"
            git.Repo.clone_from(
                proxy_url,
                llm_friendly_packages_dir,
            )
        except git.GitCommandError as e:
            return LibResponse(
                success=False,
                message=f"Error cloning repository: {str(e)}"
            )
    
    # 添加库到管理器
    manager.add_lib(lib_name, {})
    
    return LibResponse(
        success=True,
        message=f"Added library: {lib_name}"
    )

@router.post("/api/lib/remove", response_model=LibResponse)
async def remove_lib(
    request: Request,
    lib_request: LibRemoveRequest,
    manager = Depends(get_memory_manager_instance)
):
    """移除一个库"""
    lib_name = lib_request.lib_name.strip()
    
    if manager.has_lib(lib_name):
        manager.remove_lib(lib_name)
        return LibResponse(
            success=True,
            message=f"Removed library: {lib_name}"
        )
    else:
        return LibResponse(
            success=False,
            message=f"Library {lib_name} is not in the list"
        )

@router.post("/api/lib/set-proxy", response_model=LibResponse)
async def set_proxy(
    request: Request,
    proxy_request: LibProxyRequest = Body(None),
    manager = Depends(get_memory_manager_instance)
):
    """设置代理URL"""
    if proxy_request is None or proxy_request.proxy_url is None:
        # 获取当前代理
        current_proxy = manager.get_lib_proxy() or "No proxy set"
        return LibResponse(
            success=True,
            message=f"Current proxy: {current_proxy}",
            data={"proxy": current_proxy}
        )
    else:
        # 设置代理
        manager.set_lib_proxy(proxy_request.proxy_url)
        return LibResponse(
            success=True,
            message=f"Set proxy to: {proxy_request.proxy_url}"
        )

@router.post("/api/lib/refresh", response_model=LibResponse)
async def refresh_lib(
    request: Request,
    manager = Depends(get_memory_manager_instance),
    project_path: str = Depends(get_project_path)
):
    """刷新llm_friendly_packages仓库"""
    llm_friendly_packages_dir = os.path.join(project_path, ".auto-coder", "libs", "llm_friendly_packages")
    
    if not os.path.exists(llm_friendly_packages_dir):
        return LibResponse(
            success=False,
            message="llm_friendly_packages repository does not exist. Please add a library first to clone it."
        )
        
    try:
        repo = git.Repo(llm_friendly_packages_dir)
        origin = repo.remotes.origin
        proxy_url = manager.get_lib_proxy()
        
        current_url = origin.url
        
        if proxy_url and proxy_url != current_url:
            new_url = proxy_url
            origin.set_url(new_url)
        
        origin.pull()
        return LibResponse(
            success=True,
            message="Successfully updated llm_friendly_packages repository"
        )
    except git.GitCommandError as e:
        return LibResponse(
            success=False,
            message=f"Error updating repository: {str(e)}"
        )

@router.post("/api/lib/get", response_model=LibResponse)
async def get_lib_docs(
    request: Request,
    get_request: LibGetRequest,
    project_path: str = Depends(get_project_path),
    manager = Depends(get_memory_manager_instance)
):
    """获取特定包的文档"""
    package_name = get_request.package_name.strip()
    
    # 使用与auto_coder_runner中相似的逻辑
    lib_dir = os.path.join(project_path, ".auto-coder", "libs")
    llm_friendly_packages_dir = os.path.join(lib_dir, "llm_friendly_packages")
    docs = []
    
    if not os.path.exists(llm_friendly_packages_dir):
        return LibResponse(
            success=False,
            message="llm_friendly_packages repository does not exist"
        )
        
    libs = list(manager.get_libs().keys())
    
    for domain in os.listdir(llm_friendly_packages_dir):
        domain_path = os.path.join(llm_friendly_packages_dir, domain)
        if os.path.isdir(domain_path):
            for username in os.listdir(domain_path):
                username_path = os.path.join(domain_path, username)
                if os.path.isdir(username_path):
                    for lib_name in os.listdir(username_path):
                        lib_path = os.path.join(username_path, lib_name)
                        if (
                            os.path.isdir(lib_path)
                            and (
                                package_name is None
                                or lib_name == package_name
                                or package_name == os.path.join(username, lib_name)
                            )
                            and lib_name in libs
                        ):
                            for root, _, files in os.walk(lib_path):
                                for file in files:
                                    if file.endswith(".md"):
                                        file_path = os.path.join(root, file)
                                        docs.append(str(Path(file_path).relative_to(project_path)))
    
    if docs:
        return LibResponse(
            success=True,
            message=f"Found {len(docs)} markdown files for package: {package_name}",
            data={"docs": docs}
        )
    else:
        return LibResponse(
            success=False,
            message=f"No markdown files found for package: {package_name}"
        )

@router.get("/api/lib/list-all", response_model=LibResponse)
async def list_all_libs(
    request: Request,
    manager = Depends(get_memory_manager_instance),
    project_path: str = Depends(get_project_path)
):
    """列出所有可用的库，包括未添加的库"""
    lib_dir = os.path.join(project_path, ".auto-coder", "libs")
    llm_friendly_packages_dir = os.path.join(lib_dir, "llm_friendly_packages")
    available_libs = []
    
    # 如果仓库不存在，自动下载
    if not os.path.exists(llm_friendly_packages_dir):
        if not os.path.exists(lib_dir):
            os.makedirs(lib_dir, exist_ok=True)
            
        try:
            # 获取代理URL（如果已设置）
            proxy_url = manager.get_lib_proxy() or "https://github.com/allwefantasy/llm_friendly_packages"
            # 克隆仓库
            git.Repo.clone_from(
                proxy_url,
                llm_friendly_packages_dir,
            )
        except git.GitCommandError as e:
            return LibResponse(
                success=False,
                message=f"Error cloning repository: {str(e)}",
                data={"libraries": []}
            )
    
    # 获取已添加的库列表
    added_libs = set(manager.get_libs().keys())
    
    # 遍历所有domain目录
    for domain in os.listdir(llm_friendly_packages_dir):
        domain_path = os.path.join(llm_friendly_packages_dir, domain)
        if os.path.isdir(domain_path):
            # 遍历所有username目录
            for username in os.listdir(domain_path):
                username_path = os.path.join(domain_path, username)
                if os.path.isdir(username_path):
                    # 遍历所有lib_name目录
                    for lib_name in os.listdir(username_path):
                        lib_path = os.path.join(username_path, lib_name)
                        if os.path.isdir(lib_path):
                            # 检查是否有Markdown文件
                            has_md_files = False
                            for root, _, files in os.walk(lib_path):
                                if any(file.endswith('.md') for file in files):
                                    has_md_files = True
                                    break
                            
                            if has_md_files:
                                lib_item = LibItem(
                                    domain=domain,
                                    username=username,
                                    lib_name=lib_name,
                                    full_path=f"{username}/{lib_name}",
                                    is_added=lib_name in added_libs
                                )
                                available_libs.append(lib_item.dict())
    
    # 按domain和username分组排序
    available_libs.sort(key=lambda x: (x["domain"], x["username"], x["lib_name"]))
    
    return LibResponse(
        success=True,
        message=f"Found {len(available_libs)} available libraries",
        data={"libraries": available_libs}
    ) 