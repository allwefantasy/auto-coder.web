from autocoder.run_context import get_run_context,RunMode

# Set run mode to web
get_run_context().set_mode(RunMode.WEB)

from fastapi import FastAPI, Request, HTTPException, Response, Query
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi import WebSocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import uvicorn
import httpx
import uuid
import os
import argparse
import aiofiles
import pkg_resources
import asyncio
import pathlib
import time
import sys
from auto_coder_web.file_group import FileGroupManager
from auto_coder_web.file_manager import get_directory_tree
from auto_coder_web.auto_coder_runner import AutoCoderRunner
from autocoder.agent.auto_filegroup import AutoFileGroup
from .types import (    
    ChatList,    
    FileContentResponse,    
)

from rich.console import Console
from prompt_toolkit.shortcuts import radiolist_dialog
from prompt_toolkit.formatted_text import HTML
import subprocess
from prompt_toolkit import prompt
from pydantic import BaseModel
from autocoder.utils.log_capture import LogCapture
from .terminal import terminal_manager
from autocoder.common import AutoCoderArgs
import json
import re
import yaml
import git
import hashlib
from datetime import datetime
from auto_coder_web.auto_coder_runner_wrapper import AutoCoderRunnerWrapper
from .routers import todo_router, settings_router, auto_router, commit_router, chat_router, coding_router
from expert_routers import history_router
from .common_router import completions_router, file_router, auto_coder_conf_router, chat_list_router, file_group_router



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
        
        if not os.path.exists("actions") or not os.path.exists(".auto-coder"):            
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


def check_environment_lite():
    """Check and initialize the required environment for lite mode"""
    console = Console()
    console.print("\n[blue]Initializing the environment (Lite Mode)...[/blue]")

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

    # Setup deepseek api key
    api_key_dir = os.path.expanduser("~/.auto-coder/keys")
    api_key_file = os.path.join(api_key_dir, "api.deepseek.com")
    
    if not os.path.exists(api_key_file):
        print_status("API key not found", "warning")
        api_key = prompt(HTML("<b>Please enter your API key: </b>"))
        
        # Create directory if it doesn't exist
        os.makedirs(api_key_dir, exist_ok=True)
        
        # Save the API key
        with open(api_key_file, "w") as f:
            f.write(api_key)
        
        print_status(f"API key saved successfully: {api_key_file}", "success")

    print_status("Environment initialization complete", "success")
    return True


class ProxyServer:
    def __init__(self, project_path: str, quick: bool = False, product_mode: str = "pro"):
        self.app = FastAPI()

        if not quick:
            # Check the environment based on product mode
            if product_mode == "lite":
                if not check_environment_lite():
                    print(
                        "\033[31mEnvironment check failed. Some features may not work properly.\033[0m")
            else:
                if not check_environment():
                    print(
                        "\033[31mEnvironment check failed. Some features may not work properly.\033[0m")
                        
        self.setup_middleware()

        self.setup_static_files()
        self.project_path = project_path
        self.auto_coder_runner = AutoCoderRunnerWrapper(project_path, product_mode=product_mode)        
        self.setup_routes()        
        self.client = httpx.AsyncClient()

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
        
        self.app.mount(
            "/monaco-editor", StaticFiles(directory=os.path.join(self.resource_dir, "monaco-editor")), name="monaco-editor")

    def setup_routes(self):
        
        # Store project_path in app state for dependency injection
        self.app.state.project_path = self.project_path
        # Store auto_coder_runner in app state for dependency injection
        self.app.state.auto_coder_runner = self.auto_coder_runner

        self.app.include_router(todo_router.router)
        self.app.include_router(settings_router.router)
        self.app.include_router(auto_router.router)
        self.app.include_router(commit_router.router)
        self.app.include_router(chat_router.router)
        self.app.include_router(coding_router.router)
        self.app.include_router(history_router)
        self.app.include_router(completions_router.router)
        self.app.include_router(file_router.router)
        self.app.include_router(auto_coder_conf_router.router)
        self.app.include_router(chat_list_router.router)
        self.app.include_router(file_group_router.router)                        

        @self.app.on_event("shutdown")
        async def shutdown_event():
            await self.client.aclose()

        @self.app.websocket("/ws/terminal")
        async def terminal_websocket(websocket: WebSocket):
            session_id = str(uuid.uuid4())
            await terminal_manager.handle_websocket(websocket, session_id)

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

        @self.app.get("/api/os")
        async def get_os():
            return {"os": os.name}

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

        @self.app.post("/api/revert")
        async def revert():
            try:
                result = self.auto_coder_runner.revert()
                return result
            except Exception as e:
                raise HTTPException(status_code=500, detail=str(e))

        @self.app.get("/api/active-files")
        async def get_active_files():
            """获取当前活动文件列表"""
            active_files = self.auto_coder_runner.get_active_files()
            return active_files

        @self.app.post("/api/commit")
        async def commit():
            try:
                result = self.auto_coder_runner.commit()
                return result
            except Exception as e:
                raise HTTPException(status_code=500, detail=str(e))        

        @self.app.get("/api/last-yaml")
        async def get_last_yaml():
            """Get information about the last YAML file"""
            return JSONResponse(content=self.auto_coder_runner.get_last_yaml_info())

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
    from autocoder.rag.variable_holder import VariableHolder
    from tokenizers import Tokenizer
    try:
        tokenizer_path = pkg_resources.resource_filename(
            "autocoder", "data/tokenizer.json"
        )
        VariableHolder.TOKENIZER_PATH = tokenizer_path
        VariableHolder.TOKENIZER_MODEL = Tokenizer.from_file(tokenizer_path)
    except FileNotFoundError:
        tokenizer_path = None

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
    parser.add_argument(
        "--product_mode",
        type=str,
        default="lite",
        help="The mode of the auto-coder.chat, lite/pro default is lite",
    )
    parser.add_argument(
        "--lite",
        action="store_true",
        help="Run in lite mode (equivalent to --product_mode lite)",
    )
    parser.add_argument(
        "--pro",
        action="store_true",
        help="Run in pro mode (equivalent to --product_mode pro)",
    )
    args = parser.parse_args()

    # Handle lite/pro flags
    if args.lite:
        args.product_mode = "lite"
    elif args.pro:
        args.product_mode = "pro"

    proxy_server = ProxyServer(quick=args.quick, project_path=os.getcwd(), product_mode=args.product_mode)
    uvicorn.run(proxy_server.app, host=args.host, port=args.port)


if __name__ == "__main__":
    main()
