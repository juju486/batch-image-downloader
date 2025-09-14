# 批量图片下载器部署指南

## 方案一：VPS/云服务器部署

### 1. 服务器要求
- 操作系统：Ubuntu 20.04+ / CentOS 7+ / Windows Server
- 内存：至少 512MB（推荐 1GB+）
- 硬盘：至少 1GB 可用空间
- Node.js：16.x 或更高版本

### 2. 部署步骤

#### 步骤1：连接服务器
```bash
# Linux/Mac
ssh root@your-server-ip

# Windows (使用 PuTTY 或 Windows Terminal)
```

#### 步骤2：安装 Node.js
```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# CentOS/RHEL
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# 验证安装
node --version
npm --version
```

#### 步骤3：上传项目文件
```bash
# 方法1：使用 scp
scp -r ./批量图片下载 root@your-server-ip:/var/www/

# 方法2：使用 git
cd /var/www/
git clone <your-git-repo-url> image-downloader
```

#### 步骤4：安装依赖和启动
```bash
cd /var/www/批量图片下载
npm install
npm start
```

#### 步骤5：配置防火墙
```bash
# Ubuntu (ufw)
sudo ufw allow 8080
sudo ufw reload

# CentOS (firewalld)
sudo firewall-cmd --permanent --add-port=8080/tcp
sudo firewall-cmd --reload
```

### 3. 使用 PM2 进程管理（推荐）

#### 安装 PM2
```bash
npm install -g pm2
```

#### 创建 PM2 配置文件
参见 ecosystem.config.js

#### 启动应用
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 4. 配置 Nginx 反向代理（可选）

参见 nginx.conf

---

## 方案二：Docker 容器部署

### 使用方法
```bash
# 构建镜像
docker build -t image-downloader .

# 运行容器
docker run -d -p 8080:8080 --name image-downloader image-downloader
```

---

## 方案三：云平台部署

### Vercel（推荐免费方案）
1. 将代码推送到 GitHub
2. 登录 Vercel.com
3. 导入 GitHub 仓库
4. 自动部署

### Heroku
```bash
# 安装 Heroku CLI
npm install -g heroku

# 登录和部署
heroku login
heroku create your-app-name
git push heroku main
```

### Railway
1. 访问 railway.app
2. 连接 GitHub 仓库
3. 自动部署

---

## 访问应用

部署成功后，访问：
- 本地开发：http://localhost:8080
- 服务器部署：http://your-server-ip:8080
- 域名绑定：http://your-domain.com

## 注意事项

1. **安全设置**：
   - 配置 HTTPS（Let's Encrypt）
   - 设置合理的下载限制
   - 配置 CORS 策略

2. **性能优化**：
   - 使用 CDN 加速静态资源
   - 配置 gzip 压缩
   - 设置合理的并发限制

3. **监控维护**：
   - 使用 PM2 监控进程
   - 配置日志轮转
   - 设置内存和磁盘使用监控
