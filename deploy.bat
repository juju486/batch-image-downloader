@echo off
REM 批量图片下载器 - Windows 部署脚本

echo ==========================================
echo   批量图片下载器 - Windows 部署脚本
echo ==========================================

REM 配置变量
set SERVER_IP=your-server-ip
set SERVER_USER=root
set DEPLOY_PATH=/var/www/image-downloader
set LOCAL_PATH=%cd%

REM 检查参数
if "%1"=="/?" goto :help
if "%1"=="-h" goto :help
if "%1"=="--help" goto :help

if not "%1"=="" set SERVER_IP=%1
if not "%2"=="" set SERVER_USER=%2

echo [INFO] 部署配置:
echo   服务器IP: %SERVER_IP%
echo   用户名: %SERVER_USER%
echo   部署路径: %DEPLOY_PATH%
echo.

set /p confirm=确认部署? (y/N): 
if /i not "%confirm%"=="y" (
    echo [WARNING] 部署已取消
    goto :end
)

echo.
echo [INFO] 开始部署...

REM 检查 SSH 连接
echo [INFO] 检查服务器连接...
ssh %SERVER_USER%@%SERVER_IP% "echo 'SSH连接成功'" >nul 2>&1
if errorlevel 1 (
    echo [ERROR] 无法连接到服务器，请检查 SSH 配置
    goto :error
)

REM 创建远程目录
echo [INFO] 创建远程目录...
ssh %SERVER_USER%@%SERVER_IP% "mkdir -p %DEPLOY_PATH%"

REM 上传文件（使用 scp）
echo [INFO] 上传项目文件...
scp -r *.js *.html *.css *.json *.md %SERVER_USER%@%SERVER_IP%:%DEPLOY_PATH%/ >nul 2>&1
scp ecosystem.config.js Dockerfile docker-compose.yml nginx.conf %SERVER_USER%@%SERVER_IP%:%DEPLOY_PATH%/ >nul 2>&1

REM 服务器端部署
echo [INFO] 在服务器上部署应用...
ssh %SERVER_USER%@%SERVER_IP% "cd %DEPLOY_PATH% && npm install --production && mkdir -p logs downloaded_images && npm install -g pm2 && pm2 delete image-downloader || true && pm2 start ecosystem.config.js && pm2 save"

REM 健康检查
echo [INFO] 执行健康检查...
timeout /t 5 >nul
ssh %SERVER_USER%@%SERVER_IP% "curl -f http://localhost:8080/health" >nul 2>&1
if errorlevel 1 (
    echo [ERROR] 健康检查失败，请检查应用状态
    goto :error
)

echo.
echo ==========================================
echo [INFO] 部署完成！🎉
echo   访问地址: http://%SERVER_IP%:8080
echo ==========================================
goto :end

:help
echo 使用方法: deploy.bat [server-ip] [user]
echo 示例: deploy.bat 192.168.1.100 root
goto :end

:error
echo [ERROR] 部署失败！
exit /b 1

:end
pause
