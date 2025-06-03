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
import sys
from auto_coder_web.terminal import terminal_manager
from autocoder.common import AutoCoderArgs
from auto_coder_web.auto_coder_runner_wrapper import AutoCoderRunnerWrapper
from auto_coder_web.routers import todo_router, settings_router, auto_router, commit_router, chat_router, coding_router, index_router, config_router, upload_router, rag_router, editable_preview_router, mcp_router, direct_chat_router, rules_router, chat_panels_router, code_editor_tabs_router, file_command_router
from auto_coder_web.expert_routers import history_router
from auto_coder_web.common_router import completions_router, file_router, auto_coder_conf_router, chat_list_router, file_group_router, model_router, compiler_router, lib_router
from auto_coder_web.common_router import active_context_router
from rich.console import Console
from loguru import logger
from auto_coder_web.lang import get_message

class ProxyServer:
    def __init__(self, project_path: str, quick: bool = False, product_mode: str = "pro"):    
        self.app = FastAPI()                        
        self.setup_middleware()        

        self.setup_static_files()
        self.project_path = project_path
        self.product_mode = product_mode
        self.auto_coder_runner = None                
        # Check if project is initialized
        self.is_initialized = self.check_project_initialization()
        if not self.is_initialized and product_mode == "pro":
            logger.warning(get_message("project_not_initialized"))
            logger.warning(get_message("run_auto_coder_chat"))
            sys.exit(1) 

        if self.is_initialized:
            self._initialize()                    
        
        self.setup_routes()        

    def _initialize(self):
        self.auto_coder_runner = AutoCoderRunnerWrapper(self.project_path, product_mode=self.product_mode)        
        self.auto_coder_runner.start()
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
        self.static_dir = os.path.join(self.resource_dir, "assets")
        
        self.app.mount(
            "/assets", StaticFiles(directory=self.static_dir), name="assets")
        
        self.app.mount(
            "/monaco-editor", StaticFiles(directory=os.path.join(self.resource_dir, "monaco-editor")), name="monaco-editor")

        self.app.mount(
            "/sounds", StaticFiles(directory=os.path.join(self.resource_dir, "sounds")), name="sounds")    

    def setup_routes(self):
        
        # Store project_path in app state for dependency injection
        self.app.state.project_path = self.project_path
        # Store auto_coder_runner in app state for dependency injection
        self.app.state.auto_coder_runner = self.auto_coder_runner
        # self.app.state.file_cacher = FileCacher(self.project_path)
        # Store initialization status
        self.app.state.is_initialized = self.is_initialized
        # Store memory for lib_router
        if self.auto_coder_runner:
            self.app.state.memory = self.auto_coder_runner.get_memory_wrapper()

        self.app.include_router(todo_router.router)
        self.app.include_router(settings_router.router)
        self.app.include_router(auto_router.router)
        self.app.include_router(commit_router.router)
        self.app.include_router(chat_router.router)
        self.app.include_router(coding_router.router)
        self.app.include_router(history_router.router)
        self.app.include_router(completions_router.router)
        self.app.include_router(file_router.router)
        self.app.include_router(auto_coder_conf_router.router)
        self.app.include_router(chat_list_router.router)
        self.app.include_router(file_group_router.router) 
        self.app.include_router(model_router.router)
        self.app.include_router(compiler_router.router)
        self.app.include_router(index_router.router)
        self.app.include_router(config_router.router)
        self.app.include_router(upload_router.router)
        self.app.include_router(rag_router.router)
        self.app.include_router(editable_preview_router.router)
        self.app.include_router(mcp_router.router)
        self.app.include_router(active_context_router.router)
        self.app.include_router(direct_chat_router.router)
        self.app.include_router(rules_router.router)
        self.app.include_router(chat_panels_router.router)
        self.app.include_router(code_editor_tabs_router.router)
        self.app.include_router(file_command_router.router)
        self.app.include_router(lib_router.router)

        @self.app.on_event("shutdown")
        async def shutdown_event():
            if self.auto_coder_runner:
                self.auto_coder_runner.stop()
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
                    
                    # If project is not initialized, inject a warning banner
                    if not self.is_initialized:
                        init_warning = f"""
                        <div style="background-color: #fff3cd; color: #856404; padding: 15px; margin: 15px; border-radius: 5px; text-align: center; font-weight: bold;">
                            <p>⚠️ {get_message("project_not_initialized")}</p>
                            <p>{get_message("run_auto_coder_chat")}</p>
                        </div>
                        """
                        # Insert the warning after the body tag
                        content = content.replace("<body>", "<body>" + init_warning)
                        
                return HTMLResponse(content=content)
            return HTMLResponse(content="<h1>Welcome to Proxy Server</h1>")
        

        @self.app.get("/api/project-path")
        async def get_project_path():
            return {"project_path": self.project_path}        

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
        
        
        @self.app.post("/api/initialization-project")
        async def initialization_project():
            """Get the project initialization status"""
            from auto_coder_web.init_project import init_project
            init_project(self.project_path)
            base_persist_dir = os.path.join(self.project_path,".auto-coder", "plugins", "chat-auto-coder")
            os.makedirs(base_persist_dir, exist_ok=True)
            self.is_initialized = True
            self._initialize()
            return {"success": True}
        
        @self.app.get("/api/guess/project_type")
        async def get_project_type():
            v = self.auto_coder_runner.get_all_extensions_wrapper()
            return {
                "project_type":v
            }
        
        @self.app.put("/api/congigure/project_type")
        async def configure_project_type(project_type:str):
            self.auto_coder_runner.configure_wrapper(f"project_type:{project_type}")
            return {
                "succcess": True
            }


        @self.app.get("/api/initialization-status")
        async def get_initialization_status():
            """Get the project initialization status"""
            return {
                "initialized": self.is_initialized,
                "message": None if self.is_initialized else get_message("run_auto_coder_chat")
            }
    
    def check_project_initialization(self) -> bool:
        """Check if the project has been initialized with auto-coder.chat"""
        auto_coder_dir = os.path.join(self.project_path, ".auto-coder")
        actions_dir = os.path.join(self.project_path, "actions")
        return os.path.exists(auto_coder_dir) and os.path.exists(actions_dir)
    
    def check_project_conf(self):
        conf = self.auto_coder_runner.get_conf_wrapper()
        if conf.get("human_as_model","false") in ["true","True","TRUE"]:
            logger.warning(get_message("human_as_model_warning"))            
            self.auto_coder_runner.configure_wrapper("human_as_model=false")            


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
