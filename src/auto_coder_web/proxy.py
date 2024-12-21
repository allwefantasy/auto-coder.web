from fastapi import FastAPI, Request, HTTPException, Response, Query
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi import WebSocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import uvicorn
import httpx
import uuid
from typing import Optional, Dict, List, Any
import os
import argparse
import aiofiles
import pkg_resources
import asyncio
import pathlib
import time
import sys
from .file_group import FileGroupManager
from .file_manager import get_directory_tree
from .auto_coder_runner import AutoCoderRunner
from autocoder.agent.auto_filegroup import AutoFileGroup

from rich.console import Console
from prompt_toolkit.shortcuts import radiolist_dialog
from prompt_toolkit.formatted_text import HTML
import subprocess
from prompt_toolkit import prompt
from pydantic import BaseModel
from autocoder.utils.log_capture import LogCapture
from typing import Optional, Dict, List, Any
from .terminal import terminal_manager
from autocoder.common import AutoCoderArgs
import json
import re
import yaml
import git
import hashlib
from datetime import datetime
from autocoder.utils import operate_config_api


class EventGetRequest(BaseModel):
    request_id: str


class EventResponseRequest(BaseModel):
    request_id: str
    event: Dict[str, str]
    response: str


class CompletionItem(BaseModel):
    name: str
    path: str
    display: str
    location: Optional[str] = None


class CompletionResponse(BaseModel):
    completions: List[CompletionItem]


class ChatList(BaseModel):
    name: str
    messages: List[Dict[str, Any]]

class HistoryQuery(BaseModel):
    query: str
    timestamp: Optional[str] = None

class ValidationResponse(BaseModel):
    success: bool
    message: str = ""
    queries: List[HistoryQuery] = []

class QueryWithFileNumber(BaseModel):
    query: str
    timestamp: Optional[str] = None
    file_number: int  
    response: Optional[str] = None  
    urls: Optional[List[str]] = None 

class ValidationResponseWithFileNumbers(BaseModel):
    success: bool
    message: str = ""
    queries: List[QueryWithFileNumber] = []

class FileContentResponse(BaseModel):
    success: bool
    message: str = ""
    content: Optional[str] = None

class FileChange(BaseModel):
    path: str  
    change_type: str   # "added" 或 "modified"

class CommitDiffResponse(BaseModel):
    success: bool
    message: str = ""
    diff: Optional[str] = None
    file_changes: Optional[List[FileChange]] = None

def check_environment():
    """Check and initialize the required environment"""
    console = Console()
    console.print("\n[blue]Initializing the environment...[/blue]")

    def check_project():
        """Check if the current directory is initialized as an auto-coder project"""
        def print_status(message, status):
            if status == "success":
                console.print(f"✓ {message}", style="green")
            elif status == "warning":
                console.print(f"! {message}", style="yellow")
            elif status == "error":
                console.print(f"✗ {message}", style="red")
            else:
                console.print(f"  {message}")

        first_time = False
        if not os.path.exists("actions") or not os.path.exists(".auto-coder"):
            first_time = True
            print_status("Project not initialized", "warning")
            init_choice = input(
                "  Do you want to initialize the project? (y/n): ").strip().lower()
            if init_choice == "y":
                try:
                    if not os.path.exists("actions"):
                        os.makedirs("actions", exist_ok=True)
                        print_status("Created actions directory", "success")

                    if not os.path.exists(".auto-coder"):
                        os.makedirs(".auto-coder", exist_ok=True)
                        print_status(
                            "Created .auto-coder directory", "success")

                    subprocess.run(
                        ["auto-coder", "init", "--source_dir", "."], check=True)
                    print_status("Project initialized successfully", "success")
                except subprocess.CalledProcessError:
                    print_status("Failed to initialize project", "error")
                    print_status(
                        "Please try to initialize manually: auto-coder init --source_dir .", "warning")
                    return False
            else:
                print_status("Exiting due to no initialization", "warning")
                return False

        print_status("Project initialization check complete", "success")
        return True

    if not check_project():
        return False

    def print_status(message, status):
        if status == "success":
            console.print(f"✓ {message}", style="green")
        elif status == "warning":
            console.print(f"! {message}", style="yellow")
        elif status == "error":
            console.print(f"✗ {message}", style="red")
        else:
            console.print(f"  {message}")

    # Check if Ray is running
    print_status("Checking Ray", "")
    ray_status = subprocess.run(
        ["ray", "status"], capture_output=True, text=True)
    if ray_status.returncode != 0:
        print_status("Ray is not running", "warning")
        try:
            subprocess.run(["ray", "start", "--head"], check=True)
            print_status("Ray started successfully", "success")
        except subprocess.CalledProcessError:
            print_status("Failed to start Ray", "error")
            return False

    # Check if deepseek_chat model is available
    print_status("Checking deepseek_chat model", "")
    try:
        result = subprocess.run(
            ["easy-byzerllm", "chat", "deepseek_chat", "你好"],
            capture_output=True,
            text=True,
            timeout=30,
        )
        if result.returncode == 0:
            print_status("deepseek_chat model is available", "success")
            print_status("Environment check complete", "success")
            return True
    except subprocess.TimeoutExpired:
        print_status("Model check timeout", "error")
    except subprocess.CalledProcessError:
        print_status("Model check error", "error")
    except Exception as e:
        print_status(f"Unexpected error: {str(e)}", "error")

    print_status("deepseek_chat model is not available", "warning")

    # If deepseek_chat is not available, prompt user to choose a provider
    choice = radiolist_dialog(
        title="Select Provider",
        text="Please select a provider for deepseek_chat model:",
        values=[
            ("1", "硅基流动(https://siliconflow.cn)"),
            ("2", "Deepseek官方(https://www.deepseek.com/)"),
        ],
    ).run()

    if choice is None:
        print_status("No provider selected", "error")
        return False

    api_key = prompt(HTML("<b>Please enter your API key: </b>"))

    if choice == "1":
        print_status("Deploying model with 硅基流动", "")
        deploy_cmd = [
            "easy-byzerllm",
            "deploy",
            "deepseek-ai/deepseek-v2-chat",
            "--token",
            api_key,
            "--alias",
            "deepseek_chat",
        ]
    else:
        print_status("Deploying model with Deepseek官方", "")
        deploy_cmd = [
            "byzerllm",
            "deploy",
            "--pretrained_model_type",
            "saas/openai",
            "--cpus_per_worker",
            "0.001",
            "--gpus_per_worker",
            "0",
            "--worker_concurrency",
            "1000",
            "--num_workers",
            "1",
            "--infer_params",
            f"saas.base_url=https://api.deepseek.com/v1 saas.api_key={api_key} saas.model=deepseek-chat",
            "--model",
            "deepseek_chat",
        ]

    try:
        subprocess.run(deploy_cmd, check=True)
        print_status("Model deployed successfully", "success")
    except subprocess.CalledProcessError:
        print_status("Failed to deploy model", "error")
        return False

    # Validate the deployment
    print_status("Validating model deployment", "")
    try:
        validation_result = subprocess.run(
            ["easy-byzerllm", "chat", "deepseek_chat", "你好"],
            capture_output=True,
            text=True,
            timeout=30,
            check=True,
        )
        print_status("Model validation successful", "success")
    except (subprocess.TimeoutExpired, subprocess.CalledProcessError):
        print_status("Model validation failed", "error")
        print_status(
            "You may need to try manually: easy-byzerllm chat deepseek_chat 你好", "warning")
        return False

    print_status("Environment initialization complete", "success")
    return True


class ProxyServer:
    def __init__(self, project_path: str, quick: bool = False):
        self.app = FastAPI()

        if not quick:
            # Check the environment if not in quick mode
            if not check_environment():
                print(
                    "\033[31mEnvironment check failed. Some features may not work properly.\033[0m")
        self.setup_middleware()

        self.setup_static_files()

        self.setup_routes()
        self.client = httpx.AsyncClient()
        self.project_path = project_path
        self.auto_coder_runner = AutoCoderRunner(project_path)
        self.file_group_manager = FileGroupManager(self.auto_coder_runner)

    def setup_middleware(self):
        self.app.add_middleware(
            CORSMiddleware,
            allow_origins=["*"],
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )

    def setup_static_files(self):
        self.index_html_path = pkg_resources.resource_filename(
            "auto_coder_web", "web/index.html")
        self.resource_dir = os.path.dirname(self.index_html_path)
        self.static_dir = os.path.join(self.resource_dir, "static")
        self.app.mount(
            "/static", StaticFiles(directory=self.static_dir), name="static")

    def setup_routes(self):
        @self.app.on_event("shutdown")
        async def shutdown_event():
            await self.client.aclose()

        @self.app.websocket("/ws/terminal")
        async def terminal_websocket(websocket: WebSocket):
            session_id = str(uuid.uuid4())
            await terminal_manager.handle_websocket(websocket, session_id)

        @self.app.delete("/api/files/{path:path}")
        async def delete_file(path: str):
            try:
                full_path = os.path.join(self.project_path, path)
                if os.path.exists(full_path):
                    if os.path.isdir(full_path):
                        import shutil
                        shutil.rmtree(full_path)
                    else:
                        os.remove(full_path)
                    return {"message": f"Successfully deleted {path}"}
                else:
                    raise HTTPException(
                        status_code=404, detail="File not found")
            except Exception as e:
                raise HTTPException(status_code=500, detail=str(e))

        @self.app.get("/", response_class=HTMLResponse)
        async def read_root():
            if os.path.exists(self.index_html_path):
                async with aiofiles.open(self.index_html_path, "r") as f:
                    content = await f.read()
                return HTMLResponse(content=content)
            return HTMLResponse(content="<h1>Welcome to Proxy Server</h1>")

        @self.app.get("/api/project-path")
        async def get_project_path():
            return {"project_path": self.project_path}

        def get_project_runner(project_path: str) -> AutoCoderRunner:
            return self.projects[project_path]

        @self.app.post("/api/file-groups")
        async def create_file_group(request: Request):
            data = await request.json()
            name = data.get("name")
            description = data.get("description", "")
            group = await self.file_group_manager.create_group(name, description)
            return group

        @self.app.post("/api/file-groups/auto")
        async def auto_create_groups(request: Request):            
            try:
                data = await request.json()
                file_size_limit = data.get("file_size_limit", 100)
                skip_diff = data.get("skip_diff", False)

                # Create AutoFileGroup instance
                auto_grouper = AutoFileGroup(
                    operate_config_api.get_llm(self.auto_coder_runner.memory),
                    self.project_path,
                    skip_diff=skip_diff,
                    file_size_limit=file_size_limit
                )

                # Get groups
                groups = auto_grouper.group_files()

                # Create groups using file_group_manager
                for group in groups:
                    await self.file_group_manager.create_group(
                        name=group.name,
                        description=group.description
                    )
                    # Add files to the group
                    await self.file_group_manager.add_files_to_group(
                        group.name,
                        group.urls
                    )

                return {"status": "success", "message": f"Created {len(groups)} groups"}
            except Exception as e:
                raise HTTPException(status_code=500, detail=str(e))

        @self.app.get("/api/os")
        async def get_os():
            return {"os": os.name}

        @self.app.post("/api/file-groups/switch")
        async def switch_file_groups(request: Request):
            data = await request.json()
            group_names = data.get("group_names", [])
            result = await self.file_group_manager.switch_groups(group_names)
            return result

        @self.app.get("/api/conf/keys")
        async def get_conf_keys():
            """Get all available configuration keys from AutoCoderArgs"""
            field_info = AutoCoderArgs.model_fields
            keys = []
            for field_name, field in field_info.items():
                field_type = field.annotation
                type_str = str(field_type)
                if "Optional" in type_str:
                    # Extract the inner type for Optional fields
                    inner_type = type_str.split("[")[1].split("]")[0]
                    if "Union" in inner_type:
                        # Handle Union types
                        types = [t.strip() for t in inner_type.split(",")[
                            :-1]]  # Remove Union
                        type_str = " | ".join(types)
                    else:
                        type_str = inner_type

                keys.append({
                    "key": field_name,
                    "type": type_str,
                    "description": field.description or "",
                    "default": field.default
                })
            return {"keys": keys}

        @self.app.delete("/api/file-groups/{name}")
        async def delete_file_group(name: str):
            await self.file_group_manager.delete_group(name)
            return {"status": "success"}

        @self.app.post("/api/file-groups/{name}/files")
        async def add_files_to_group(name: str, request: Request):
            data = await request.json()
            files = data.get("files", [])
            description = data.get("description")
            if description is not None:
                group = await self.file_group_manager.update_group_description(name, description)
            else:
                group = await self.file_group_manager.add_files_to_group(name, files)
            return group

        @self.app.delete("/api/file-groups/{name}/files")
        async def remove_files_from_group(name: str, request: Request):
            data = await request.json()
            files = data.get("files", [])
            group = await self.file_group_manager.remove_files_from_group(name, files)
            return group

        @self.app.post("/api/revert")
        async def revert():
            try:
                result = self.auto_coder_runner.revert()
                return result
            except Exception as e:
                raise HTTPException(status_code=500, detail=str(e))

        @self.app.get("/api/file-groups")
        async def get_file_groups():
            groups = await self.file_group_manager.get_groups()
            return {"groups": groups}

        @self.app.get("/api/files")
        async def get_files():
            tree = get_directory_tree(self.project_path)
            return {"tree": tree}

        @self.app.get("/api/completions/files")
        async def get_file_completions(name: str = Query(...)):
            """获取文件名补全"""
            matches = self.auto_coder_runner.find_files_in_project([name])
            completions = []
            project_root = self.auto_coder_runner.project_path
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

        @self.app.get("/api/completions/symbols")
        async def get_symbol_completions(name: str = Query(...)):
            """获取符号补全"""
            symbols = self.auto_coder_runner.get_symbol_list()
            matches = []

            for symbol in symbols:
                if name.lower() in symbol.symbol_name.lower():
                    relative_path = os.path.relpath(
                        symbol.file_name, self.project_path)
                    matches.append(CompletionItem(
                        name=symbol.symbol_name,
                        path=f"{symbol.symbol_name} ({relative_path}/{symbol.symbol_type.value})",
                        display=f"{symbol.symbol_name}(location: {relative_path})"
                    ))
            return CompletionResponse(completions=matches)

        @self.app.put("/api/file/{path:path}")
        async def update_file(path: str, request: Request):
            try:
                data = await request.json()
                content = data.get("content")
                if content is None:
                    raise HTTPException(
                        status_code=400, detail="Content is required")

                full_path = os.path.join(self.project_path, path)

                # Ensure the directory exists
                os.makedirs(os.path.dirname(full_path), exist_ok=True)

                # Write the file content
                with open(full_path, 'w', encoding='utf-8') as f:
                    f.write(content)

                return {"message": f"Successfully updated {path}"}
            except Exception as e:
                raise HTTPException(status_code=500, detail=str(e))

        @self.app.get("/api/file/{path:path}")
        async def get_file_content(path: str):
            from .file_manager import read_file_content
            content = read_file_content(self.project_path, path)
            if content is None:
                raise HTTPException(
                    status_code=404, detail="File not found or cannot be read")

            return {"content": content}

        @self.app.get("/api/active-files")
        async def get_active_files():
            """获取当前活动文件列表"""
            active_files = self.auto_coder_runner.get_active_files()
            return active_files

        @self.app.get("/api/conf")
        async def get_conf():
            return {"conf": self.auto_coder_runner.get_config()}

        @self.app.post("/api/conf")
        async def config(request: Request):
            data = await request.json()
            try:
                for key, value in data.items():
                    self.auto_coder_runner.configure(key, str(value))
                return {"status": "success"}
            except Exception as e:
                raise HTTPException(status_code=400, detail=str(e))

        @self.app.delete("/api/conf/{key}")
        async def delete_config(key: str):
            try:
                result = self.auto_coder_runner.drop_config(key)
                return result
            except ValueError as e:
                raise HTTPException(status_code=404, detail=str(e))
            except Exception as e:
                raise HTTPException(status_code=400, detail=str(e))

        @self.app.post("/api/coding")
        async def coding(request: Request):
            data = await request.json()
            query = data.get("query", "")
            if not query:
                raise HTTPException(
                    status_code=400, detail="Query is required")
            return await self.auto_coder_runner.coding(query)

        @self.app.post("/api/chat")
        async def chat(request: Request):
            data = await request.json()
            query = data.get("query", "")
            if not query:
                raise HTTPException(
                    status_code=400, detail="Query is required")
            return await self.auto_coder_runner.chat(query)

        @self.app.get("/api/result/{request_id}")
        async def get_result(request_id: str):
            result = await self.auto_coder_runner.get_result(request_id)
            if result is None:
                raise HTTPException(
                    status_code=404, detail="Result not found or not ready yet")

            v = {"result": result.value, "status": result.status.value}
            return v

        @self.app.post("/api/event/get")
        async def get_event(request: EventGetRequest):
            request_id = request.request_id
            if not request_id:
                raise HTTPException(
                    status_code=400, detail="request_id is required")

            v = self.auto_coder_runner.get_event(request_id)
            return v

        @self.app.post("/api/event/response")
        async def response_event(request: EventResponseRequest):
            request_id = request.request_id
            if not request_id:
                raise HTTPException(
                    status_code=400, detail="request_id is required")

            self.auto_coder_runner.response_event(
                request_id, request.event, request.response)
            return {"message": "success"}

        @self.app.post("/api/commit")
        async def commit():
            try:
                result = self.auto_coder_runner.commit()
                return result
            except Exception as e:
                raise HTTPException(status_code=500, detail=str(e))

        @self.app.get("/api/output/{request_id}")
        async def get_terminal_logs(request_id: str):
            return self.auto_coder_runner.get_logs(request_id)

        @self.app.get("/api/last-yaml")
        async def get_last_yaml():
            """Get information about the last YAML file"""
            return JSONResponse(content=self.auto_coder_runner.get_last_yaml_info())

        @self.app.post("/api/chat-lists/save")
        async def save_chat_list(chat_list: ChatList):
            try:
                chat_lists_dir = os.path.join(
                    ".auto-coder", "auto-coder.web", "chat-lists")
                os.makedirs(chat_lists_dir, exist_ok=True)

                file_path = os.path.join(
                    chat_lists_dir, f"{chat_list.name}.json")
                async with aiofiles.open(file_path, 'w') as f:
                    await f.write(json.dumps({"messages": chat_list.messages}, indent=2))
                return {"status": "success", "message": f"Chat list {chat_list.name} saved successfully"}
            except Exception as e:
                raise HTTPException(status_code=500, detail=str(e))

        @self.app.get("/api/chat-lists")
        async def get_chat_lists():
            try:
                chat_lists_dir = os.path.join(
                    ".auto-coder", "auto-coder.web", "chat-lists")
                os.makedirs(chat_lists_dir, exist_ok=True)

                # Get files with their modification times
                chat_lists = []
                for file in os.listdir(chat_lists_dir):
                    if file.endswith('.json'):
                        file_path = os.path.join(chat_lists_dir, file)
                        mod_time = os.path.getmtime(file_path)
                        # Store tuple of (name, mod_time)
                        chat_lists.append((file[:-5], mod_time))

                # Sort by modification time (newest first)
                chat_lists.sort(key=lambda x: x[1], reverse=True)

                # Return only the chat list names
                return {"chat_lists": [name for name, _ in chat_lists]}
            except Exception as e:
                raise HTTPException(status_code=500, detail=str(e))

        @self.app.get("/api/chat-lists/{name}")
        async def get_chat_list(name: str):
            try:
                file_path = os.path.join(
                    ".auto-coder", "auto-coder.web", "chat-lists", f"{name}.json")
                if not os.path.exists(file_path):
                    raise HTTPException(
                        status_code=404, detail=f"Chat list {name} not found")

                async with aiofiles.open(file_path, 'r') as f:
                    content = await f.read()
                    return json.loads(content)
            except Exception as e:
                raise HTTPException(status_code=500, detail=str(e))

        @self.app.delete("/api/chat-lists/{name}")
        async def delete_chat_list(name: str):
            try:
                file_path = os.path.join(
                    ".auto-coder", "auto-coder.web", "chat-lists", f"{name}.json")
                if not os.path.exists(file_path):
                    raise HTTPException(
                        status_code=404, detail=f"Chat list {name} not found")

                os.remove(file_path)
                return {"status": "success", "message": f"Chat list {name} deleted successfully"}
            except Exception as e:
                raise HTTPException(status_code=500, detail=str(e))

        @self.app.post("/api/event/clear")
        async def clear_events():
            """Clear all pending events in the event queue"""
            try:
                self.auto_coder_runner.clear_events()
                return {"status": "success", "message": "Event queue cleared successfully"}
            except Exception as e:
                raise HTTPException(status_code=500, detail=str(e))


        @self.app.get("/api/history/validate-and-load", response_model=ValidationResponseWithFileNumbers)
        async def validate_and_load_queries():
            try:
                # 检查必要的目录
                if not os.path.exists("actions") or not os.path.exists(".auto-coder"):
                    return ValidationResponseWithFileNumbers(
                        success=False,
                        message="无效的 auto-coder.chat 项目：缺少 actions 或 .auto-coder 目录"
                    )
                
                queries = []
                auto_coder_dir = "actions"
                
                # 遍历actions目录下的所有yaml文件
                for root, _, files in os.walk(auto_coder_dir):
                    for file in files:
                        if file.endswith('chat_action.yml'):
                            file_path = os.path.join(root, file)
                            match = re.match(r'(\d+)_chat_action\.yml', file)
                            if match:
                                file_number = int(match.group(1))
                                with open(file_path, 'r', encoding='utf-8') as f:
                                    try:
                                        yaml_content = yaml.safe_load(f)
                                        if isinstance(yaml_content, dict) and 'query' in yaml_content:
                                            timestamp = datetime.fromtimestamp(
                                                os.path.getmtime(file_path)
                                            ).strftime('%Y-%m-%d %H:%M:%S')
                                            
                                            file_md5 = hashlib.md5(open(file_path, 'rb').read()).hexdigest()
                                            response_str = f"auto_coder_{file}_{file_md5}"
                                            
                                            urls = yaml_content.get('urls', [])
                                            
                                            queries.append(QueryWithFileNumber(
                                                query=yaml_content['query'],
                                                timestamp=timestamp,
                                                file_number=file_number,
                                                response=response_str,
                                                urls=urls
                                            ))
                                    except yaml.YAMLError:
                                        continue
            
                # 按时间戳排序
                queries.sort(key=lambda x: x.timestamp or '', reverse=True)
                
                return ValidationResponseWithFileNumbers(
                    success=True,
                    queries=queries
                )
            
            except Exception as e:
                return ValidationResponseWithFileNumbers(
                    success=False,
                    message=f"读取项目文件时出错: {str(e)}"
                )

        @self.app.get("/api/history/commit-diff/{response_id}", response_model=CommitDiffResponse)
        async def get_commit_diff(response_id: str):
            """根据response_id获取对应的git commit diff"""
            try:
                repo = git.Repo(self.project_path)
                
                # 查找包含特定response message的commit
                search_pattern = f"{response_id}"
                
                matching_commits = []
                for commit in repo.iter_commits():
                    if search_pattern in commit.message:
                        matching_commits.append(commit)
                
                if not matching_commits:
                    return CommitDiffResponse(
                        success=False,
                        message=f"找不到对应的commit: {response_id}"
                    )
                
                # 使用第一个匹配的commit
                target_commit = matching_commits[0]
                
                file_changes = []
                if target_commit.parents:
                    parent = target_commit.parents[0]
                    diff = repo.git.diff(parent.hexsha, target_commit.hexsha)
                    
                    # 获取变更的文件
                    diff_index = parent.diff(target_commit)
                    
                    for diff_item in diff_index:
                        if diff_item.new_file:
                            file_changes.append(FileChange(
                                path=diff_item.b_path,
                                change_type="added"
                            ))
                        else:
                            file_changes.append(FileChange(
                                path=diff_item.b_path,
                                change_type="modified"
                            ))
                else:
                    diff = repo.git.show(target_commit.hexsha)
                    
                    # 对于初始commit,所有文件都是新增的
                    for item in target_commit.tree.traverse():
                        if item.type == 'blob':  # 只处理文件,不处理目录
                            file_changes.append(FileChange(
                                path=item.path,
                                change_type="added"
                            ))
                
                return CommitDiffResponse(
                    success=True,
                    diff=diff,
                    file_changes=file_changes
                )
                    
            except git.exc.GitCommandError as e:
                return CommitDiffResponse(
                    success=False,
                    message=f"Git命令执行错误: {str(e)}"
                )
            except Exception as e:
                return CommitDiffResponse(
                    success=False,
                    message=f"获取commit diff时出错: {str(e)}"
                )

        @self.app.get("/api/history/file-content/{file_number}", response_model=FileContentResponse)
        async def get_file_content(file_number: int):
            """获取指定编号文件的完整内容"""
            auto_coder_dir = "actions"
            file_name = f"{file_number}_chat_action.yml"
            file_path = ""
            
            # 搜索文件
            for root, _, files in os.walk(auto_coder_dir):
                if file_name in files:
                    file_path = os.path.join(root, file_name)
                    break
                    
            if not file_path:
                return FileContentResponse(
                    success=False,
                    message=f"找不到文件: {file_name}"
                )
                
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                return FileContentResponse(
                    success=True,
                    content=content
                )
            except Exception as e:
                return FileContentResponse(
                    success=False, 
                    message=f"读取文件出错: {str(e)}"
                )
    


def main():
    parser = argparse.ArgumentParser(description="Proxy Server")
    parser.add_argument(
        "--port",
        type=int,
        default=8007,
        help="Port to run the proxy server on (default: 8007)",
    )
    parser.add_argument(
        "--host",
        type=str,
        default="0.0.0.0",
        help="Host to run the proxy server on (default: 0.0.0.0)",
    )
    parser.add_argument(
        "--quick",
        action="store_true",
        help="Skip environment check",
    )
    args = parser.parse_args()

    proxy_server = ProxyServer(quick=args.quick, project_path=os.getcwd())
    uvicorn.run(proxy_server.app, host=args.host, port=args.port)


if __name__ == "__main__":
    main()
