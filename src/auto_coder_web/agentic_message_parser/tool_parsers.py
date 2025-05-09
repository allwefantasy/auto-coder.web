"""
Tool-specific parsers for processing messages from different tools.

This module contains parser implementations for various tools.
New parsers can be added here and will be automatically registered.
"""
import json
from typing import Dict, Any, Optional
from .message_parser import register_parser

@register_parser("ReadFileToolResult")
def read_file_tool_result_parser(content_obj: Dict[str, Any], message: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Parser for ReadFileToolResult messages.
    Truncates file content to 200 characters if it's too long.
    
    Args:
        content_obj: The parsed content object
        message: The original message
        
    Returns:
        The processed message if this parser can handle it, None otherwise
    """
    # Validate if this is a ReadFileTool message
    if not (isinstance(content_obj, dict) and
            content_obj.get("tool_name") == "ReadFileTool" and
            "success" in content_obj and
            "message" in content_obj and
            "content" in content_obj):
        return None
    
    # Process the content
    processed_message = message.copy()
    if isinstance(content_obj["content"], str) and len(content_obj["content"]) > 200:
        content_obj["content"] = content_obj["content"][:200] + "..."
        processed_message["content"] = json.dumps(content_obj)
    
    return processed_message


@register_parser("ReplaceInFileTool")
def replace_in_file_tool_parser(content_obj: Dict[str, Any], message: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Parser for ReplaceInFileTool messages.
    Truncates file content to 200 characters if it's too long.
    
    Args:
        content_obj: The parsed content object
        message: The original message
        
    Returns:
        The processed message if this parser can handle it, None otherwise
    """
    # Validate if this is a ReplaceInFileTool message
    if not (isinstance(content_obj, dict) and
            content_obj.get("tool_name") == "ReplaceInFileTool" and 
            "diff" in content_obj):
        return None
    
    # Process the content   
    processed_message = message.copy()
    if isinstance(content_obj["diff"], str) and len(content_obj["diff"]) > 200:
        content_obj["diff"] = content_obj["diff"][:200] + "..."
        processed_message["diff"] = content_obj["diff"]
    
    return processed_message

@register_parser("ReplaceInFileToolResult")
def replace_in_file_result_tool_parser(content_obj: Dict[str, Any], message: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Parser for ReplaceInFileToolResult messages.
    Truncates file content to 200 characters if it's too long.
    
    Args:
        content_obj: The parsed content object
        message: The original message
        
    Returns:
        The processed message if this parser can handle it, None otherwise
    """
    # Validate if this is a ReplaceInFileToolResult message
    if not (isinstance(content_obj, dict) and
            content_obj.get("tool_name") == "ReplaceInFileTool" and 
            "success" in content_obj):
        return None
    
    # Process the content   
    processed_message = message.copy()
    if isinstance(content_obj["content"], dict) and len(content_obj["content"]["content"]) > 200:
        content_obj["content"]["content"] = content_obj["content"]["content"][:200] + "..."
        processed_message["content"]["content"] = content_obj["content"]["content"]
    
    return processed_message



