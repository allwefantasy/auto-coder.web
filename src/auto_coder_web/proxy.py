from fastapi import FastAPI, Request, HTTPException, Response
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import uvicorn
import httpx
from typing import Optional
import os
import argparse
import aiofiles
import pkg_resources
from .file_group import FileGroupManager
from .file_manager import get_directory_tree
from .auto_coder_runner import AutoCoderRunner

from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from rich.live import Live
from rich.text import Text
from prompt_toolkit.shortcuts import radiolist_dialog
from prompt_toolkit.formatted_text import HTML
import subprocess
from prompt_toolkit import prompt
from prompt_toolkit.validation import Validator
from prompt_toolkit.validation import ValidationError

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
            init_choice = input("  Do you want to initialize the project? (y/n): ").strip().lower()
            if init_choice == "y":
                try:
                    if not os.path.exists("actions"):
                        os.makedirs("actions", exist_ok=True)
                        print_status("Created actions directory", "success")
                    
                    if not os.path.exists(".auto-coder"):
                        os.makedirs(".auto-coder", exist_ok=True)
                        print_status("Created .auto-coder directory", "success")

                    subprocess.run(["auto-coder", "init", "--source_dir", "."], check=True)
                    print_status("Project initialized successfully", "success")
                except subprocess.CalledProcessError:
                    print_status("Failed to initialize project", "error")
                    print_status("Please try to initialize manually: auto-coder init --source_dir .", "warning")
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
    ray_status = subprocess.run(["ray", "status"], capture_output=True, text=True)
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
        print_status("You may need to try manually: easy-byzerllm chat deepseek_chat 你好", "warning")
        return False

    print_status("Environment initialization complete", "success")
    return True

class ProxyServer:
    def __init__(self, project_path:str,quick: bool = False):
        self.app = FastAPI()        
        
        if not quick:
            # Check the environment if not in quick mode
            if not check_environment():
                print("\033[31mEnvironment check failed. Some features may not work properly.\033[0m")
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
        self.index_html_path = pkg_resources.resource_filename("auto_coder_web", "web/index.html")
        self.resource_dir = os.path.dirname(self.index_html_path)
        self.static_dir = os.path.join(self.resource_dir, "static")
        self.app.mount("/static", StaticFiles(directory=self.static_dir), name="static")
        
    def setup_routes(self):
        @self.app.on_event("shutdown")
        async def shutdown_event():
            await self.client.aclose()
            
            
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
            
        @self.app.delete("/api/file-groups/{name}")
        async def delete_file_group(name: str):
            await self.file_group_manager.delete_group(name)
            return {"status": "success"}
            
        @self.app.post("/api/file-groups/{name}/files")
        async def add_files_to_group(name: str, request: Request):
            data = await request.json()
            files = data.get("files", [])                        
            group = await self.file_group_manager.add_files_to_group(name, files)
            return group
            
        @self.app.delete("/api/file-groups/{name}/files")
        async def remove_files_from_group(name: str, request: Request):
            data = await request.json()
            files = data.get("files", [])                                    
            group = await self.file_group_manager.remove_files_from_group(name, files)
            return group
            
        @self.app.get("/api/file-groups")
        async def get_file_groups():            
            groups = await self.file_group_manager.get_groups()
            return {"groups": groups}
            
        @self.app.get("/api/files")
        async def get_files():                                                
            tree = get_directory_tree(self.project_path)
            return {"tree": tree}

        @self.app.get("/api/file/{path:path}")
        async def get_file_content(path: str):            
            from .file_manager import read_file_content                                                
            content = read_file_content(project_path, path)
            if content is None:
                raise HTTPException(status_code=404, detail="File not found or cannot be read")
                
            return {"content": content}
            
                        

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

    proxy_server = ProxyServer(quick=args.quick,project_path=os.getcwd())
    uvicorn.run(proxy_server.app, host=args.host, port=args.port)

if __name__ == "__main__":
    main()