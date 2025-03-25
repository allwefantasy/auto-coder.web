from .auto_coder_conf_router import router as auto_coder_conf_router
from .chat_list_router import router as chat_list_router
from .completions_router import router as completions_router
from .file_group_router import router as file_group_router
from .file_router import router as file_router
from .model_router import router as model_router

routers = [
    auto_coder_conf_router,
    chat_list_router,
    completions_router,
    file_group_router,
    file_router,
    model_router
]