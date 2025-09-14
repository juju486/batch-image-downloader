# 🚀 Vercel 部署详细教程

## 📋 部署前准备

### 1. 注册账号
1. 访问 [vercel.com](https://vercel.com)
2. 使用 GitHub、GitLab 或 Bitbucket 账号注册
3. 推荐使用 GitHub 账号，可以直接导入仓库

### 2. 准备代码仓库

#### 方式一：上传到 GitHub（推荐）
1. 在 GitHub 创建新仓库：`batch-image-downloader`
2. 将代码推送到 GitHub：

```bash
# 如果还没有初始化 git
git init
git add .
git commit -m "初始提交：批量图片下载器"

# 添加远程仓库并推送
git remote add origin https://github.com/你的用户名/batch-image-downloader.git
git branch -M main
git push -u origin main
```

#### 方式二：直接使用 Vercel CLI
```bash
# 安装 Vercel CLI
npm install -g vercel

# 登录
vercel login

# 部署
vercel --prod
```

## 🔧 文件结构说明

为了适配 Vercel，项目使用以下结构：

```
批量图片下载/
├── api/
│   └── server.js          # Serverless 函数
├── public/
│   ├── index.html         # 前端页面
│   ├── styles.css         # 样式文件
│   └── script.js          # 前端 JS
├── vercel.json            # Vercel 配置
├── package.json           # 依赖配置
└── README.md
```

## 🌐 方式一：GitHub 自动部署

### 步骤 1：GitHub 导入
1. 登录 [vercel.com](https://vercel.com)
2. 点击 "New Project"
3. 选择 "Import Git Repository"
4. 选择你的 `batch-image-downloader` 仓库
5. 点击 "Import"

### 步骤 2：配置项目
1. **Project Name**: `batch-image-downloader` (可自定义)
2. **Framework Preset**: `Other` (保持默认)
3. **Root Directory**: `.` (保持默认)
4. **Build Command**: 留空或 `echo 'No build needed'`
5. **Output Directory**: `public`
6. **Install Command**: `npm install`

### 步骤 3：环境变量（可选）
如果需要设置环境变量：
- `NODE_ENV`: `production`

### 步骤 4：部署
1. 点击 "Deploy"
2. 等待部署完成（通常 1-3 分钟）
3. 获得部署地址：`https://your-project.vercel.app`

## 🖥️ 方式二：CLI 部署

### 步骤 1：安装 CLI
```bash
npm install -g vercel
```

### 步骤 2：登录
```bash
vercel login
```
选择你的认证方式（GitHub/GitLab/Bitbucket/Email）

### 步骤 3：部署
在项目目录运行：
```bash
# 第一次部署
vercel

# 生产环境部署
vercel --prod
```

### 步骤 4：配置确认
CLI 会询问：
- Set up and deploy "~/批量图片下载"? `Y`
- Which scope do you want to deploy to? 选择你的用户名
- Link to existing project? `N`
- What's your project's name? `batch-image-downloader`
- In which directory is your code located? `./`

## ✅ 部署成功验证

部署成功后，你会得到：
- 🌐 **生产地址**: `https://your-project.vercel.app`
- 📱 **预览地址**: `https://your-project-git-main.vercel.app`

### 测试功能：
1. 访问部署地址
2. 输入几个图片链接
3. 测试压缩包下载功能
4. 检查 `/api/health` 端点

## 🔧 常见问题解决

### 1. 超时错误
**问题**: Vercel 免费版有 10 秒执行时间限制
**解决**: 
- 限制同时下载图片数量（已设置为10张）
- 使用 Pro 版本获得 60 秒限制

### 2. 依赖安装失败
**问题**: `npm install` 失败
**解决**:
```bash
# 清除本地 node_modules
rm -rf node_modules package-lock.json
npm install
```

### 3. 文件路径错误
**问题**: 静态文件 404
**解决**: 确保文件在 `public/` 目录下

### 4. API 不工作
**问题**: `/api/download-zip` 返回 404
**解决**: 检查 `api/server.js` 文件是否存在

## 🚀 部署优化建议

### 1. 自定义域名
1. 在 Vercel 项目设置中添加域名
2. 配置 DNS 指向 Vercel

### 2. 环境变量
```bash
# 在 Vercel 控制台设置
NODE_ENV=production
MAX_IMAGES=10
TIMEOUT=25000
```

### 3. 性能监控
- 使用 Vercel Analytics
- 监控函数执行时间
- 检查错误日志

## 📊 Vercel 限制说明

### 免费版限制：
- ✅ 无限制部署
- ✅ 100GB 带宽/月
- ⚠️ 10 秒函数执行时间
- ⚠️ 最多同时处理 10 张图片

### Pro 版优势：
- 🚀 60 秒函数执行时间
- 🚀 更多并发处理
- 🚀 1TB 带宽/月

## 🎉 完成！

部署成功后，你的批量图片下载器就可以在全球 CDN 上运行了！

**访问地址**: `https://your-project.vercel.app`

---

需要帮助？查看 [Vercel 官方文档](https://vercel.com/docs) 或提交 Issue。
