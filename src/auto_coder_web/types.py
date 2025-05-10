from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from datetime import datetime


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


class ChatMetadata(BaseModel):
    token_usage: Optional[int] = None  # token 消耗
    cost: Optional[float] = None       # 费用
    window_size: Optional[int] = None  # 窗口大小

class ChatList(BaseModel):
    name: str
    messages: List[Dict[str, Any]]
    metadata: Optional[ChatMetadata] = None  # 新增 metadata 字段


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