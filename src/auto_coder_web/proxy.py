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
from .project_manager import ProjectManager
from .file_manager import get_directory_tree
from .auto_coder_runner import AutoCoderRunner

def check_environment():
    """Check and initialize the required environment"""
    print("\n\033[1;34mInitializing the environment...\033[0m")

    def print_status(message, status):
        if status == "success":
            print(f"\033[32m✓ {message}\033[0m")
        elif status == "warning":
            print(f"\033[33m! {message}\033[0m")
        elif status == "error":
            print(f"\033[31m✗ {message}\033[0m")
        else:
            print(f"  {message}")
    
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
            return True
    except subprocess.TimeoutExpired:
        print_status("Model check timeout", "error")
    except subprocess.CalledProcessError:
        print_status("Model check error", "error")
    except Exception as e:
        print_status(f"Unexpected error: {str(e)}", "error")
    
    print_status("deepseek_chat model is not available", "warning")
    print_status("Please make sure to initialize the model first:", "warning")
    print_status("1. For 硅基流动(https://siliconflow.cn):", "")
    print_status("   easy-byzerllm deploy deepseek-ai/deepseek-v2-chat --token YOUR_TOKEN --alias deepseek_chat", "")
    print_status("2. For Deepseek官方(https://www.deepseek.com/):", "")
    print_status('   byzerllm deploy --pretrained_model_type saas/openai --cpus_per_worker 0.001 --gpus_per_worker 0 ' + 
                 '--worker_concurrency 1000 --num_workers 1 --infer_params ' + 
                 '"saas.base_url=https://api.deepseek.com/v1 saas.api_key=YOUR_API_KEY saas.model=deepseek-chat" ' + 
                 '--model deepseek_chat', "")
    return False

class ProxyServer:
    def __init__(self, quick: bool = False):
        self.app = FastAPI()        
        
        if not quick:
            # Check the environment if not in quick mode
            if not check_environment():
                print("\033[31mEnvironment check failed. Some features may not work properly.\033[0m")
        self.setup_middleware()
        
        self.setup_static_files()
        
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

        @self.app.post("/api/project")
        async def set_project(request: Request):
            data = await request.json()
            project_path = data.get("path")            
            if not project_path:
                raise HTTPException(status_code=400, detail="Project path is required")
                            
            success = await ProjectManager.set_project_path(project_path)
            if not success:
                raise HTTPException(status_code=400, detail="Invalid project path")

            self.projects[project_path] = AutoCoderRunner(project_path)    
                
            return {"status": "success"}

        def get_project_runner(project_path: str) -> AutoCoderRunner:
            return self.projects[project_path]    

        @self.app.post("/api/file-groups")
        async def create_file_group(request: Request):
            data = await request.json()
            name = data.get("name")
            description = data.get("description", "")                                
            group = await FileGroupManager().create_group(name, description)
            return group
            
        @self.app.delete("/api/file-groups/{name}")
        async def delete_file_group(name: str):
            await FileGroupManager().delete_group(name)
            return {"status": "success"}
            
        @self.app.post("/api/file-groups/{name}/files")
        async def add_files_to_group(name: str, request: Request):
            data = await request.json()
            files = data.get("files", [])                        
            file_group_manager = FileGroupManager()
            group = await file_group_manager.add_files_to_group(name, files)
            return group
            
        @self.app.delete("/api/file-groups/{name}/files")
        async def remove_files_from_group(name: str, request: Request):
            data = await request.json()
            files = data.get("files", [])                        
            file_group_manager = FileGroupManager()
            group = await file_group_manager.remove_files_from_group(name, files)
            return group
            
        @self.app.get("/api/file-groups")
        async def get_file_groups():            
            file_group_manager = FileGroupManager()
            groups = await file_group_manager.get_groups()
            return {"groups": groups}
            
        @self.app.get("/api/files")
        async def get_files():
            
            
            project_path = await ProjectManager.get_project_path()
            if not project_path:
                raise HTTPException(status_code=400, detail="Project path not set")
                
            tree = get_directory_tree(project_path)
            return {"tree": tree}

        @self.app.get("/api/file/{path:path}")
        async def get_file_content(path: str):
            from .project_manager import ProjectManager
            from .file_manager import read_file_content
            
            project_path = ProjectManager.get_project_path()
            if not project_path:
                raise HTTPException(status_code=400, detail="Project path not set")
                
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

    proxy_server = ProxyServer(quick=args.quick)
    uvicorn.run(proxy_server.app, host=args.host, port=args.port)

if __name__ == "__main__":
    main()