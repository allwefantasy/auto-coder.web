"""
Message parser for processing agentic messages.

This module provides a registry-based approach to parse and process messages
from different tools. New parsers can be easily registered to handle different
tool types.
"""
import json
from typing import Dict, Any, Callable, Optional, List, TypeVar, cast

# Define a type for parser functions
T = TypeVar('T')
ParserFunc = Callable[[Dict[str, Any], Dict[str, Any]], Optional[Dict[str, Any]]]

# Registry to store message parsers
_PARSERS: Dict[str, ParserFunc] = {}

def register_parser(tool_name: str):
    """
    Decorator to register a parser function for a specific tool.
    
    Args:
        tool_name: The name of the tool this parser handles
        
    Returns:
        Decorator function
    """
    def decorator(func: ParserFunc) -> ParserFunc:
        _PARSERS[tool_name] = func
        return func
    return decorator

def parse_message(message: Dict[str, Any]) -> Dict[str, Any]:
    """
    Parse a message and apply the appropriate parser based on the tool_name.
    
    Args:
        message: The message to parse
        
    Returns:
        The processed message
    """
    processed_message = message.copy()
    
    try:
        # Try to parse the message content as JSON
        content = message.get("content", "")
        if not isinstance(content, str):
            return processed_message
            
        content_obj = json.loads(content)
        
        # Try all registered parsers
        for tool_name, parser in _PARSERS.items():
            # Let each parser decide if it can handle this message
            result = parser(content_obj, message)
            if result is not None:
                return result
    
    except (json.JSONDecodeError, TypeError, AttributeError):
        # If parsing fails, keep the original message unchanged
        pass
        
    return processed_message

def parse_messages(messages: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Parse a list of messages, applying the appropriate parser to each.
    
    Args:
        messages: List of messages to parse
        
    Returns:
        List of processed messages
    """
    # 先补充 metadata 字段
    normalized_messages = []
    for message in messages:
        if 'metadata' not in message or message['metadata'] is None:
            msg = message.copy()
            msg['metadata'] = {}
            normalized_messages.append(msg)
        else:
            normalized_messages.append(message)
    return [parse_message(message) for message in normalized_messages]

# Tool-specific parsers are defined in tool_parsers.py
# and automatically registered when that module is imported
