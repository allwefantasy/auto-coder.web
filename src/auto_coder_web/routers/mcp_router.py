import asyncio
import json
import os
from fastapi import APIRouter, HTTPException, Request, Depends
from pydantic import BaseModel, Field
from typing import Dict, Any, Optional, List
from autocoder.common.mcp_server_types import (
    McpInstallRequest,
    McpRemoveRequest,
    McpListRequest,
    McpListRunningRequest,
    McpRefreshRequest,
    McpServerInfoRequest,
    McpResponse,
    InstallResult,
    RemoveResult,
    ListResult,
    ListRunningResult,
    RefreshResult,
    QueryResult,
    ErrorResult,
    ServerInfo,
    ExternalServerInfo,
    ServerConfig,  # Added for InstallResult
    MarketplaceAddRequest,
    MarketplaceAddResult,
    MarketplaceUpdateRequest,  # Added for update endpoint
    MarketplaceUpdateResult,  # Added for update endpoint
)
from autocoder.common.mcp_server import get_mcp_server
from autocoder.common.printer import Printer  # For messages
from autocoder.chat_auto_coder_lang import (
    get_message_with_format,
    get_message,
)  # For formatted messages
from loguru import logger

router = APIRouter()
printer = Printer()  # Initialize printer for messages


# Helper function to run the synchronous send_request in a thread
async def send_mcp_request_async(*args, **kwargs) -> McpResponse:
    """Runs the synchronous MCP send_request in a separate thread."""
    return await asyncio.to_thread(get_mcp_server().send_request, *args, **kwargs)


# --- Pydantic Models for Requests ---


class McpInstallRequestModel(BaseModel):
    server_config: str = Field(
        ..., description="Server configuration string (command-line style or JSON)"
    )


# Model for the new /api/mcp/add endpoint
class MarketplaceAddRequestModel(BaseModel):
    name: str = Field(
        ..., description="Name of the MCP server to add to the marketplace"
    )
    description: Optional[str] = Field("", description="Description of the MCP server")
    mcp_type: str = Field(
        "command", description="Type of MCP server (e.g., 'command', 'sse')"
    )
    command: Optional[str] = Field(
        None, description="Command to run the server (if type is 'command')"
    )  # Allow None
    args: Optional[List[str]] = Field(None, description="Arguments for the command")
    env: Optional[Dict[str, str]] = Field(
        None, description="Environment variables for the command"
    )
    url: Optional[str] = Field(
        None, description="URL endpoint for the server (if type is 'sse')"
    )  # Allow None


# Model for the /api/mcp/update endpoint
class MarketplaceUpdateRequestModel(BaseModel):
    name: str = Field(
        ..., description="Name of the MCP server to update (used as identifier)"
    )
    description: Optional[str] = Field(
        None, description="Updated description of the MCP server"
    )
    mcp_type: Optional[str] = Field(
        None, description="Updated type of MCP server"
    )  # Allow None if not changing
    command: Optional[str] = Field(None, description="Updated command")
    args: Optional[List[str]] = Field(None, description="Updated arguments")
    env: Optional[Dict[str, str]] = Field(
        None, description="Updated environment variables (replaces existing)"
    )
    url: Optional[str] = Field(None, description="Updated URL endpoint")


class McpRemoveRequestModel(BaseModel):
    server_name: str = Field(..., description="Name of the MCP server to remove")


class McpRefreshRequestModel(BaseModel):
    server_name: Optional[str] = Field(
        None,
        description="Name of the MCP server to refresh (optional, refreshes all if None)",
    )


class McpInfoRequestModel(BaseModel):
    # Assuming model and product_mode might come from global config or request context later
    # For now, let's make them optional or derive them if possible
    model: Optional[str] = None
    product_mode: Optional[str] = None  # Example: "lite", "pro"


# --- Helper Function to Handle MCP Responses ---


async def handle_mcp_response(
    request: Any, success_key: str, error_key: str, **kwargs
) -> Dict[str, Any]:
    """Handles sending request to MCP server and formatting the response."""
    try:
        response: McpResponse = await send_mcp_request_async(request)
        if response.error:
            logger.error(f"MCP Error ({error_key}): {response.error}")
            # Use get_message_with_format if available, otherwise use the raw error
            error_message = response.error
            try:
                # Attempt to format the error message if a key is provided
                formatted_error = get_message_with_format(
                    error_key, error=response.error
                )
                if formatted_error:  # Check if formatting was successful
                    error_message = formatted_error
            except Exception:  # Catch potential errors during formatting
                pass  # Stick with the original error message
            raise HTTPException(status_code=400, detail=error_message)
        else:
            # Use get_message_with_format for success message if available
            success_message = response.result
            try:
                formatted_success = get_message_with_format(
                    success_key, result=response.result, **kwargs
                )
                if formatted_success:  # Check if formatting was successful
                    success_message = formatted_success
            except Exception:
                pass  # Stick with the original result message
            # Return the formatted message and the raw Pydantic model result
            return {
                "status": "success",
                "message": success_message,
                "raw_result": response.raw_result,
            }
    except HTTPException as http_exc:
        raise http_exc  # Re-raise HTTPException
    except Exception as e:
        logger.error(f"Unexpected error during MCP request ({error_key}): {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


# --- API Endpoints ---


@router.post("/api/mcp/install")
async def install_mcp_server(request: McpInstallRequestModel):
    """
    Installs or updates an MCP server configuration based on name, JSON, or command-line args.
    Handles built-in, external, and custom server installations.
    """
    # First, try to find the server in the marketplace list via McpListRequest
    try:
        list_request = McpListRequest()
        list_response: McpResponse = await send_mcp_request_async(list_request)

        marketplace_item = None
        if list_response.raw_result and isinstance(
            list_response.raw_result, ListResult
        ):
            # Combine all server lists for searching
            all_servers = list_response.raw_result.marketplace_items
            for item in all_servers:
                if item.name == request.server_config:
                    marketplace_item = item
                    break

        if marketplace_item:
            # If found in any list, create install request with the item
            mcp_request = McpInstallRequest(market_install_item=marketplace_item)
            logger.info(
                f"Found '{request.server_config}' in available server lists. Installing using item. {marketplace_item}"
            )
        else:
            # If not found in any list, assume it's a direct config string or an unknown name
            mcp_request = McpInstallRequest(server_name_or_config=request.server_config)
            logger.info(
                f"'{request.server_config}' not found in available server lists. Installing using name/config string."
            )

        # Proceed with installation using the determined request type
        return await handle_mcp_response(
            mcp_request,
            success_key="mcp_install_success",
            error_key="mcp_install_error",
            result=request.server_config,  # Pass original config for success message formatting
        )

    except HTTPException as http_exc:
        # Re-raise HTTP exceptions from handle_mcp_response or list request
        raise http_exc
    except Exception as e:
        logger.error(
            f"Error during MCP install process for '{request.server_config}': {e}"
        )
        # Fallback to original behavior if list fails or other errors occur
        logger.warning("Falling back to direct install request due to previous error.")
        mcp_request = McpInstallRequest(server_name_or_config=request.server_config)
        return await handle_mcp_response(
            mcp_request,
            success_key="mcp_install_success",
            error_key="mcp_install_error",
            result=request.server_config,
        )


@router.post("/api/mcp/add")
async def add_marketplace_server(request: MarketplaceAddRequestModel):
    """
    Adds a new MCP server configuration to the marketplace file.
    """
    # Convert API model to the internal McpHub model
    mcp_request = MarketplaceAddRequest(
        name=request.name,
        description=request.description,
        mcp_type=request.mcp_type,
        command=request.command,
        args=request.args,
        env=request.env,
        url=request.url,
    )
    return await handle_mcp_response(
        mcp_request,
        success_key="marketplace_add_success",
        error_key="marketplace_add_error",
        name=request.name,  # Pass name for message formatting
    )


@router.post("/api/mcp/update")
async def update_marketplace_server(request: MarketplaceUpdateRequestModel):
    """
    Updates an existing MCP server configuration in the marketplace file.
    Uses the 'name' field to identify the server to update.
    """
    # Convert API model to the internal McpHub model for update
    # Note: We assume MarketplaceUpdateRequest exists in mcp_server
    # and handles partial updates based on provided fields.
    # If a field is None in the request, it might mean "don't update this field"
    # or "set this field to None/empty", depending on McpHub's implementation.
    # Here, we pass all fields from the request model.
    mcp_request = MarketplaceUpdateRequest(
        name=request.name,  # Identifier
        description=request.description,
        mcp_type=request.mcp_type,
        command=request.command,
        args=request.args,
        env=request.env,
        url=request.url,
    )
    return await handle_mcp_response(
        mcp_request,
        success_key="marketplace_update_success",  # Define this message key
        error_key="marketplace_update_error",  # Define this message key
        name=request.name,  # Pass name for message formatting
    )


@router.post("/api/mcp/remove")
async def remove_mcp_server(request: McpRemoveRequestModel):
    """Removes an MCP server configuration by name."""
    mcp_request = McpRemoveRequest(server_name=request.server_name)
    return await handle_mcp_response(
        mcp_request,
        success_key="mcp_remove_success",
        error_key="mcp_remove_error",
        result=request.server_name,  # Pass server name for success message formatting
    )


@router.get("/api/mcp/list")
async def list_mcp_servers():
    """Lists all available built-in and external MCP servers."""
    mcp_request = McpListRequest()
    # Specific handling for list as the result is the data itself
    try:
        response: McpResponse = await send_mcp_request_async(mcp_request)
        if response.error:
            logger.error(f"MCP Error (mcp_list_builtin_error): {response.error}")
            error_message = (
                get_message_with_format("mcp_list_builtin_error", error=response.error)
                or response.error
            )
            # Ensure raw_result is included in the error detail if it's an ErrorResult
            detail = error_message
            if isinstance(response.raw_result, ErrorResult):
                detail = f"{error_message} (Details: {response.raw_result.error})"
            raise HTTPException(status_code=400, detail=detail)
        else:
            # Return the raw_result which should be of type ListResult
            # Ensure the response is structured consistently
            return {
                "status": "success",
                "message": "MCP servers listed successfully.",
                "raw_result": response.raw_result,
            }
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
        response: McpResponse = await send_mcp_request_async(mcp_request)
        if response.error:
            logger.error(f"MCP Error (mcp_list_running_error): {response.error}")
            error_message = (
                get_message_with_format("mcp_list_running_error", error=response.error)
                or response.error
            )
            # Ensure raw_result is included in the error detail if it's an ErrorResult
            detail = error_message
            if isinstance(response.raw_result, ErrorResult):
                detail = f"{error_message} (Details: {response.raw_result.error})"
            raise HTTPException(status_code=400, detail=detail)
        else:
            # Return the raw_result which should be of type ListRunningResult
            # Ensure the response is structured consistently
            return {
                "status": "success",
                "message": "Running MCP servers listed successfully.",
                "raw_result": response.raw_result,
            }
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
        mcp_request, success_key="mcp_refresh_success", error_key="mcp_refresh_error"
    )


@router.get("/api/mcp/info")
async def get_mcp_server_info(
    model: Optional[str] = None, product_mode: Optional[str] = "lite"
):
    """Gets detailed information about connected MCP servers."""
    # TODO: Determine how to get model/product_mode - from app state, global config, or request?
    # Using optional query params for now.
    mcp_request = McpServerInfoRequest(model=model, product_mode=product_mode)
    # Specific handling for info
    try:
        response: McpResponse = await send_mcp_request_async(mcp_request)
        if response.error:
            logger.error(f"MCP Error (mcp_server_info_error): {response.error}")
            error_message = (
                get_message_with_format("mcp_server_info_error", error=response.error)
                or response.error
            )
            # Ensure raw_result is included in the error detail if it's an ErrorResult
            detail = error_message
            if isinstance(response.raw_result, ErrorResult):
                detail = f"{error_message} (Details: {response.raw_result.error})"
            raise HTTPException(status_code=400, detail=detail)
        else:
            # Return the raw_result. It might be a string or a specific Pydantic model later.
            # For now, we assume it's included in McpResponse.raw_result
            # Ensure the response is structured consistently
            # The success message might vary or be generic
            success_message = (
                get_message_with_format("mcp_server_info_success")
                or "Server info retrieved successfully."
            )
            return {
                "status": "success",
                "message": success_message,
                "raw_result": response.raw_result,
            }
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
