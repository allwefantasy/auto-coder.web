import logging
from pydantic import BaseModel
import requests
from fastapi import APIRouter, HTTPException, Request, Query, Body
from fastapi.responses import HTMLResponse
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse
import aiofiles
from pathlib import Path
import json
from datetime import datetime
import uuid
from loguru import logger as global_logger

logger = global_logger.bind(name="editable_preview")
router = APIRouter()

# --- Configuration ---
BRIDGE_SCRIPT_PATH = "/bridge.js"  # Path where the frontend serves bridge.js
SAVED_PREVIEWS_DIR = Path(".auto-coder/auto-coder.web/editable-previews")
SAVED_PREVIEWS_DIR.mkdir(parents=True, exist_ok=True)
# --- End Configuration ---


def resolve_url(base_url: str, relative_url: str) -> str:
    """Resolves a relative URL against a base URL."""
    try:
        return urljoin(base_url, relative_url)
    except ValueError:
        # Handle cases where relative_url might be invalid
        return relative_url

def rewrite_html_resources(soup: BeautifulSoup, base_url: str, proxy_base: str):
    """Rewrites relative URLs in common HTML tags to absolute URLs or proxy URLs."""
    tags_attributes = {
        'a': 'href',
        'link': 'href',
        'script': 'src',
        'img': 'src',
        'iframe': 'src',
        'form': 'action',
        # Add other tags/attributes as needed
    }

    for tag_name, attr_name in tags_attributes.items():
        for tag in soup.find_all(tag_name):
            attr_value = tag.get(attr_name)
            if attr_value:
                # Resolve relative URLs relative to the original page's base URL
                absolute_url = resolve_url(base_url, attr_value)
                
                # Optionally, rewrite to go through proxy (more complex, might break things)
                # For simplicity now, just make them absolute to original domain
                # proxy_url = f"{proxy_base}?url={absolute_url}" # Example proxy rewrite
                # tag[attr_name] = proxy_url
                tag[attr_name] = absolute_url # Keep original absolute for now

    # Special handling for inline styles with url()
    for tag in soup.find_all(style=True):
        # Basic url() rewriting - might need a more robust CSS parser for complex cases
        style_content = tag['style']
        # This regex is basic, might need refinement
        import re
        def replace_url(match):
            url = match.group(1).strip("'\"")
            absolute_url = resolve_url(base_url, url)
            return f"url('{absolute_url}')"

        tag['style'] = re.sub(r"url\((.*?)\)", replace_url, style_content)

    # Consider rewriting srcset for images as well if needed

@router.get("/api/editable-preview/proxy", response_class=HTMLResponse)
async def proxy_external_url(request: Request, url: str = Query(...)):
    """
    Fetches an external URL, injects a bridge script, and returns the HTML.
    Handles basic resource URL rewriting.
    """
    if not url or not url.startswith(('http://', 'https://')):
        raise HTTPException(status_code=400, detail="Invalid or missing URL parameter")

    try:
        headers = {
            # Mimic a browser request
            'User-Agent': request.headers.get('user-agent', 'Mozilla/5.0'),
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Referer': urlparse(url).scheme + "://" + urlparse(url).netloc # Set referer to target domain
        }
        response = requests.get(url, headers=headers, timeout=15, allow_redirects=True)
        response.raise_for_status() # Raise HTTPError for bad responses (4xx or 5xx)

        # Check content type
        content_type = response.headers.get('content-type', '').lower()
        if 'text/html' not in content_type:
            logger.warning(f"Proxied URL {url} returned non-HTML content-type: {content_type}")
            # Return as is if not HTML, or raise error? Decide based on desired behavior.
            # For now, let's try parsing anyway, but log a warning.
            # raise HTTPException(status_code=400, detail=f"URL did not return HTML content. Content-Type: {content_type}")

        # Parse HTML content
        soup = BeautifulSoup(response.text, 'html.parser')

        # --- Inject Bridge Script ---
        bridge_script_tag = soup.new_tag("script")
        bridge_script_tag["src"] = BRIDGE_SCRIPT_PATH
        bridge_script_tag["defer"] = True # Load after HTML parsing but before DOMContentLoaded

        # Try injecting into <head>, fallback to <body>
        head = soup.find('head')
        if head:
            head.append(bridge_script_tag)
        else:
            body = soup.find('body')
            if body:
                body.append(bridge_script_tag)
            else:
                # If no head or body, append to the root (less ideal)
                soup.append(bridge_script_tag)
        # --- End Injection ---

        # --- Rewrite Resource URLs ---
        # Get the final URL after potential redirects
        final_url = response.url
        # Define the base for our proxy endpoint (needed if we decide to proxy resources)
        proxy_base_url = str(request.base_url) + "api/editable-preview/proxy"
        rewrite_html_resources(soup, final_url, proxy_base_url)
        # --- End Rewriting ---

        # Return modified HTML
        modified_html = str(soup)

        # Prepare response, try to remove X-Frame-Options
        resp_headers = dict(response.headers)
        # Remove security headers that prevent framing (use with caution)
        resp_headers.pop('X-Frame-Options', None)
        resp_headers.pop('Content-Security-Policy', None)
        # Remove Content-Length header
        resp_headers.pop('Content-Length', None)
        # Ensure correct content type
        resp_headers['Content-Type'] = 'text/html; charset=utf-8' # Force UTF-8

        return HTMLResponse(content=modified_html, headers=resp_headers)

    except requests.exceptions.Timeout:
        raise HTTPException(status_code=504, detail=f"Timeout while fetching URL: {url}")
    except requests.exceptions.RequestException as e:
        logger.error(f"Error fetching URL {url}: {e}")
        raise HTTPException(status_code=502, detail=f"Failed to fetch URL: {url}. Error: {str(e)}")
    except Exception as e:
        logger.error(f"Error processing proxy request for {url}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error processing URL: {url}")


class SavePreviewRequest(BaseModel):
    url: str
    html_content: str

@router.post("/api/editable-preview/save")
async def save_edited_preview(payload: SavePreviewRequest = Body(...)):
    """Saves the edited HTML content for a given URL."""
    try:
        url = payload.url
        html_content = payload.html_content

        if not url or not html_content:
            raise HTTPException(status_code=400, detail="Missing URL or HTML content")

        # Generate a unique filename or use a hash of the URL
        parsed_url = urlparse(url)
        # Sanitize filename (basic example)
        filename_base = f"{parsed_url.netloc}_{parsed_url.path}".replace('/', '_').replace('.', '_')
        filename_base = "".join(c for c in filename_base if c.isalnum() or c in ('_', '-')).rstrip('_')[:100] # Limit length
        
        save_id = str(uuid.uuid4())
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{filename_base}_{timestamp}_{save_id}.html"
        filepath = SAVED_PREVIEWS_DIR / filename

        metadata = {
            "original_url": url,
            "saved_at": datetime.now().isoformat(),
            "save_id": save_id,
            "filename": filename
        }
        meta_filepath = SAVED_PREVIEWS_DIR / f"{filename}.meta.json"


        async with aiofiles.open(filepath, mode='w', encoding='utf-8') as f:
            await f.write(html_content)

        async with aiofiles.open(meta_filepath, mode='w', encoding='utf-8') as f:
            await f.write(json.dumps(metadata, indent=2))

        logger.info(f"Saved edited preview for URL '{url}' to '{filepath}'")
        return {"status": "success", "save_id": save_id, "filename": filename}

    except HTTPException:
        raise # Re-raise HTTP exceptions
    except Exception as e:
        logger.error(f"Error saving edited preview for URL '{payload.url}': {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to save edited preview")