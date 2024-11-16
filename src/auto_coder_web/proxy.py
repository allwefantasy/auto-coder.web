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

class ProxyServer:
    def __init__(self, backend_url: str):
        self.app = FastAPI()
        self.backend_url = backend_url.rstrip('/')
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
                
            from .project_manager import ProjectManager
            success = await ProjectManager.set_project_path(project_path)
            if not success:
                raise HTTPException(status_code=400, detail="Invalid project path")
                
            return {"status": "success"}

        @self.app.post("/api/file-groups")
        async def create_file_group(request: Request):
            data = await request.json()
            name = data.get("name")
            description = data.get("description", "")
            
            from .file_group import FileGroupManager
            file_group_manager = FileGroupManager()
            group = await file_group_manager.create_group(name, description)
            return group
            
        @self.app.delete("/api/file-groups/{name}")
        async def delete_file_group(name: str):
            from .file_group import FileGroupManager
            file_group_manager = FileGroupManager()
            await file_group_manager.delete_group(name)
            return {"status": "success"}
            
        @self.app.post("/api/file-groups/{name}/files")
        async def add_files_to_group(name: str, request: Request):
            data = await request.json()
            files = data.get("files", [])
            
            from .file_group import FileGroupManager
            file_group_manager = FileGroupManager()
            group = await file_group_manager.add_files_to_group(name, files)
            return group
            
        @self.app.delete("/api/file-groups/{name}/files")
        async def remove_files_from_group(name: str, request: Request):
            data = await request.json()
            files = data.get("files", [])
            
            from .file_group import FileGroupManager
            file_group_manager = FileGroupManager()
            group = await file_group_manager.remove_files_from_group(name, files)
            return group
            
        @self.app.get("/api/file-groups")
        async def get_file_groups():
            from .file_group import FileGroupManager
            file_group_manager = FileGroupManager()
            groups = await file_group_manager.get_groups()
            return {"groups": groups}
            
        @self.app.get("/api/files")
        async def get_files():
            from .project_manager import ProjectManager
            from .file_manager import get_directory_tree
            
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
    args = parser.parse_args()

    proxy_server = ProxyServer(backend_url=args.backend_url)
    uvicorn.run(proxy_server.app, host=args.host, port=args.port)

if __name__ == "__main__":
    main()