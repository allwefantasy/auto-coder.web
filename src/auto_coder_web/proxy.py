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
            success = ProjectManager.set_project_path(project_path)
            if not success:
                raise HTTPException(status_code=400, detail="Invalid project path")
                
            return {"status": "success"}

        @self.app.get("/api/files")
        async def get_files():
            from .project_manager import ProjectManager
            from .file_manager import get_directory_tree
            
            project_path = ProjectManager.get_project_path()
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
            
                
        @self.app.get("/proxy/backend_url")
        async def get_backend_url():
            return {"backend_url": self.backend_url}
            
        @self.app.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"])
        async def proxy(request: Request, path: str):
            url = f"{self.backend_url}/{path}"
            method = request.method
            excluded_headers = {"host", "content-length"}
            headers = {
                key: value
                for key, value in request.headers.items()
                if key.lower() not in excluded_headers
            }
            params = dict(request.query_params)
            body = await request.body()

            try:
                is_sse = headers.get("accept") == "text/event-stream"

                if is_sse:
                    async def event_stream():
                        try:
                            async with self.client.stream(
                                method,
                                url,
                                headers=headers,
                                params=params,
                                content=body,
                                timeout=None,
                            ) as response:
                                async for chunk in response.aiter_bytes():
                                    yield chunk
                        except Exception as e:
                            print(f"Error in SSE stream: {str(e)}")
                            import traceback
                            traceback.print_exc()
                            yield "event: error\ndata: Connection error\n\n"

                    return StreamingResponse(
                        event_stream(),
                        media_type="text/event-stream",
                        headers={
                            "Cache-Control": "no-cache, no-transform",
                            "Connection": "keep-alive",
                            "Content-Type": "text/event-stream",
                            "X-Accel-Buffering": "no",
                            "Transfer-Encoding": "chunked",
                        },
                    )
                else:
                    response = await self.client.request(
                        method, url, headers=headers, params=params, content=body, timeout=3000
                    )
                    return Response(
                        content=response.content,
                        status_code=response.status_code,
                        headers=dict(response.headers),
                    )
            except httpx.RequestError as exc:
                import traceback
                traceback.print_exc()
                return JSONResponse(
                    content={"error": f"An error occurred while requesting {exc.request.url!r}."},
                    status_code=500,
                )

def main():
    parser = argparse.ArgumentParser(description="Proxy Server")
    parser.add_argument(
        "--backend_url",
        type=str,
        default="http://127.0.0.1:8005",
        help="Backend service URL (default: http://127.0.0.1:8005)",
    )
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