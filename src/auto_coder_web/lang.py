import locale
from byzerllm.utils import format_str_jinja2

MESSAGES = {
    "project_not_initialized": {
        "en":"Warning: Project not initialized.",
        "zh":"警告：项目未初始化。"
    },
    "run_auto_coder_chat": {
        "en":"Please run 'auto-coder.chat' to initialize the project first.",
        "zh":"请先运行 'auto-coder.chat' 来初始化项目。"
    },
    "human_as_model_warning": {
        "en":"Warning: Project is configured to use human as model, auto-coder.web will not work, we will set human_as_model to false",
        "zh":"警告：项目配置为使用人类作为模型，auto-coder.web 将无法工作，我们将设置 human_as_model 为 false"
    }    
}


def get_system_language():
    try:
        return locale.getdefaultlocale()[0][:2]
    except:
        return 'en'


def get_message(key):
    lang = get_system_language()
    if key in MESSAGES:
        return MESSAGES[key].get(lang, MESSAGES[key].get("en", ""))
    return ""


def get_message_with_format(msg_key: str, **kwargs):
    return format_str_jinja2(get_message(msg_key), **kwargs)
