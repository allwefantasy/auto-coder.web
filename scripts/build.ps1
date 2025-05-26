param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("build", "release")]
    [string]$Command
)

function Write-Info {
    param([string]$Message)
    Write-Host "INFO: $Message" -ForegroundColor Green
}

function Write-Error {
    param([string]$Message)
    Write-Host "ERROR: $Message" -ForegroundColor Red
}

function Invoke-Build {
    Write-Info "开始构建 web 资源..."
    
    # 清理并创建目录
    Write-Info "清理构建目录..."
    if (Test-Path "build") { Remove-Item -Recurse -Force "build" }
    New-Item -ItemType Directory -Force -Path "build" | Out-Null
    
    if (Test-Path "dist") { Remove-Item -Recurse -Force "dist" }
    New-Item -ItemType Directory -Force -Path "dist" | Out-Null
    
    if (Test-Path "frontend/dist") { Remove-Item -Recurse -Force "frontend/dist" }
    
    # 构建前端
    Write-Info "安装前端依赖并构建..."
    Set-Location "frontend"
    try {
        & npm install
        if ($LASTEXITCODE -ne 0) {
            throw "npm install 失败"
        }
        
        & npm run build
        if ($LASTEXITCODE -ne 0) {
            throw "npm run build 失败"
        }
    }
    finally {
        Set-Location ".."
    }
    
    # 打包静态文件
    Write-Info "打包静态文件..."
    & tar -czf web.static.tar.gz -C frontend/dist .
    if ($LASTEXITCODE -ne 0) {
        Write-Error "打包静态文件失败"
        exit 1
    }
    
    # 准备目标目录
    Write-Info "准备目标目录..."
    if (Test-Path "src/auto_coder_web/web") { 
        Remove-Item -Recurse -Force "src/auto_coder_web/web" 
    }
    New-Item -ItemType Directory -Force -Path "src/auto_coder_web/web" | Out-Null
    
    # 移动并解压文件
    Write-Info "部署静态文件..."
    Move-Item "web.static.tar.gz" "src/auto_coder_web/web/"
    
    Set-Location "src/auto_coder_web/web/"
    try {
        & tar -xzf web.static.tar.gz
        if ($LASTEXITCODE -ne 0) {
            throw "解压文件失败"
        }
        Remove-Item "web.static.tar.gz"
    }
    finally {
        Set-Location "../../.."
    }
    
    # 安装包
    Write-Info "安装 Python 包..."
    & pip install -e .
    if ($LASTEXITCODE -ne 0) {
        Write-Error "pip install 失败"
        exit 1
    }
    
    Write-Info "构建完成！"
}

function Invoke-Release {
    Write-Info "开始发布构建..."
    
    # 清理并创建目录
    Write-Info "清理构建目录..."
    if (Test-Path "build") { Remove-Item -Recurse -Force "build" }
    New-Item -ItemType Directory -Force -Path "build" | Out-Null
    
    if (Test-Path "dist") { Remove-Item -Recurse -Force "dist" }
    New-Item -ItemType Directory -Force -Path "dist" | Out-Null
    
    if (Test-Path "frontend/dist") { Remove-Item -Recurse -Force "frontend/dist" }
    
    # 构建前端
    Write-Info "安装前端依赖并构建..."
    Set-Location "frontend"
    try {
        & npm install
        if ($LASTEXITCODE -ne 0) {
            throw "npm install 失败"
        }
        
        & npm run build
        if ($LASTEXITCODE -ne 0) {
            throw "npm run build 失败"
        }
    }
    finally {
        Set-Location ".."
    }
    
    # 打包静态文件
    Write-Info "打包静态文件..."
    & tar -czf web.static.tar.gz -C frontend/dist .
    if ($LASTEXITCODE -ne 0) {
        Write-Error "打包静态文件失败"
        exit 1
    }
    
    # 准备目标目录
    Write-Info "准备目标目录..."
    if (Test-Path "src/auto_coder_web/web") { 
        Remove-Item -Recurse -Force "src/auto_coder_web/web" 
    }
    New-Item -ItemType Directory -Force -Path "src/auto_coder_web/web" | Out-Null
    
    # 移动并解压文件
    Write-Info "部署静态文件..."
    Move-Item "web.static.tar.gz" "src/auto_coder_web/web/"
    
    Set-Location "src/auto_coder_web/web/"
    try {
        & tar -xzf web.static.tar.gz
        if ($LASTEXITCODE -ne 0) {
            throw "解压文件失败"
        }
        Remove-Item "web.static.tar.gz"
    }
    finally {
        Set-Location "../../.."
    }
    
    # 执行部署脚本
    Write-Info "执行部署脚本..."
    if (Test-Path "./deploy.sh") {
        & ./deploy.sh
        if ($LASTEXITCODE -ne 0) {
            Write-Error "部署脚本执行失败"
            exit 1
        }
    } else {
        Write-Info "未找到 deploy.sh 脚本，跳过部署步骤"
    }
    
    # 安装包
    Write-Info "安装 Python 包..."
    & pip install -e .
    if ($LASTEXITCODE -ne 0) {
        Write-Error "pip install 失败"
        exit 1
    }
    
    Write-Info "发布完成！"
}

# 主逻辑
try {
    switch ($Command) {
        "build" {
            Invoke-Build
        }
        "release" {
            Invoke-Release
        }
    }
}
catch {
    Write-Error "执行失败: $_"
    exit 1
} 