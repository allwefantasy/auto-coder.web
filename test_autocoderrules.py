import os
import sys
sys.path.append('/Users/allwefantasy/projects/auto-coder.web')
from src.auto_coder_web.common_router.completions_router import find_files_in_project

# 测试 .autocoderrules 目录是否被正确包含
project_path = '/Users/allwefantasy/projects/auto-coder.web'

# 查找所有 .autocoderrules 目录
print("所有 .autocoderrules 目录:")
for root, dirs, files in os.walk(project_path):
    if '.autocoderrules' in dirs:
        print(os.path.join(root, '.autocoderrules'))

# 使用 find_files_in_project 函数查找文件
print("\n使用 find_files_in_project 查找 .autocoderrules 目录中的文件:")
# 1. 使用通配符模式
files1 = find_files_in_project(['*'], project_path)
autocoderrules_files1 = [f for f in files1 if '.autocoderrules' in f]
print("通配符模式找到的文件数量:", len(autocoderrules_files1))
for f in autocoderrules_files1:
    print(f)

# 2. 直接搜索已知文件名
print("\n直接搜索已知文件名:")
files2 = find_files_in_project(['如何国际化.md'], project_path)
for f in files2:
    print(f)

# 3. 搜索部分文件名
print("\n搜索部分文件名:")
files3 = find_files_in_project(['always'], project_path)
for f in files3:
    print(f)

# 检查 .autocoderrules 目录中是否有文件
print("\n检查 .autocoderrules 目录中的文件:")
for root, dirs, files in os.walk(project_path):
    if '.autocoderrules' in dirs:
        autocoderrules_path = os.path.join(root, '.autocoderrules')
        print(f"目录: {autocoderrules_path}")
        for file in os.listdir(autocoderrules_path):
            file_path = os.path.join(autocoderrules_path, file)
            if os.path.isfile(file_path):
                print(f"  文件: {file_path}")
