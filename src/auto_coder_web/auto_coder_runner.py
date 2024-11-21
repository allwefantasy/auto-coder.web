from fastapi import HTTPException, BackgroundTasks
from typing import List, Dict, Any, Optional
import os
import yaml
import json
import uuid
import glob
from pydantic import BaseModel
import sys
import io
import subprocess
import byzerllm
from contextlib import contextmanager
from byzerllm.utils.langutil import asyncfy_with_semaphore
from autocoder.common import AutoCoderArgs
from byzerllm.utils.nontext import Image
from autocoder.auto_coder import main as auto_coder_main
from autocoder.utils import get_last_yaml_file
from autocoder.utils.request_queue import (
    request_queue,
    RequestValue,
    StreamValue,
    DefaultValue,
    RequestOption,
)
from autocoder.utils.queue_communicate import (
    queue_communicate,
    CommunicateEvent,
    CommunicateEventType,
)
from autocoder.utils.log_capture import LogCapture
from threading import Thread
from byzerllm.utils import format_str_jinja2
from autocoder.index.symbols_utils import (
    extract_symbols,
    symbols_info_to_str,
    SymbolsInfo,
    SymbolType,
)


class SymbolItem(BaseModel):
    symbol_name: str
    symbol_type: SymbolType
    file_name: str


class AutoCoderRunner:
    def __init__(self, project_path: str):
        self.project_path = project_path
        self.base_persist_dir = os.path.join(
            project_path, ".auto-coder", "plugins", "chat-auto-coder")
        self.default_exclude_dirs = [
            ".git", "node_modules", "dist", "build", "__pycache__"]
        self.memory = {
            "conversation": [],
            "current_files": {"files": []},
            "conf": {},
            "exclude_dirs": [],
        }
        self.load_memory()

    @contextmanager
    def redirect_stdout(self):
        original_stdout = sys.stdout
        sys.stdout = f = io.StringIO()
        try:
            yield f
        finally:
            sys.stdout = original_stdout

    def save_memory(self):
        os.makedirs(self.base_persist_dir, exist_ok=True)
        with open(os.path.join(self.base_persist_dir, "memory.json"), "w") as f:
            json.dump(self.memory, f, indent=2, ensure_ascii=False)

    def load_memory(self):
        memory_path = os.path.join(self.base_persist_dir, "memory.json")
        if os.path.exists(memory_path):
            with open(memory_path, "r") as f:
                self.memory = json.load(f)

    def add_group(self, group_name: str, description: str) -> Dict[str, str]:

        if group_name in self.memory["current_files"]["groups"]:
            return None

        self.memory["current_files"]["groups"][group_name] = []

        if "groups_info" not in self.memory["current_files"]:
            self.memory["current_files"]["groups_info"] = {}

        self.memory["current_files"]["groups_info"][group_name] = {
            "query_prefix": description
        }
        self.save_memory()
        return {"message": f"Added group: {group_name}"}

    def remove_group(self, group_name: str) -> Dict[str, str]:
        if group_name not in self.memory["current_files"]["groups"]:
            return None
        del self.memory["current_files"]["groups"][group_name]
        del self.memory["current_files"]["groups_info"][group_name]
        self.save_memory()
        return {"message": f"Removed group: {group_name}"}

    def switch_groups(self, group_names: List[str]) -> Dict[str, str]:
        new_files = []
        for group_name in group_names:
            files = self.memory["current_files"]["groups"][group_name]
            new_files.extend(files)
        self.memory["current_files"]["files"] = new_files
        self.memory["current_files"]["current_groups"] = group_names
        self.save_memory()
        return {"message": f"Switched to groups: {group_names}"}

    def add_files_to_group(self, group_name: str, files: List[str]) -> Dict[str, Any]:
        for file in files:
            if file:
                self.memory["current_files"]["groups"][group_name].append(
                    os.path.join(self.project_path, file))
        self.save_memory()
        return {
            "message": f"Added files to group: {group_name}"
        }

    def remove_files_from_group(self, group_name: str, files: List[str]) -> Dict[str, Any]:
        existing_files = self.memory["current_files"]["groups"][group_name]
        for file in files:
            target_file = os.path.join(self.project_path, file)
            if target_file in existing_files:
                existing_files.remove(target_file)
        self.save_memory()
        return {
            "message": f"Removed files from group: {group_name}"
        }

    def get_groups(self) -> Dict[str, List[str]]:
        if "groups" not in self.memory["current_files"]:
            return {"groups": []}
        return {"groups": list(self.memory["current_files"]["groups"].keys())}

    def get_files_in_group(self, group_name: str) -> Dict[str, List[str]]:
        files = self.memory["current_files"]["groups"][group_name]
        files = [os.path.relpath(f, self.project_path) for f in files]
        return {"files": files}

    def get_group_description(self, group_name: str) -> str:
        if group_name not in self.memory["current_files"]["groups_info"]:
            return ""
        return self.memory["current_files"]["groups_info"][group_name].get("query_prefix", "")

    def get_active_files(self) -> Dict[str, List[str]]:
        return {"files": self.memory["current_files"]["files"]}

    def get_exclude_dirs(self) -> Dict[str, List[str]]:
        return {"files": self.memory.get("exclude_dirs", [])}

    def find_files_in_project(self, patterns: List[str]) -> List[str]:

        project_root = self.project_path
        matched_files = []

        active_files = self.get_active_files()
        active_file_list = active_files.get("files", [])
        if len(patterns) == 1 and patterns[0] == "":
            return active_file_list

        for pattern in patterns:
            for file_path in active_file_list:
                if pattern in os.path.basename(file_path):
                    matched_files.append(file_path)

        final_exclude_dirs = self.default_exclude_dirs + \
            self.memory.get("exclude_dirs", [])

        for pattern in patterns:
            if "*" in pattern or "?" in pattern:
                for file_path in glob.glob(pattern, recursive=True):
                    if os.path.isfile(file_path):
                        abs_path = os.path.abspath(file_path)
                        if not any(
                            exclude_dir in abs_path.split(os.sep)
                            for exclude_dir in final_exclude_dirs
                        ):
                            matched_files.append(abs_path)
            else:
                is_added = False
                for root, dirs, files in os.walk(project_root):
                    dirs[:] = [d for d in dirs if d not in final_exclude_dirs]
                    if pattern in files:
                        matched_files.append(os.path.join(root, pattern))
                        is_added = True
                    else:
                        for file in files:
                            if pattern in os.path.join(root, file):
                                matched_files.append(os.path.join(root, file))
                                is_added = True
                if not is_added:
                    matched_files.append(pattern)

        return list(set(matched_files))

    def get_symbol_list(self) -> List[SymbolItem]:
        list_of_symbols = []
        index_file = os.path.join(
            self.project_path, ".auto-coder", "index.json")

        if os.path.exists(index_file):
            with open(index_file, "r") as file:
                index_data = json.load(file)
        else:
            index_data = {}

        for item in index_data.values():
            symbols_str = item["symbols"]
            module_name = item["module_name"]
            info1 = extract_symbols(symbols_str)
            for name in info1.classes:
                list_of_symbols.append(
                    SymbolItem(
                        symbol_name=name,
                        symbol_type=SymbolType.CLASSES,
                        file_name=module_name,
                    )
                )
            for name in info1.functions:
                list_of_symbols.append(
                    SymbolItem(
                        symbol_name=name,
                        symbol_type=SymbolType.FUNCTIONS,
                        file_name=module_name,
                    )
                )
            for name in info1.variables:
                list_of_symbols.append(
                    SymbolItem(
                        symbol_name=name,
                        symbol_type=SymbolType.VARIABLES,
                        file_name=module_name,
                    )
                )
        return list_of_symbols

    def convert_config_value(self, key: str, value: str) -> Any:
        field_info = AutoCoderArgs.model_fields.get(key)
        if field_info:
            if value.strip() == "":
                return value
            if value.lower() in ["true", "false"]:
                return value.lower() == "true"
            elif "int" in str(field_info.annotation):
                return int(value)
            elif "float" in str(field_info.annotation):
                return float(value)
            else:
                return value
        else:
            return None

    def convert_yaml_config_to_str(self, yaml_config: Dict) -> str:
        return yaml.safe_dump(
            yaml_config,
            allow_unicode=True,
            default_flow_style=False,
            default_style=None,
        )

    def add_files(self, files: List[str]) -> Dict[str, Any]:
        project_root = os.getcwd()
        existing_files = self.memory["current_files"]["files"]
        matched_files = self.find_files_in_project(files)

        files_to_add = [f for f in matched_files if f not in existing_files]
        if files_to_add:
            self.memory["current_files"]["files"].extend(files_to_add)
            self.save_memory()
            return {
                "message": f"Added files: {[os.path.relpath(f, project_root) for f in files_to_add]}"
            }
        else:
            return {
                "message": "All specified files are already in the current session or no matches found."
            }

    def remove_files(self, files: List[str]) -> Dict[str, str]:
        if "/all" in files:
            self.memory["current_files"]["files"] = []
            self.save_memory()
            return {"message": "Removed all files."}
        else:
            removed_files = []
            for file in self.memory["current_files"]["files"]:
                if os.path.basename(file) in files or file in files:
                    removed_files.append(file)
            for file in removed_files:
                self.memory["current_files"]["files"].remove(file)
            self.save_memory()
            return {
                "message": f"Removed files: {[os.path.basename(f) for f in removed_files]}"
            }

    def list_files(self) -> Dict[str, List[str]]:
        return {"files": self.memory["current_files"]["files"]}

    def configure(self, key: str, value: str) -> Dict[str, str]:
        self.memory["conf"][key] = value
        self.save_memory()
        return {"message": f"Set {key} to {value}"}
    
    def drop_config(self, key: str) -> Dict[str, str]:
        if key in self.memory["conf"]:
            del self.memory["conf"][key]
            self.save_memory()
            return {"message": f"Deleted configuration: {key}"}

    def get_config(self) -> Dict[str, str]:
        """Get current configuration

        Returns:
            Dict with current config values
        """
        return self.memory.get("conf", {})

    def delete_config(self, key: str) -> Dict[str, str]:
        if key in self.memory["conf"]:
            del self.memory["conf"][key]
            self.save_memory()
            return {"message": f"Deleted configuration: {key}"}
        else:
            raise ValueError(f"Configuration not found: {key}")

    def get_event(self, request_id: str) -> Dict:
        if not request_id:
            raise ValueError("request_id is required")
        return queue_communicate.get_event(request_id)

    def response_event(self, request_id: str, event: CommunicateEvent, response: str):
        if not request_id:
            raise ValueError("request_id is required")

        event = CommunicateEvent(**event)
        queue_communicate.response_event(request_id, event, response=response)
        return {"message": "success"}

    async def get_result(self, request_id: str) -> Dict[str, Any]:
        result = request_queue.get_request(request_id)
        return result

    async def coding(self, query: str) -> Dict[str, str]:
        self.memory["conversation"].append({"role": "user", "content": query})
        conf = self.memory.get("conf", {})
        current_files = self.memory["current_files"]["files"]
        request_id = str(uuid.uuid4())

        def process():
            def prepare_chat_yaml():
                auto_coder_main(["next", "chat_action"])

            prepare_chat_yaml()

            latest_yaml_file = get_last_yaml_file("actions")

            if latest_yaml_file:
                yaml_config = {
                    "include_file": ["./base/base.yml"],
                    "auto_merge": conf.get("auto_merge", "editblock"),
                    "human_as_model": conf.get("human_as_model", "false") == "true",
                    "skip_build_index": conf.get("skip_build_index", "true") == "true",
                    "skip_confirm": conf.get("skip_confirm", "true") == "true",
                    "silence": conf.get("silence", "false") == "true",
                    "urls": current_files,
                    "query": query,
                }

                for key, value in conf.items():
                    converted_value = self.convert_config_value(key, value)
                    if converted_value is not None:
                        yaml_config[key] = converted_value

                yaml_content = self.convert_yaml_config_to_str(yaml_config)
                execute_file = os.path.join("actions", latest_yaml_file)
                with open(execute_file, "w") as f:
                    f.write(yaml_content)

                try:                    
                    log_capture = LogCapture(request_id=request_id)
                    with log_capture.capture() as log_queue:
                        auto_coder_main(
                            ["--file", execute_file, "--request_id", request_id])
                except Exception as e:
                    _ = queue_communicate.send_event_no_wait(
                        request_id=request_id,
                        event=CommunicateEvent(
                            event_type=CommunicateEventType.CODE_ERROR.value, data=str(
                                e)
                        ),
                    )
                    raise e

                _ = queue_communicate.send_event_no_wait(
                    request_id=request_id,
                    event=CommunicateEvent(
                        event_type=CommunicateEventType.CODE_END.value, data=""
                    ),
                )

        _ = queue_communicate.send_event_no_wait(
            request_id=request_id,
            event=CommunicateEvent(
                event_type=CommunicateEventType.CODE_START.value, data=query
            ),
        )
        Thread(target=process).start()
        return {"request_id": request_id}

    @byzerllm.prompt()
    def code_review(self, query: str) -> str:
        """
        对代码进行review，参考如下检查点。        
        1. 有没有调用不符合方法，类的签名的调用
        2. 有没有未声明直接使用的变量，方法，类
        3. 有没有明显的语法错误
        4. 如果是python代码，检查有没有缩进方面的错误  
        5. 如果是python代码，检查是否 try 后面缺少 except 或者 finally
        {% if query %}
        6. 用户的额外的检查需求：{{ query }}
        {% endif %}

        如果用户的需求包含了@一个文件名 或者 @@符号， 那么重点关注这些文件或者符号（函数，类）进行上述的review。
        review 过程中严格遵循上述的检查点，不要遗漏，没有发现异常的点直接跳过，只对发现的异常点，给出具体的修改后的代码。    
        """

    def convert_yaml_config_to_str(self, yaml_config):
        yaml_content = yaml.safe_dump(
            yaml_config,
            allow_unicode=True,
            default_flow_style=False,
            default_style=None,
        )
        return yaml_content

    async def chat(self, query: str) -> Dict[str, str]:
        request_id = str(uuid.uuid4())

        def process_chat():
            nonlocal query
            nonlocal request_id
            conf = self.memory.get("conf", {})

            yaml_config = {
                "include_file": ["./base/base.yml"],
                "include_project_structure": conf.get("include_project_structure", "true") in ["true", "True"],
                "human_as_model": conf.get("human_as_model", "false") == "true",
                "skip_build_index": conf.get("skip_build_index", "true") == "true",
                "skip_confirm": conf.get("skip_confirm", "true") == "true",
                "silence": conf.get("silence", "true") == "true",
            }

            current_files = self.memory["current_files"]["files"] + self.get_llm_friendly_package_docs(
                return_paths=True
            )

            yaml_config["urls"] = current_files

            if "emb_model" in conf:
                yaml_config["emb_model"] = conf["emb_model"]

            is_new = query.strip().startswith("/new")
            if is_new:
                query = query.replace("/new", "", 1).strip()

            is_review = query.strip().startswith("/review")
            if is_review:
                query = query.replace("/review", "", 1).strip()
                if "prompt_review" in conf:
                    query = format_str_jinja2(
                        conf["prompt_review"], query=query)
                else:
                    query = self.code_review.prompt(query)

            is_no_context = query.strip().startswith("/no_context")
            if is_no_context:
                query = query.replace("/no_context", "", 1).strip()

            for key, value in conf.items():
                converted_value = self.convert_config_value(key, value)
                if converted_value is not None:
                    yaml_config[key] = converted_value

            query = Image.convert_image_paths_from(query)

            yaml_config["query"] = query

            yaml_content = self.convert_yaml_config_to_str(
                yaml_config=yaml_config)

            execute_file = os.path.join("actions", f"{uuid.uuid4()}.yml")

            with open(os.path.join(execute_file), "w") as f:
                f.write(yaml_content)

            def execute_ask():
                cmd = ["agent", "chat", "--file",
                       execute_file, "--request_id", request_id]
                if is_new:
                    cmd.append("--new_session")
                auto_coder_main(cmd)

            try:
                execute_ask()
            finally:
                os.remove(execute_file)

        Thread(target=process_chat).start()
        request_queue.add_request(
            request_id,
            RequestValue(value=StreamValue(
                value=[""]), status=RequestOption.RUNNING),
        )
        return {"request_id": request_id}

    async def ask(self, query: str) -> Dict[str, str]:
        conf = self.memory.get("conf", {})
        request_id = str(uuid.uuid4())

        def process():
            yaml_config = {"include_file": ["./base/base.yml"], "query": query}

            if "project_type" in conf:
                yaml_config["project_type"] = conf["project_type"]

            for model_type in ["model", "index_model", "vl_model", "code_model"]:
                if model_type in conf:
                    yaml_config[model_type] = conf[model_type]

            yaml_content = self.convert_yaml_config_to_str(yaml_config)
            execute_file = os.path.join("actions", f"{uuid.uuid4()}.yml")

            with open(execute_file, "w") as f:
                f.write(yaml_content)

            try:
                auto_coder_main(
                    [
                        "agent",
                        "project_reader",
                        "--file",
                        execute_file,
                        "--request_id",
                        request_id,
                    ]
                )
            finally:
                os.remove(execute_file)

        request_queue.add_request(
            request_id,
            RequestValue(value=DefaultValue(value=""),
                         status=RequestOption.RUNNING),
        )
        return {"request_id": request_id}

    def revert(self) -> Dict[str, str]:
        last_yaml_file = get_last_yaml_file("actions")
        if last_yaml_file:
            file_path = os.path.join("actions", last_yaml_file)
            with self.redirect_stdout() as output:
                auto_coder_main(["revert", "--file", file_path])
            result = output.getvalue()

            if "Successfully reverted changes" in result:
                os.remove(file_path)
                return {"message": "Reverted the last chat action successfully"}
            else:
                return {"message": result}
        else:
            return {"message": "No previous chat action found to revert."}

    async def index_build(self) -> Dict[str, str]:
        request_id = str(uuid.uuid4())
        yaml_file = os.path.join("actions", f"{uuid.uuid4()}.yml")
        yaml_content = """
include_file:
  - ./base/base.yml  
"""
        with open(yaml_file, "w") as f:
            f.write(yaml_content)

        log_capture = LogCapture(request_id=request_id)
        with log_capture.capture() as log_queue:
            try:
                auto_coder_main(
                    ["index", "--file", yaml_file, "--request_id", request_id]
                )
            finally:
                os.remove(yaml_file)

        return {"request_id": request_id}

    async def index_query(self, query: str) -> Dict[str, str]:
        request_id = str(uuid.uuid4())
        yaml_file = os.path.join("actions", f"{uuid.uuid4()}.yml")
        yaml_content = f"""
include_file:
- ./base/base.yml  
query: |
{query}
"""
        with open(yaml_file, "w") as f:
            f.write(yaml_content)

        try:
            auto_coder_main(
                ["index-query", "--file", yaml_file, "--request_id", request_id]
            )
        finally:
            os.remove(yaml_file)

        request_queue.add_request(
            request_id,
            RequestValue(value=DefaultValue(value=""),
                         status=RequestOption.RUNNING),
        )

        v: RequestValue = await asyncfy_with_semaphore(request_queue.get_request_block)(
            request_id, timeout=60
        )
        return {"message": v.value.value}

    def exclude_dirs(self, dirs: List[str]) -> Dict[str, str]:
        existing_dirs = self.memory.get("exclude_dirs", [])
        dirs_to_add = [d for d in dirs if d not in existing_dirs]
        if dirs_to_add:
            existing_dirs.extend(dirs_to_add)
            self.memory["exclude_dirs"] = existing_dirs
            self.save_memory()
            return {"message": f"Added exclude dirs: {dirs_to_add}"}
        else:
            return {"message": "All specified dirs are already in the exclude list."}

    def execute_shell(self, command: str) -> Dict[str, str]:
        try:
            result = subprocess.run(
                command, shell=True, capture_output=True, text=True)
            if result.returncode == 0:
                return {"output": result.stdout}
            else:
                return {"error": result.stderr}
        except Exception as e:
            raise Exception(str(e))

    def find_files_by_query(self, query: str) -> Dict[str, List[str]]:
        matched_files = self.find_files_in_project([query])
        return {"files": matched_files}

    def get_logs(self, request_id: str) -> Dict[str, List[str]]:
        v = LogCapture.get_log_capture(request_id)
        logs = v.get_captured_logs() if v else []
        return {"logs": logs}

    def get_llm_friendly_package_docs(self,
                                      package_name: Optional[str] = None, return_paths: bool = False
                                      ) -> List[str]:
        lib_dir = os.path.join(".auto-coder", "libs")
        llm_friendly_packages_dir = os.path.join(
            lib_dir, "llm_friendly_packages")
        docs = []

        if not os.path.exists(llm_friendly_packages_dir):
            print("llm_friendly_packages directory not found.")
            return docs

        libs = list(self.memory.get("libs", {}).keys())

        for domain in os.listdir(llm_friendly_packages_dir):
            domain_path = os.path.join(llm_friendly_packages_dir, domain)
            if os.path.isdir(domain_path):
                for username in os.listdir(domain_path):
                    username_path = os.path.join(domain_path, username)
                    if os.path.isdir(username_path):
                        for lib_name in os.listdir(username_path):
                            lib_path = os.path.join(username_path, lib_name)
                            if (
                                os.path.isdir(lib_path)
                                and (
                                    package_name is None
                                    or lib_name == package_name
                                    or package_name == os.path.join(username, lib_name)
                                )
                                and lib_name in libs
                            ):
                                for root, _, files in os.walk(lib_path):
                                    for file in files:
                                        if file.endswith(".md"):
                                            file_path = os.path.join(
                                                root, file)
                                            if return_paths:
                                                docs.append(file_path)
                                            else:
                                                with open(file_path, "r") as f:
                                                    docs.append(f.read())

        return docs
