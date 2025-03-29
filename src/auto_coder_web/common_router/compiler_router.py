from fastapi import APIRouter, Request, HTTPException, Depends
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from autocoder.compilers.compiler_config_api import get_compiler_config_api

router = APIRouter()

class CompilerBase(BaseModel):
    name: str
    type: str
    working_dir: str
    command: str
    args: List[str]
    triggers: List[str] = []
    extract_regex: Optional[str] = None

class CompilerCreate(CompilerBase):
    pass

class CompilerUpdate(BaseModel):
    type: Optional[str] = None
    working_dir: Optional[str] = None
    command: Optional[str] = None
    args: Optional[List[str]] = None
    triggers: Optional[List[str]] = None
    extract_regex: Optional[str] = None

@router.get("/api/compilers")
async def list_compilers():
    """
    Get all compiler configurations
    """
    api = get_compiler_config_api()
    result = api.list_compilers()
    
    if result["status"] == "error":
        raise HTTPException(status_code=400, detail=result["message"])
    
    return result

@router.get("/api/compilers/{name}")
async def get_compiler(name: str):
    """
    Get a specific compiler configuration by name
    """
    api = get_compiler_config_api()
    result = api.get_compiler(name)
    
    if result["status"] == "error":
        status_code = result.get("code", 400)
        raise HTTPException(status_code=status_code, detail=result["message"])
    
    return result

@router.post("/api/compilers")
async def create_compiler(compiler: CompilerCreate):
    """
    Create a new compiler configuration
    """
    api = get_compiler_config_api()
    result = api.create_compiler(
        name=compiler.name,
        compiler_type=compiler.type,
        working_dir=compiler.working_dir,
        command=compiler.command,
        args=compiler.args,
        triggers=compiler.triggers,
        extract_regex=compiler.extract_regex
    )
    
    if result["status"] == "error":
        raise HTTPException(status_code=400, detail=result["message"])
    
    return result

@router.put("/api/compilers/{name}")
async def update_compiler(name: str, compiler: CompilerUpdate):
    """
    Update an existing compiler configuration
    """
    api = get_compiler_config_api()
    result = api.update_compiler(
        name=name,
        compiler_type=compiler.type,
        working_dir=compiler.working_dir,
        command=compiler.command,
        args=compiler.args,
        triggers=compiler.triggers,
        extract_regex=compiler.extract_regex
    )
    
    if result["status"] == "error":
        status_code = result.get("code", 400)
        raise HTTPException(status_code=status_code, detail=result["message"])
    
    return result

@router.delete("/api/compilers/{name}")
async def delete_compiler(name: str):
    """
    Delete a compiler configuration
    """
    api = get_compiler_config_api()
    result = api.delete_compiler(name)
    
    if result["status"] == "error":
        status_code = result.get("code", 400)
        raise HTTPException(status_code=status_code, detail=result["message"])
    
    return result

@router.post("/api/compilers/initialize")
async def initialize_compiler_config():
    """
    Initialize a default compiler configuration file if it doesn't exist
    """
    api = get_compiler_config_api()
    result = api.initialize_config()
    
    if result["status"] == "error":
        raise HTTPException(status_code=400, detail=result["message"])
    
    return result

@router.get("/api/compilers/validate")
async def validate_compiler_config():
    """
    Validate the structure of the compiler.yml file
    """
    api = get_compiler_config_api()
    result = api.validate_config()
    
    if result["status"] == "error":
        raise HTTPException(status_code=400, detail=result["message"])
    
    return result
