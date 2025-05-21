"""
Document Router for managing and analyzing document files.

This router provides endpoints for listing documents and reading document variables
using the CommandFileManager from the auto-coder project.
"""

import os
import json
import aiofiles
from fastapi import APIRouter, HTTPException, Request, Depends
from pydantic import BaseModel
from pathlib import Path
from typing import List, Dict, Optional, Set, Any
from jinja2 import Template, Environment, meta

# Import the CommandFileManager from the auto-coder project
from autocoder.common.command_file_manager import CommandManager, JinjaVariable

router = APIRouter()

async def get_project_path(request: Request) -> str:
    """Get the project path from the FastAPI request context."""
    return request.app.state.project_path

async def get_documents_path(project_path: str) -> Path:
    """Get the documents directory path."""
    # Default to .autocodercommands directory in the project
    return Path(project_path) / ".autocodercommands"

class DocumentFile(BaseModel):
    """Model for document file information."""
    file_name: str
    file_path: str

class DocumentVariable(BaseModel):
    """Model for document variable information."""
    name: str
    default_value: Optional[str] = None
    description: Optional[str] = None

class DocumentAnalysis(BaseModel):
    """Model for document analysis information."""
    file_name: str
    file_path: str
    variables: List[DocumentVariable]

class ListDocumentsResponse(BaseModel):
    """Response model for listing documents."""
    success: bool
    documents: Optional[List[DocumentFile]] = None
    errors: Optional[List[str]] = None

class ReadDocumentResponse(BaseModel):
    """Response model for reading a document."""
    success: bool
    document: Optional[DocumentFile] = None
    content: Optional[str] = None
    errors: Optional[List[str]] = None

class AnalyzeDocumentResponse(BaseModel):
    """Response model for analyzing a document."""
    success: bool
    analysis: Optional[DocumentAnalysis] = None
    errors: Optional[List[str]] = None

class AllVariablesResponse(BaseModel):
    """Response model for getting all variables."""
    success: bool
    variables: Optional[Dict[str, List[str]]] = None
    errors: Optional[List[str]] = None

class RenderTemplateRequest(BaseModel):
    """Request model for rendering a template."""
    file_name: str
    variables: Dict[str, str]

class RenderTemplateResponse(BaseModel):
    """Response model for rendering a template."""
    success: bool
    rendered_content: Optional[str] = None
    errors: Optional[List[str]] = None

@router.get("/api/file_commands", response_model=ListDocumentsResponse)
async def list_documents(request: Request, recursive: bool = False):
    """
    List all document files in the documents directory.
    
    Args:
        recursive: Whether to search recursively.
        
    Returns:
        A ListDocumentsResponse object.
    """
    try:
        project_path = await get_project_path(request)
        documents_path = await get_documents_path(project_path)
        
        # Initialize the CommandManager
        manager = CommandManager(str(documents_path))
        
        # List command files
        result = manager.list_command_files(recursive=recursive)
        
        if not result.success:
            return ListDocumentsResponse(
                success=False,
                errors=result.errors
            )
        
        # Convert to DocumentFile objects
        documents = []
        for file_path in result.command_files:
            file_name = os.path.basename(file_path)
            documents.append(DocumentFile(
                file_name=file_name,
                file_path=file_path
            ))
        
        return ListDocumentsResponse(
            success=True,
            documents=documents
        )
    except Exception as e:
        return ListDocumentsResponse(
            success=False,
            errors=[f"Error listing documents: {str(e)}"]
        )

@router.get("/api/file_commands", response_model=ReadDocumentResponse)
async def read_document(file_name: str, request: Request):
    """
    Read a document file.
    
    Args:
        file_name: The name of the file to read (passed as query parameter).
        
    Returns:
        A ReadDocumentResponse object.
    """
    try:
        project_path = await get_project_path(request)
        documents_path = await get_documents_path(project_path)
        
        # Initialize the CommandManager
        manager = CommandManager(str(documents_path))
        
        # Read command file
        command_file = manager.read_command_file(file_name)
        
        if not command_file:
            return ReadDocumentResponse(
                success=False,
                errors=[f"Document '{file_name}' not found."]
            )
        
        return ReadDocumentResponse(
            success=True,
            document=DocumentFile(
                file_name=command_file.file_name,
                file_path=command_file.file_path
            ),
            content=command_file.content
        )
    except Exception as e:
        return ReadDocumentResponse(
            success=False,
            errors=[f"Error reading document: {str(e)}"]
        )

@router.get("/api/file_commands/variables", response_model=AnalyzeDocumentResponse)
async def analyze_document(file_name: str, request: Request):
    """
    Analyze a document file to extract variables.
    
    Args:
        file_name: The name of the file to analyze (passed as query parameter).
        
    Returns:
        An AnalyzeDocumentResponse object.
    """
    try:
        project_path = await get_project_path(request)
        documents_path = await get_documents_path(project_path)
        
        # Initialize the CommandManager
        manager = CommandManager(str(documents_path))
        
        # Analyze command file
        analysis = manager.analyze_command_file(file_name)
        
        if not analysis:
            return AnalyzeDocumentResponse(
                success=False,
                errors=[f"Document '{file_name}' not found or could not be analyzed."]
            )
        
        # Convert to DocumentVariable objects
        variables = []
        for var in analysis.variables:
            variables.append(DocumentVariable(
                name=var.name,
                default_value=var.default_value,
                description=var.description
            ))
        
        return AnalyzeDocumentResponse(
            success=True,
            analysis=DocumentAnalysis(
                file_name=analysis.file_name,
                file_path=analysis.file_path,
                variables=variables
            )
        )
    except Exception as e:
        return AnalyzeDocumentResponse(
            success=False,
            errors=[f"Error analyzing document: {str(e)}"]
        )

@router.get("/api/file_commands/variables/all", response_model=AllVariablesResponse)
async def get_all_variables(request: Request, recursive: bool = False):
    """
    Get all variables from all document files.
    
    Args:
        recursive: Whether to search recursively.
        
    Returns:
        An AllVariablesResponse object.
    """
    try:
        project_path = await get_project_path(request)
        documents_path = await get_documents_path(project_path)
        
        # Initialize the CommandManager
        manager = CommandManager(str(documents_path))
        
        # Get all variables
        variables = manager.get_all_variables(recursive=recursive)
        
        return AllVariablesResponse(
            success=True,
            variables=variables
        )
    except Exception as e:
        return AllVariablesResponse(
            success=False,
            errors=[f"Error getting all variables: {str(e)}"]
        )

@router.get("/api/file_commands/path")
async def get_documents_directory(request: Request):
    """
    Get the documents directory path.
    
    Returns:
        The documents directory path.
    """
    try:
        project_path = await get_project_path(request)
        documents_path = await get_documents_path(project_path)
        
        return {
            "success": True,
            "path": str(documents_path)
        }
    except Exception as e:
        return {
            "success": False,
            "errors": [f"Error getting documents directory: {str(e)}"]
        }

@router.post("/api/file_commands/render", response_model=RenderTemplateResponse)
async def render_template(request: RenderTemplateRequest, req: Request):
    """
    Render a template with the provided variables.
    
    Args:
        request: The request containing the file name and variables.
        
    Returns:
        A RenderTemplateResponse object containing the rendered content.
    """
    try:
        project_path = await get_project_path(req)
        documents_path = await get_documents_path(project_path)
        
        # Initialize the CommandManager
        manager = CommandManager(str(documents_path))
        
        # Read command file
        command_file = manager.read_command_file(request.file_name)
        
        if not command_file:
            return RenderTemplateResponse(
                success=False,
                errors=[f"Document '{request.file_name}' not found."]
            )
        
        # Create Jinja2 template
        template = Template(command_file.content)
        
        # Render template with provided variables
        rendered_content = template.render(**request.variables)
        
        return RenderTemplateResponse(
            success=True,
            rendered_content=rendered_content
        )
    except Exception as e:
        return RenderTemplateResponse(
            success=False,
            errors=[f"Error rendering template: {str(e)}"]
        )
