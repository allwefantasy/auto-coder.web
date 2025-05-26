# Windows 构建脚本

这个目录包含了用于在 Windows 环境下构建和发布项目的脚本，功能与根目录的 `Makefile` 相同。

## 文件说明

- `build.ps1` - PowerShell 主脚本，包含构建和发布逻辑
- `build.bat` - 批处理包装脚本，方便调用
- `README.md` - 本说明文件

## 使用方法

### 方法一：使用批处理脚本（推荐）

```cmd
# 构建项目
scripts\build.bat build

# 构建并发布项目
scripts\build.bat release
```

### 方法二：直接使用 PowerShell

```powershell
# 构建项目
powershell -ExecutionPolicy Bypass -File scripts\build.ps1 -Command build

# 构建并发布项目
powershell -ExecutionPolicy Bypass -File scripts\build.ps1 -Command release
```

## 功能说明

### build 命令
- 清理 `build` 和 `dist` 目录
- 清理前端构建目录 `frontend/dist`
- 安装前端依赖并构建
- 打包静态文件为 `web.static.tar.gz`
- 部署静态文件到 `src/auto_coder_web/web/`
- 安装 Python 包

### release 命令
- 执行与 `build` 相同的所有步骤
- 额外执行 `deploy.sh` 脚本（如果存在）

## 系统要求

- Windows 10/11 或 Windows Server
- PowerShell 5.1 或更高版本
- Node.js 和 npm
- Python 和 pip
- tar 命令（通常在 Git for Windows 中包含）

## 注意事项

1. 确保在项目根目录下运行这些脚本
2. 如果遇到 PowerShell 执行策略问题，可以临时设置：
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```
3. 脚本会自动处理错误并提供详细的日志输出 