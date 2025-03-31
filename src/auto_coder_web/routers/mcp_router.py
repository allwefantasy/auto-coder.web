import asyncio
import json
import os
from fastapi import APIRouter, HTTPException, Request, Depends
from pydantic import BaseModel, Field
from typing import Dict, Any, Optional, List
from autocoder.common.mcp_server import (
    get_mcp_server, 
    McpInstallRequest, 
    McpRemoveRequest, 
    McpListRequest, 
    McpListRunningRequest, 
    McpRefreshRequest, 
    McpServerInfoRequest,
    McpResponse
)
from autocoder.common.printer import Printer # For messages
from autocoder.chat_auto_coder_lang import get_message_with_format # For formatted messages
from loguru import logger
from byzerllm.utils.langutil import asyncfy_with_semaphore

# Use asyncfy_with_semaphore to wrap the synchronous send_request method
async_send_request = asyncfy_with_semaphore(get_mcp_server().send_request, max_workers=5) 

router = APIRouter()
printer = Printer() # Initialize printer for messages

# --- Pydantic Models for Requests ---

class McpAddRequest(BaseModel):
    server_config: str = Field(..., description="Server configuration string (command-line style or JSON)")

class McpRemoveRequestModel(BaseModel):
    server_name: str = Field(..., description="Name of the MCP server to remove")

class McpRefreshRequestModel(BaseModel):
    server_name: Optional[str] = Field(None, description="Name of the MCP server to refresh (optional, refreshes all if None)")

class McpInfoRequestModel(BaseModel):
    # Assuming model and product_mode might come from global config or request context later
    # For now, let's make them optional or derive them if possible
    model: Optional[str] = None
    product_mode: Optional[str] = None # Example: "lite", "pro"

# --- Helper Function to Handle MCP Responses ---

async def handle_mcp_response(request: Any, success_key: str, error_key: str, **kwargs) -> Dict[str, Any]:
    """Handles sending request to MCP server and formatting the response."""
    try:
        response: McpResponse = await async_send_request(request)
        if response.error:
            logger.error(f"MCP Error ({error_key}): {response.error}")
            # Use get_message_with_format if available, otherwise use the raw error
            error_message = response.error
            try:
                # Attempt to format the error message if a key is provided
                formatted_error = get_message_with_format(error_key, error=response.error)
                if formatted_error: # Check if formatting was successful
                    error_message = formatted_error
            except Exception: # Catch potential errors during formatting
                pass # Stick with the original error message
            raise HTTPException(status_code=400, detail=error_message)
        else:
            # Use get_message_with_format for success message if available
            success_message = response.result
            try:
                formatted_success = get_message_with_format(success_key, result=response.result, **kwargs)
                if formatted_success: # Check if formatting was successful
                    success_message = formatted_success
            except Exception:
                 pass # Stick with the original result message
            return {"status": "success", "message": success_message, "data": response.result} # Include raw data too
    except HTTPException as http_exc:
        raise http_exc # Re-raise HTTPException
    except Exception as e:
        logger.error(f"Unexpected error during MCP request ({error_key}): {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

# --- API Endpoints ---

@router.post("/api/mcp/add")
async def add_mcp_server(request: McpAddRequest):
    """
    Adds or updates an MCP server configuration.
    Accepts command-line style args or a JSON string.
    """
    mcp_request = McpInstallRequest(server_name_or_config=request.server_config)
    return await handle_mcp_response(
        mcp_request,
        success_key="mcp_install_success",
        error_key="mcp_install_error",
        result=request.server_config # Pass original config for success message formatting
    )

@router.post("/api/mcp/remove")
async def remove_mcp_server(request: McpRemoveRequestModel):
    """Removes an MCP server configuration by name."""
    mcp_request = McpRemoveRequest(server_name=request.server_name)
    return await handle_mcp_response(
        mcp_request,
        success_key="mcp_remove_success",
        error_key="mcp_remove_error",
        result=request.server_name # Pass server name for success message formatting
    )

@router.get("/api/mcp/list")
async def list_mcp_servers():
    """Lists all available built-in and external MCP servers."""
    mcp_request = McpListRequest()
    # Specific handling for list as the result is the data itself
    try:
        response: McpResponse = await async_send_request(mcp_request)
        if response.error:
            logger.error(f"MCP Error (mcp_list_builtin_error): {response.error}")
            error_message = get_message_with_format("mcp_list_builtin_error", error=response.error) or response.error
            raise HTTPException(status_code=400, detail=error_message)
        else:
            # Split the result string into a list for better JSON representation
            server_list = response.result.strip().split('\n') if response.result else []
            return {"status": "success", "servers": server_list}
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        logger.error(f"Unexpected error during MCP list request: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/api/mcp/list_running")
async def list_running_mcp_servers():
    """Lists all currently running/connected MCP servers."""
    mcp_request = McpListRunningRequest()
    # Specific handling for list_running
    try:
        response: McpResponse = await async_send_request(mcp_request)
        if response.error:
            logger.error(f"MCP Error (mcp_list_running_error): {response.error}")
            error_message = get_message_with_format("mcp_list_running_error", error=response.error) or response.error
            raise HTTPException(status_code=400, detail=error_message)
        else:
             # Split the result string into a list
            running_server_list = response.result.strip().split('\n') if response.result else []
            # Clean up list (remove potential leading hyphens/spaces)
            cleaned_list = [s.strip().lstrip('-').strip() for s in running_server_list if s.strip()]
            return {"status": "success", "running_servers": cleaned_list}
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        logger.error(f"Unexpected error during MCP list_running request: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.post("/api/mcp/refresh")
async def refresh_mcp_connections(request: McpRefreshRequestModel):
    """Refreshes connections to MCP servers (all or a specific one)."""
    mcp_request = McpRefreshRequest(name=request.server_name)
    return await handle_mcp_response(
        mcp_request,
        success_key="mcp_refresh_success",
        error_key="mcp_refresh_error"
    )

@router.get("/api/mcp/info")
async def get_mcp_server_info(model: Optional[str] = None, product_mode: Optional[str] = None):
    """Gets detailed information about connected MCP servers."""
    # TODO: Determine how to get model/product_mode - from app state, global config, or request?
    # Using optional query params for now.
    mcp_request = McpServerInfoRequest(model=model, product_mode=product_mode)
    # Specific handling for info
    try:
        response: McpResponse = await async_send_request(mcp_request)
        if response.error:
            logger.error(f"MCP Error (mcp_server_info_error): {response.error}")
            error_message = get_message_with_format("mcp_server_info_error", error=response.error) or response.error
            raise HTTPException(status_code=400, detail=error_message)
        else:
            # The result is likely a markdown string or complex structure. Return as is.
            return {"status": "success", "info": response.result}
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        logger.error(f"Unexpected error during MCP info request: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

# Potentially add endpoints for direct tool calls or resource access if needed in the future
# @router.post("/api/mcp/call_tool")
# async def call_mcp_tool(...): ...

# @router.get("/api/mcp/read_resource")
# async def read_mcp_resource(...): ...