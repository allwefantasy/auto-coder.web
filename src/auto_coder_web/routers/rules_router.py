import asyncio
import json
import os
import fnmatch
import pathspec
from threading import Thread
from concurrent.futures import ThreadPoolExecutor
from fastapi import APIRouter, HTTPException, Request, Depends, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import Dict, Any, Optional, List

from autocoder.common.rulefiles.autocoderrules_utils import get_rules, AutocoderRulesManager, RuleFile, parse_rule_file
from autocoder.agent.auto_learn import AutoLearn
from autocoder.common import SourceCode, SourceCodeList
from autocoder.auto_coder_runner import get_final_config, get_single_llm, get_memory
from autocoder.chat_auto_coder_lang import get_message, get_message_with_format
from autocoder.rag.token_counter import count_tokens
from autocoder.events.event_manager_singleton import get_event_manager, gengerate_event_file_path, get_event_file_path
from autocoder.events import event_content as EventContentCreator
from autocoder.events.event_types import EventType
from autocoder.common.global_cancel import global_cancel, CancelRequestedException
from autocoder.command_parser import CommandParser
# Add import for AutoCoderRunnerWrapper
from auto_coder_web.auto_coder_runner_wrapper import AutoCoderRunnerWrapper
from loguru import logger

router = APIRouter()

# Thread pool for cancellation, similar to coding_router
cancel_thread_pool = ThreadPoolExecutor(max_workers=5)

# --- Pydantic Models ---

class RuleInfo(BaseModel):
    file_path: str
    token_count: int
    description: Optional[str] = None
    globs: Optional[List[str]] = None
    always_apply: Optional[bool] = None
    content: Optional[str] = None # Optionally include content for 'get'

class RuleListResponse(BaseModel):
    rules: List[RuleInfo]

class RulePatternRequest(BaseModel):
    pattern: str

class RuleAnalyzeRequest(BaseModel):
    query: Optional[str] = ""
    # Add other relevant parameters if needed, e.g., specific files to analyze
    # files: Optional[List[str]] = None

class RuleCommitRequest(BaseModel):
    commit_id: str
    query: str

class RuleGeneralResponse(BaseModel):
    status: str
    message: str

class RuleHelpResponse(BaseModel):
    help_text: str

class AsyncTaskResponse(BaseModel):
    event_file_id: str

class UserResponseRequest(BaseModel):
    event_id: str
    event_file_id: str
    response: str # For potential future use if analyze/commit become interactive

class CancelTaskRequest(BaseModel):
    event_file_id: str

# 添加新的响应模型用于返回prompt
class PromptResponse(BaseModel):
    prompt: str

# --- Dependencies ---

async def get_project_path(request: Request) -> str:
    """
    Gets the project path from the FastAPI request state.
    """
    path = request.app.state.project_path
    logger.debug(f"Retrieved project path: {path}")
    if not path or not os.path.isdir(path):
         logger.error(f"Invalid project path configured: {path}")
         raise HTTPException(status_code=500, detail="Server configuration error: Project path is invalid or not set.")
    # Ensure rules manager uses the correct project root for this request context
    # This might require adjusting AutocoderRulesManager if it's a strict singleton
    # For now, we rely on get_rules taking project_root
    return path

# --- Helper Functions ---

def _get_rules_logic(project_root: str, pattern: str = "*") -> List[RuleInfo]:
    """Shared logic for listing/getting rules."""
    logger.info(f"Fetching rules for project: {project_root} with pattern: {pattern}")
    # Use the project_root specific function
    rules_content = get_rules(project_root=project_root)
    if not rules_content:
        logger.warning(f"No rules found in project: {project_root}")
        return []

    matched_rules = []
    rule_files_info = []

    # Normalize pattern for pathspec
    if pattern == "*":
        # Match all .md files within the rules directories
        spec = pathspec.PathSpec.from_lines(pathspec.patterns.GitWildMatchPattern, ["*.md"])
    else:
        # Use the provided pattern
        spec = pathspec.PathSpec.from_lines(pathspec.patterns.GitWildMatchPattern, [pattern])

    for file_path, content in rules_content.items():
        try:
            # Use relative path for matching if possible
            if os.path.isabs(file_path):
                 try:
                    rel_path = os.path.relpath(file_path, project_root)
                 except ValueError:
                    # Handle cases where file_path is not under project_root (e.g., different drive on Windows)
                    # In such cases, maybe match against the full path or just the filename?
                    # Matching against filename seems safer for wildcard patterns.
                    rel_path = os.path.basename(file_path)
            else:
                rel_path = file_path

            # Perform matching
            if spec.match_file(rel_path):
                matched_rules.append((file_path, content))
        except Exception as e:
            logger.error(f"Error matching pattern '{pattern}' against file '{file_path}': {str(e)}")
            # Continue to next file

    if not matched_rules:
        logger.info(f"No rules matched pattern '{pattern}' in project: {project_root}")
        return []

    # Parse matched files and gather info
    for file_path, content in sorted(matched_rules):
         try:
            # Use the project_root specific function
            parsed_rule = parse_rule_file(file_path, project_root=project_root)
            token_count = count_tokens(content) # Count tokens from raw content
            rule_info = RuleInfo(
                file_path=file_path,
                token_count=token_count,
                description=parsed_rule.description,
                globs=parsed_rule.globs,
                always_apply=parsed_rule.always_apply,
                content=content # Include content for 'get' scenarios
            )
            rule_files_info.append(rule_info)
         except Exception as e:
            logger.error(f"Error processing rule file {file_path}: {e}")
            # Optionally append a rule with an error state

    logger.info(f"Found {len(rule_files_info)} rules matching pattern '{pattern}'")
    return rule_files_info


# --- API Endpoints ---

@router.get("/api/rules/list", response_model=RuleListResponse)
async def list_rules(
    pattern: Optional[str] = Query("*", description="Wildcard pattern to filter rule files (e.g., '*.md', 'common*')"),
    project_path: str = Depends(get_project_path)
):
    """
    Lists rule files, optionally filtered by a wildcard pattern.
    Returns basic info (path, token count, metadata).
    """
    try:
        rules_info = _get_rules_logic(project_path, pattern)
        # For list, we don't need the full content
        for rule in rules_info:
            rule.content = None
        return RuleListResponse(rules=rules_info)
    except Exception as e:
        logger.exception(f"Error listing rules with pattern '{pattern}': {e}")
        raise HTTPException(status_code=500, detail=f"Failed to list rules: {str(e)}")

@router.get("/api/rules/get", response_model=RuleListResponse)
async def get_rule_content(
    pattern: str = Query(..., description="Wildcard pattern to match rule files for content retrieval."),
    project_path: str = Depends(get_project_path)
):
    """
    Gets the content of rule files matching the specified pattern.
    """
    if not pattern:
        raise HTTPException(status_code=400, detail="Pattern parameter is required.")
    try:
        # _get_rules_logic includes content by default
        rules_info = _get_rules_logic(project_path, pattern)
        if not rules_info:
            raise HTTPException(status_code=404, detail=f"No rule files found matching pattern: {pattern}")
        return RuleListResponse(rules=rules_info)
    except HTTPException as e:
        raise e # Re-raise HTTP exceptions
    except Exception as e:
        logger.exception(f"Error getting rule content with pattern '{pattern}': {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get rule content: {str(e)}")


@router.delete("/api/rules/remove", response_model=RuleGeneralResponse)
async def remove_rules(
    pattern: str = Query(..., description="Wildcard pattern identifying rules to remove."),
    project_path: str = Depends(get_project_path)
):
    """
    Removes rule files matching the specified pattern.
    """
    if not pattern:
        raise HTTPException(status_code=400, detail="Pattern parameter is required.")

    logger.info(f"Attempting to remove rules matching pattern '{pattern}' in project: {project_path}")

    # Get rules manager instance specific to the project path if possible, or re-init logic
    # For simplicity, we'll re-fetch rules based on project_path
    rules_content = get_rules(project_root=project_path)
    if not rules_content:
        raise HTTPException(status_code=404, detail="No rule files found to remove.")

    files_to_remove = []
    try:
        spec = pathspec.PathSpec.from_lines(pathspec.patterns.GitWildMatchPattern, [pattern])
        for file_path in rules_content.keys():
            if os.path.isabs(file_path):
                try:
                    rel_path = os.path.relpath(file_path, project_path)
                except ValueError:
                    rel_path = os.path.basename(file_path) # Fallback for cross-drive paths etc.
            else:
                rel_path = file_path

            if spec.match_file(rel_path):
                files_to_remove.append(file_path)

    except Exception as e:
        logger.error(f"Error matching pattern '{pattern}' for removal: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Invalid pattern '{pattern}': {str(e)}")

    if not files_to_remove:
        raise HTTPException(status_code=404, detail=f"No rule files found matching pattern '{pattern}' to remove.")

    removed_count = 0
    errors = []
    for file_path in files_to_remove:
        try:
            os.remove(file_path)
            removed_count += 1
            logger.info(f"Removed rule file: {file_path}")
        except Exception as e:
            error_msg = f"Failed to remove file {file_path}: {str(e)}"
            logger.error(error_msg)
            errors.append(error_msg)

    # Force reload rules in the manager if it's a shared instance (tricky)
    # Or simply rely on next get_rules call to reflect the change
    # AutocoderRulesManager()._load_rules() # This might affect other requests if singleton

    if errors:
        raise HTTPException(status_code=500, detail=f"Removed {removed_count} file(s) but encountered errors: {'; '.join(errors)}")

    return RuleGeneralResponse(status="success", message=f"Successfully removed {removed_count} rule file(s) matching pattern '{pattern}'.")

@router.post("/api/rules/analyze", response_model=AsyncTaskResponse)
async def analyze_rules(
    request_data: RuleAnalyzeRequest,
    project_path: str = Depends(get_project_path)
):
    """
    Analyzes current files (from memory/context) based on rules and an optional query.
    Runs as a background task.
    """
    event_file, file_id = gengerate_event_file_path(base_dir=project_path)
    logger.info(f"Starting rule analysis task {file_id} for project: {project_path}")

    def run_analysis_in_thread():
        try:
            global_cancel.register_token(event_file)
            event_manager = get_event_manager(event_file)
            event_manager.write_event(EventContentCreator.create_task_start(
                "Rule Analysis Started", {"query": request_data.query}
            ).to_dict())

            # --- Analysis Logic ---
            args = get_final_config() # Gets config potentially influenced by project settings
            llm = get_single_llm(args.model, product_mode=args.product_mode)
            auto_learn = AutoLearn(llm=llm, args=args) # Pass project_path

            # TODO: Determine how to get 'current_files' in the web context.
            # This might need state management or explicit file list in request.
            # Using a placeholder or assuming indexer provides files for now.
            # Let's try fetching from memory first, might be empty in web context.
            memory = get_memory() # Get memory specific to project
            files = memory.get("current_files", {}).get("files", [])            

            sources = SourceCodeList([])
            event_manager.write_event(EventContentCreator.create_message(f"Reading {len(files)} files for analysis...").to_dict())
            for file in files:
                file_abs_path = os.path.join(project_path, file) if not os.path.isabs(file) else file
                if not os.path.exists(file_abs_path):
                    logger.warning(f"File not found: {file_abs_path}, skipping.")
                    event_manager.write_event(EventContentCreator.create_warning(f"File not found: {file}").to_dict())
                    continue
                try:
                    with open(file_abs_path, "r", encoding="utf-8") as f:
                        source_code = f.read()
                        sources.sources.append(SourceCode(module_name=file, source_code=source_code)) # Use relative path as module name
                except Exception as e:
                    logger.error(f"Error reading file {file_abs_path}: {e}")
                    event_manager.write_event(EventContentCreator.create_error(
                        error_code="FILE_READ_ERROR",
                        error_message=f"Error reading file {file}: {e}"
                    ).to_dict())
                    # Decide whether to continue or fail task

            if not sources.sources:
                 raise ValueError("No valid source files could be read for analysis.")

            event_manager.write_event(EventContentCreator.create_message(f"Analyzing {len(sources.sources)} files with query: '{request_data.query or 'Default analysis'}'").to_dict())

            # Generate the analysis prompt text
            prompt_text = auto_learn.analyze_modules.prompt(sources=sources, query=request_data.query)

            # --- Use AutoCoderRunnerWrapper to execute the generated prompt ---
            wrapper = AutoCoderRunnerWrapper(project_path)
            wrapper.configure_wrapper(f"event_file:{event_file}")
            # The coding_wapper will handle writing events, including completion/error
            result = wrapper.coding_wapper(prompt_text)
            # The wrapper logs completion internally, no need for manual completion event here.
            # logger.info(f"Rule analysis task {file_id} completed successfully.") # Logged by wrapper

        except CancelRequestedException:
            logger.info(f"Rule analysis task {file_id} cancelled.")
            get_event_manager(event_file).write_error(
                 EventContentCreator.create_error(error_code="499", error_message="Task cancelled by user.").to_dict()
             )
        except Exception as e:
            logger.exception(f"Error during rule analysis task {file_id}: {e}")
            get_event_manager(event_file).write_error(
                EventContentCreator.create_error(error_code="500", error_message=str(e), details={}).to_dict()
            )
        finally:
            global_cancel.unregister_token(event_file) # Clean up token

    # Start the background thread
    thread = Thread(target=run_analysis_in_thread, daemon=True)
    thread.start()

    return AsyncTaskResponse(event_file_id=file_id)


@router.post("/api/rules/commit", response_model=AsyncTaskResponse)
async def analyze_commit_rules(
    request_data: RuleCommitRequest,
    project_path: str = Depends(get_project_path)
):
    """
    Analyzes a specific git commit based on rules and a query.
    Runs as a background task.
    """
    event_file, file_id = gengerate_event_file_path(base_dir=project_path)
    logger.info(f"Starting commit analysis task {file_id} for commit {request_data.commit_id} in project: {project_path}")

    def run_commit_analysis_in_thread():
        try:
            global_cancel.register_token(event_file)
            event_manager = get_event_manager(event_file)
            event_manager.write_event(EventContentCreator.create_task_start(
                "Commit Analysis Started", {"commit_id": request_data.commit_id, "query": request_data.query}
            ).to_dict())

            # --- Commit Analysis Logic ---
            args = get_final_config()
            llm = get_single_llm(args.model, product_mode=args.product_mode)
            # Ensure AutoLearn uses the correct project path context
            auto_learn = AutoLearn(llm=llm, args=args)

            event_manager.write_event(EventContentCreator.create_message(f"Fetching changes for commit: {request_data.commit_id}").to_dict())
            changes, _ = auto_learn.get_commit_changes(request_data.commit_id)

            if not changes:
                 raise ValueError(f"Could not retrieve changes for commit ID: {request_data.commit_id}. Ensure it's a valid commit.")

            event_manager.write_event(EventContentCreator.create_message(f"Analyzing commit {request_data.commit_id} with query: '{request_data.query}'").to_dict())

            # Generate the commit analysis prompt text
            prompt_text = auto_learn.analyze_commit.prompt(
                querie_with_urls_and_changes=changes,
                new_query=request_data.query
            )

            # --- Use AutoCoderRunnerWrapper to execute the generated prompt ---
            wrapper = AutoCoderRunnerWrapper(project_path)
            wrapper.configure_wrapper(f"event_file:{event_file}")
            # The coding_wapper will handle writing events, including completion/error
            result = wrapper.coding_wapper(prompt_text)
            # The wrapper logs completion internally, no need for manual completion event here.
            # logger.info(f"Commit analysis task {file_id} completed successfully.") # Logged by wrapper

        except CancelRequestedException:
            logger.info(f"Commit analysis task {file_id} cancelled.")
            get_event_manager(event_file).write_error(
                 EventContentCreator.create_error(error_code="499", error_message="Task cancelled by user.").to_dict()
             )
        except Exception as e:
            logger.exception(f"Error during commit analysis task {file_id}: {e}")
            get_event_manager(event_file).write_error(
                EventContentCreator.create_error(error_code="500", error_message=str(e), details={}).to_dict()
            )
        finally:
             global_cancel.unregister_token(event_file) # Clean up token

    # Start the background thread
    thread = Thread(target=run_commit_analysis_in_thread, daemon=True)
    thread.start()

    return AsyncTaskResponse(event_file_id=file_id)


@router.get("/api/rules/help", response_model=RuleHelpResponse)
async def get_help():
    """
    Returns the help text for the /rules command.
    """
    # Attempt to get localized help text
    help_text = get_message("rules_help_text")
    if not help_text or help_text == "rules_help_text": # Check if translation failed
        # Provide a default English help text if localization fails
        help_text = """
Available /rules API Endpoints:
  GET  /api/rules/list?pattern=<wildcard>   - List rule files (basic info), optionally filter by pattern.
  GET  /api/rules/get?pattern=<wildcard>    - Get content of rule files matching the pattern.
  DELETE /api/rules/remove?pattern=<wildcard> - Remove rule files matching the pattern.
  POST /api/rules/analyze                   - Analyze current files (requires files in context/memory) with optional query in body. Runs async.
                                              Body: { "query": "Optional analysis query" }
  POST /api/rules/commit                    - Analyze a specific git commit with a query. Runs async.
                                              Body: { "commit_id": "your_commit_hash", "query": "Your analysis query" }
  GET  /api/rules/help                      - Show this help message.
  GET  /api/rules/events?event_file_id=<id> - Stream events for async tasks (analyze, commit).
  POST /api/rules/cancel                    - Cancel an ongoing async task.
                                              Body: { "event_file_id": "task_event_id" }
        """
    return RuleHelpResponse(help_text=help_text.strip())


@router.get("/api/rules/events")
async def poll_rule_events(event_file_id: str, project_path: str = Depends(get_project_path)):
    """
    SSE endpoint to stream events for background rule tasks (analyze, commit).
    """
    async def event_stream():
        event_file = get_event_file_path(event_file_id, project_path)
        if not event_file or not os.path.exists(os.path.dirname(event_file)):
             logger.error(f"Event file path directory does not exist for ID {event_file_id} in project {project_path}")
             # Send an error event and close
             error_event = EventContentCreator.create_error("404", "Event stream not found or invalid ID.").to_dict()
             yield f"data: {json.dumps(error_event)}\n\n"
             return

        logger.info(f"Starting SSE stream for event file: {event_file}")
        event_manager = get_event_manager(event_file)
        while True:
            try:
                # Use asyncio.to_thread for blocking read_events
                events = await asyncio.to_thread(event_manager.read_events, block=False)

                if not events:
                    # Check if the task is globally cancelled
                    if global_cancel.is_set(token=event_file):
                         logger.info(f"SSE stream {event_file_id}: Task cancellation detected, closing stream.")
                         # Send a final cancellation event if not already sent by the task thread
                         cancel_event = EventContentCreator.create_error("499", "Task cancelled.").to_dict()
                         yield f"data: {json.dumps(cancel_event)}\n\n"
                         break
                    await asyncio.sleep(0.2) # Slightly longer sleep if no events
                    continue

                current_event = None
                for event in events:
                    current_event = event
                    event_json = event.to_json()
                    yield f"data: {event_json}\n\n"
                    await asyncio.sleep(0.01) # Small delay to allow client processing

                if current_event is not None:
                    if current_event.event_type in [EventType.ERROR, EventType.COMPLETION]:
                        logger.info(f"SSE stream {event_file_id}: Terminal event received ({current_event.event_type.name}), closing stream.")
                        break
                    # Add check for explicit CANCELLED event type if implemented
                    # elif current_event.event_type == EventType.CANCELLED:
                    #     logger.info(f"SSE stream {event_file_id}: Cancelled event received, closing stream.")
                    #     break

            except CancelRequestedException:
                 logger.info(f"SSE stream {event_file_id}: Cancellation detected during event read, closing stream.")
                 yield f"data: {EventContentCreator.create_error('499', 'Task cancelled.').to_json()}\n\n"
                 break
            except Exception as e:
                logger.error(f"Error in SSE stream {event_file_id}: {str(e)}")
                # Check if it's a file not found error after task completion/cleanup
                if isinstance(e, FileNotFoundError) or "No such file or directory" in str(e):
                     logger.warning(f"SSE stream {event_file_id}: Event file likely removed after task completion. Closing stream.")
                     yield f"data: {EventContentCreator.create_error('410', 'Task finished and event log expired.').to_json()}\n\n"
                else:
                     logger.exception(e) # Log full traceback for unexpected errors
                     yield f"data: {EventContentCreator.create_error('500', f'SSE stream error: {str(e)}').to_json()}\n\n"
                break

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "Content-Type": "text/event-stream",
            "X-Accel-Buffering": "no",
            "Transfer-Encoding": "chunked",
        },
    )

# Note: User response endpoint might not be directly applicable to analyze/commit unless they become interactive.
# Including it for consistency with coding_router pattern.
@router.post("/api/rules/response")
async def response_user_rules(request: UserResponseRequest, project_path: str = Depends(get_project_path)):
    """
    Handles user responses if rule tasks become interactive (currently unlikely).
    """
    logger.warning(f"Received user response for rule task {request.event_file_id}, but rule tasks are not currently interactive.")
    # Implement similar logic to coding_router if interaction is needed in the future.
    # For now, just acknowledge or return an informative message.
    return {"status": "received", "message": "Rule tasks are not currently interactive."}
    # Example future implementation:
    # try:
    #     event_file = get_event_file_path(file_id=request.event_file_id, project_path=project_path)
    #     event_manager = get_event_manager(event_file)
    #     response_event = event_manager.respond_to_user(request.event_id, request.response)
    #     return {"status": "success", "message": "Response sent", "event_id": response_event.event_id}
    # except Exception as e:
    #     logger.error(f"Error sending user response for rule task {request.event_file_id}: {str(e)}")
    #     raise HTTPException(status_code=500, detail=f"Failed to send response: {str(e)}")

@router.post("/api/rules/cancel")
async def cancel_rule_task(request: CancelTaskRequest, project_path: str = Depends(get_project_path)):
    """
    Cancels a running background rule task (analyze, commit).
    """
    try:
        event_file = get_event_file_path(file_id=request.event_file_id, project_path=project_path)
        logger.info(f"Received cancel request for task {request.event_file_id} associated with file: {event_file}")

        if not event_file:
             raise HTTPException(status_code=404, detail=f"Event file ID {request.event_file_id} not found or invalid.")

        # Check if the event file exists - indicates if the task might still be running or recently finished
        event_manager = get_event_manager(event_file) # This implicitly checks existence somewhat

        def cancel_in_thread():
            try:
                logger.info(f"Setting cancellation flag for token: {event_file}")
                global_cancel.set(token=event_file)

                # Attempt to write a cancel event immediately for faster feedback via SSE
                # This might fail if the task already cleaned up the file, which is acceptable.
                try:
                     event_manager.write_error(
                         EventContentCreator.create_error(
                             error_code="499", error_message="Cancel request received", details={}
                         ).to_dict()
                     )
                     logger.info(f"Cancellation event written for task {request.event_file_id}")
                except Exception as write_err:
                     logger.warning(f"Could not write immediate cancel event for task {request.event_file_id} (might be already finished): {write_err}")

            except Exception as e:
                # Log errors during the cancellation signaling process itself
                logger.error(f"Error during cancellation signaling for task {request.event_file_id}: {str(e)}")
                # Don't raise HTTPException here, as the request to cancel was received.
                # The client will see the task end via SSE or timeout.

        # Use the shared cancel thread pool
        cancel_thread_pool.submit(cancel_in_thread)

        return {"status": "success", "message": "Cancel request sent. Task termination depends on the task's current state."}
    except Exception as e:
        logger.error(f"Error processing cancel request for {request.event_file_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to process cancel request: {str(e)}")

# TODO: Add endpoints for saving/loading rule task history if needed, similar to coding_router
# @router.post("/api/rules/save-history")
# @router.get("/api/rules/history")
# @router.get("/api/rules/task/{task_id}")

@router.post("/api/rules/context/prompt", response_model=PromptResponse)
async def get_context_prompt(
    request_data: RuleAnalyzeRequest,
    project_path: str = Depends(get_project_path)
):
    """
    生成并返回基于当前文件和规则的分析提示，不执行分析任务
    """
    logger.info(f"生成分析提示，项目路径: {project_path}")
    
    try:
        # 获取配置和LLM
        args = get_final_config()
        llm = get_single_llm(args.model, product_mode=args.product_mode)
        auto_learn = AutoLearn(llm=llm, args=args)
        
        # 获取内存中的文件
        memory = get_memory()
        files = memory.get("current_files", {}).get("files", [])                
            
        sources = SourceCodeList([])
        for file in files:
            file_abs_path = os.path.join(project_path, file) if not os.path.isabs(file) else file
            if not os.path.exists(file_abs_path):
                logger.warning(f"文件未找到: {file_abs_path}, 跳过")
                continue
            try:
                with open(file_abs_path, "r", encoding="utf-8") as f:
                    source_code = f.read()
                    sources.sources.append(SourceCode(module_name=file, source_code=source_code))
            except Exception as e:
                logger.error(f"读取文件 {file_abs_path} 错误: {e}")
                continue                        
            
        # 生成分析提示文本
        prompt_text = auto_learn.analyze_modules.prompt(sources=sources, query=request_data.query)
        
        return PromptResponse(prompt=prompt_text)
        
    except Exception as e:
        logger.exception(f"生成分析提示时出错: {e}")
        raise HTTPException(status_code=500, detail=f"生成提示失败: {str(e)}")

@router.post("/api/rules/commit/prompt", response_model=PromptResponse)
async def get_commit_prompt(
    request_data: RuleCommitRequest,
    project_path: str = Depends(get_project_path)
):
    """
    生成并返回基于特定git提交的分析提示，不执行分析任务
    """
    logger.info(f"生成提交分析提示，提交ID: {request_data.commit_id}，项目路径: {project_path}")
    
    try:
        # 获取配置和LLM
        args = get_final_config()
        llm = get_single_llm(args.model, product_mode=args.product_mode)
        auto_learn = AutoLearn(llm=llm, args=args)
        
        # 获取提交变更
        changes, _ = auto_learn.get_commit_changes(request_data.commit_id)
        
        if not changes:
            raise HTTPException(status_code=400, detail=f"无法获取提交ID的变更: {request_data.commit_id}。请确保这是一个有效的提交。")
            
        # 生成提交分析提示文本
        prompt_text = auto_learn.analyze_commit.prompt(
            querie_with_urls_and_changes=changes,
            new_query=request_data.query
        )
        
        return PromptResponse(prompt=prompt_text)
        
    except Exception as e:
        logger.exception(f"生成提交分析提示时出错: {e}")
        raise HTTPException(status_code=500, detail=f"生成提示失败: {str(e)}")
