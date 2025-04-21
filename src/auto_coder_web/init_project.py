import os
from autocoder.common import git_utils
def init_project(project_path: str):
    os.makedirs(os.path.join(project_path, "actions"), exist_ok=True)
    os.makedirs(os.path.join(project_path,
                ".auto-coder"), exist_ok=True)

    from autocoder.common.command_templates import create_actions

    source_dir = os.path.abspath(project_path)
    create_actions(
        source_dir=source_dir,
        params={"project_type": "python",
                "source_dir": source_dir},
    )
    git_utils.init(os.path.abspath(project_path))

    with open(os.path.join(source_dir, ".gitignore"), "a") as f:
        f.write("\n.auto-coder/")
        f.write("\n/actions/")
        f.write("\n/output.txt")


    # 生成 .autocoderignore 文件，采用 .gitignore 格式
    autocoderignore_path = os.path.join(source_dir, ".autocoderignore")
    autocoderignore_content = "target\n"            
    with open(autocoderignore_path, "w", encoding="utf-8") as f:
        f.write(autocoderignore_content)    

    print(
        f"""Successfully initialized auto-coder project in {os.path.abspath(project_path)}."""
    )
    return