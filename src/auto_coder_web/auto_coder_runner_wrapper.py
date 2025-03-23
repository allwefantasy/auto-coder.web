from typing import Dict,Any
from autocoder.auto_coder_runner import (
    auto_command,
    load_memory,
    save_memory,
    configure,
    manage_models,
    print_conf,
    exclude_dirs,
    exclude_files,
    ask,
    coding,
    load_tokenizer,
    initialize_system,
    InitializeSystemRequest,
    add_files,
    remove_files,
    index_query,
    index_build,
    index_export,
    index_import,
    list_files,
    lib_command,
    mcp,
    revert,
    commit,
    design,
    voice_input,
    chat,
    gen_and_exec_shell_command,
    execute_shell_command,
    get_mcp_server,
    completer,
    summon,
    get_memory,
)

class AutoCoderRunnerWrapper:
    def __init__(self, project_path: str, product_mode: str = "lite"):
        load_memory()
        load_tokenizer()


    def auto_command_wrapper(self, command: str, params: Dict[str, Any]) -> Dict[str, str]:
        return auto_command(command,params)
    
    def configure_wrapper(self,conf: str, skip_print=False ):
        return configure(conf, skip_print)    

    def get_conf_wrapper(self):
        memory = get_memory()
        return memory["conf"]


    def coding_wapper(self,query):
        return coding(query) 

    def chat_wrapper(self,query):
        return chat(query)          
        
    
    