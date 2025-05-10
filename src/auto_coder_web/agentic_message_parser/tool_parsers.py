"""
Tool-specific parsers for processing messages from different tools.

This module contains parser implementations for various tools.
New parsers can be added here and will be automatically registered.
"""
import json
from typing import Dict, Any, Optional
from .message_parser import register_parser

@register_parser("ReadFileTool")
def read_file_tool_parser(content_obj: Dict[str, Any], message: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Parser for ReadFileTool messages.
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

# Example of how to add more parsers in the future:
# 
# @register_parser("CodeSearchTool")
# def code_search_tool_parser(content_obj: Dict[str, Any], message: Dict[str, Any]) -> Optional[Dict[str, Any]]:
#     """
#     Parser for CodeSearchTool messages.
#     Truncates search results if they're too long.
#     
#     Args:
#         content_obj: The parsed content object
#         message: The original message
#         
#     Returns:
#         The processed message if this parser can handle it, None otherwise
#     """
#     # Validate if this is a CodeSearchTool message
#     if not (isinstance(content_obj, dict) and
#             content_obj.get("tool_name") == "CodeSearchTool" and
#             "success" in content_obj and
#             "message" in content_obj and
#             "content" in content_obj):
#         return None
#     
#     # Process the content
#     processed_message = message.copy()
#     if isinstance(content_obj["content"], list) and len(content_obj["content"]) > 5:
#         content_obj["content"] = content_obj["content"][:5]
#         content_obj["message"] = f"Showing first 5 of {len(content_obj['content'])} results"
#         processed_message["content"] = json.dumps(content_obj)
#     
#     return processed_message
