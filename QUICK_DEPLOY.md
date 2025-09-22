# 🚀 快速部署指南

## 选择适合你的部署方案

### 1. 🌟 Vercel（推荐新手）
**免费、零配置、全球CDN**

```bash
# 安装 Vercel CLI
npm install -g vercel

# 登录并部署
vercel login
vercel --prod
```

**优点**：免费、简单、自动HTTPS
**缺点**：有运行时间限制、不支持长时间任务

---

### 2. 🐳 Docker（推荐进阶）
**容器化部署，环境一致性**

```bash
# 单容器部署
docker build -t image-downloader .
docker run -d -p 8079:8079 image-downloader

# 使用 Docker Compose（推荐）
docker-compose up -d
```

**优点**：环境隔离、易于管理、可扩展
**缺点**：需要学习Docker基础

---

### 3. 🖥️ VPS/云服务器（推荐生产环境）
**完全控制，适合生产环境**

#### 快速部署（Linux/Mac）
```bash
# 编辑部署脚本中的服务器信息
nano deploy.sh

# 执行部署
chmod +x deploy.sh
./deploy.sh your-server-ip root
```

#### 快速部署（Windows）
```cmd
# 编辑 deploy.bat 中的服务器信息
# 执行部署
deploy.bat your-server-ip root
```

**优点**：完全控制、无限制、适合大型应用
**缺点**：需要服务器管理知识

---

### 4. ☁️ 其他云平台

#### Railway
1. 访问 [railway.app](https://railway.app)
2. GitHub 登录并导入仓库
3. 自动部署

#### Heroku
```bash
npm install -g heroku
heroku login
heroku create your-app-name
git push heroku main
```

---

## 🔧 部署前检查清单

- [ ] Node.js 版本 >= 16.x
- [ ] 所有依赖已安装 (`npm install`)
- [ ] 本地测试通过 (`npm start`)
- [ ] 防火墙端口已开放（8079）
- [ ] 域名DNS已配置（如需要）

## 🌐 访问你的应用

部署成功后，你可以通过以下方式访问：

- **本地开发**：http://localhost:8079
- **Vercel**：https://your-app.vercel.app
- **VPS/云服务器**：http://your-server-ip:8079
- **自定义域名**：http://your-domain.com

## 🛡️ 生产环境优化

### SSL证书（HTTPS）
```bash
# 使用 Certbot 申请免费SSL证书
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### 性能监控
```bash
# 查看 PM2 状态
pm2 status
pm2 logs image-downloader
pm2 monit
```

### 备份策略
```bash
# 定期备份关键文件
tar -czf backup-$(date +%Y%m%d).tar.gz /var/www/image-downloader
```

## 🆘 常见问题

### 端口被占用
```bash
# 检查端口占用
netstat -tulpn | grep 8079
# 或者修改 server.js 中的端口
```

### 内存不足
```bash
# 检查内存使用
free -h
# 设置 PM2 内存限制
pm2 start ecosystem.config.js --max-memory-restart 500M
```

### 权限问题
```bash
# 修改文件权限
sudo chown -R $USER:$USER /var/www/image-downloader
sudo chmod -R 755 /var/www/image-downloader
```

## 📞 技术支持

如果部署过程中遇到问题：

1. 检查日志文件：`pm2 logs` 或 `tail -f logs/error.log`
2. 确认防火墙设置
3. 验证 Node.js 和 npm 版本
4. 检查服务器资源使用情况

---

**🎉 恭喜！你的批量图片下载器已成功部署！**
