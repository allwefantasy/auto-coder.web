from fastapi import APIRouter, HTTPException
from typing import List, Optional
from pydantic import BaseModel, Field
from autocoder.compilers.compiler_config_api import get_compiler_config_api

router = APIRouter()

class CompilerBase(BaseModel):
    name: str = Field(..., description="Unique name for the compiler configuration")
    type: str = Field(..., description="Type of the compiler or build tool (e.g., vite, maven, python)")
    working_dir: str = Field(..., description="The directory where the command should be executed")
    command: str = Field(..., description="The main command to execute")
    args: List[str] = Field(default_factory=list, description="List of arguments for the command")
    extract_regex: Optional[str] = Field(None, description="Regex to extract error information from output")

class CompilerCreate(CompilerBase):
    pass

class CompilerUpdate(BaseModel):
    type: Optional[str] = Field(None, description="Type of the compiler or build tool")
    working_dir: Optional[str] = Field(None, description="The directory where the command should be executed")
    command: Optional[str] = Field(None, description="The main command to execute")
    args: Optional[List[str]] = Field(None, description="List of arguments for the command")
    extract_regex: Optional[str] = Field(None, description="Regex to extract error information from output")

@router.get("/api/compilers", response_model=dict)
async def list_compilers() -> dict:
    """
    Get all compiler configurations
    """
    api = get_compiler_config_api()
    result = api.list_compilers()
    
    if result["status"] == "error":
        raise HTTPException(status_code=400, detail=result["message"])
    if result["status"] == "error":
        raise HTTPException(status_code=400, detail=result["message"])
    
    return result

@router.get("/api/compilers/{name}", response_model=dict)
async def get_compiler(name: str) -> dict:
    """
    Get a specific compiler configuration by name
    """
    api = get_compiler_config_api()
    result = api.get_compiler(name)
    
    if result["status"] == "error":
        status_code = result.get("code", 400)
        raise HTTPException(status_code=status_code, detail=result["message"])
    if result["status"] == "error":
        status_code = result.get("code", 400)
        if status_code == 404:
             raise HTTPException(status_code=404, detail=result["message"])
        raise HTTPException(status_code=400, detail=result["message"])
    
    return result

@router.post("/api/compilers", response_model=dict)
async def create_compiler(compiler: CompilerCreate) -> dict:
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
        extract_regex=compiler.extract_regex
    )
    
    if result["status"] == "error":
        raise HTTPException(status_code=400, detail=result["message"])
    if result["status"] == "error":
        raise HTTPException(status_code=400, detail=result["message"])
    
    return result

@router.put("/api/compilers/{name}", response_model=dict)
async def update_compiler(name: str, compiler: CompilerUpdate) -> dict:
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
        extract_regex=compiler.extract_regex
    )
    
    if result["status"] == "error":
        status_code = result.get("code", 400)
        raise HTTPException(status_code=status_code, detail=result["message"])
    if result["status"] == "error":
        status_code = result.get("code", 400)
        if status_code == 404:
             raise HTTPException(status_code=404, detail=result["message"])
        raise HTTPException(status_code=400, detail=result["message"])
    
    return result

@router.delete("/api/compilers/{name}", response_model=dict)
async def delete_compiler(name: str) -> dict:
    """
    Delete a compiler configuration
    """
    api = get_compiler_config_api()
    result = api.delete_compiler(name)
    
    if result["status"] == "error":
        status_code = result.get("code", 400)
        raise HTTPException(status_code=status_code, detail=result["message"])
    if result["status"] == "error":
        status_code = result.get("code", 400)
        if status_code == 404:
             raise HTTPException(status_code=404, detail=result["message"])
        raise HTTPException(status_code=400, detail=result["message"])
    
    return result

@router.post("/api/compilers/initialize", response_model=dict)
async def initialize_compiler_config() -> dict:
    """
    Initialize a default compiler configuration file if it doesn't exist
    """
    api = get_compiler_config_api()
    result = api.initialize_config()
    
    if result["status"] == "error":
        raise HTTPException(status_code=400, detail=result["message"])
    if result["status"] == "error":
        raise HTTPException(status_code=400, detail=result["message"])
    
    return result

@router.get("/api/compilers/validate", response_model=dict)
async def validate_compiler_config() -> dict:
    """
    Validate the structure of the compiler.yml file
    """
    api = get_compiler_config_api()
    result = api.validate_config()
    
    if result["status"] == "error":
        raise HTTPException(status_code=400, detail=result["message"])
    
    return result
