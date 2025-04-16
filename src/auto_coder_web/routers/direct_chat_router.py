import traceback
from fastapi import APIRouter, Request
from pydantic import BaseModel
from typing import Any, Dict
from loguru import logger
import byzerllm

from autocoder.utils.llms import get_single_llm

router = APIRouter()

class DirectChatRequest(BaseModel):
    model: str
    content: str
    product_mode: str = "lite"
    options: Dict[str, Any] = {}

class DirectChatResponse(BaseModel):
    success: bool
    result: Any = None
    error: str = None

@router.post("/api/direct_chat", response_model=DirectChatResponse)
async def direct_chat(req: DirectChatRequest, request: Request):
    """
    简单直聊API，指定模型和内容，返回模型回复。
    """
    try:
        # 获取模型
        llm = get_single_llm(req.model, product_mode=req.product_mode)
        
        @byzerllm.prompt()
        def chat_func(content: str) -> str:
            """
            {{ content }}
            """
        # 支持自定义llm_config等参数
        result = chat_func.with_llm(llm).run(req.content)        
        return DirectChatResponse(success=True, result=result)
    except Exception as e:
        logger.error(f"direct_chat error: {e}\n{traceback.format_exc()}")
        return DirectChatResponse(success=False, error=f"{str(e)}")
