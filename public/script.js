class ImageDownloader {
    constructor() {
        this.imageUrls = document.getElementById('imageUrls');
        this.urlCount = document.getElementById('urlCount');
        this.downloadZipBtn = document.getElementById('downloadZip');
        this.downloadIndividualBtn = document.getElementById('downloadIndividual');
        this.progressSection = document.getElementById('progressSection');
        this.progressFill = document.getElementById('progressFill');
        this.progressText = document.getElementById('progressText');
        this.resultsSection = document.getElementById('resultsSection');
        this.downloadResults = document.getElementById('downloadResults');
        
        this.initEventListeners();
    }

    initEventListeners() {
        // 监听输入框变化
        this.imageUrls.addEventListener('input', () => {
            this.updateUrlCount();
            this.updateButtonState();
        });

        // 下载按钮事件
        this.downloadZipBtn.addEventListener('click', () => {
            this.downloadAsZip();
        });

        this.downloadIndividualBtn.addEventListener('click', () => {
            this.downloadIndividually();
        });

        // 初始化
        this.updateUrlCount();
        this.updateButtonState();
    }

    getUrls() {
        const text = this.imageUrls.value.trim();
        if (!text) return [];
        
        // 检查是否包含HTML img标签
        if (text.includes('<img') && text.includes('src=')) {
            return this.parseHtmlImages(text);
        }
        
        // 原有的URL解析逻辑
        const urls = text.split(/[\n\r]+/)
            .flatMap(line => line.trim().split(/\s+/))
            .filter(url => url.trim() !== '')
            .filter(url => this.isValidUrl(url));
        
        return urls;
    }

    parseHtmlImages(htmlText) {
        const images = [];
        
        // 更强大的正则表达式匹配img标签 - 支持各种属性顺序
        const imgRegex = /<img[^>]*>/gi;
        let match;
        
        while ((match = imgRegex.exec(htmlText)) !== null) {
            const imgTag = match[0];
            
            // 提取src属性
            const srcMatch = imgTag.match(/src\s*=\s*['"]([^'"]+)['"]/i);
            if (!srcMatch) continue;
            
            const src = srcMatch[1];
            
            // 提取alt属性
            const altMatch = imgTag.match(/alt\s*=\s*['"]([^'"]*)['"]/i);
            const alt = altMatch ? altMatch[1] : '';
            
            console.log('解析图片:', { src, alt }); // 调试信息
            
            if (this.isValidUrl(src)) {
                images.push({
                    url: src,
                    filename: alt ? this.sanitizeFilename(alt) : null
                });
            }
        }
        
        console.log('解析结果:', images); // 调试信息
        return images;
    }

    sanitizeFilename(filename) {
        // 清理文件名，移除非法字符
        let clean = filename.replace(/[<>:"/\\|?*]/g, '_');
        
        // 如果没有扩展名，不添加默认扩展名（让服务器根据实际内容检测）
        return clean.trim();
    }

    isValidUrl(string) {
        try {
            const url = new URL(string);
            return url.protocol === 'http:' || url.protocol === 'https:';
        } catch (_) {
            return false;
        }
    }

    updateUrlCount() {
        const urlsData = this.getUrls();
        this.urlCount.textContent = urlsData.length;
    }

    updateButtonState() {
        const urlsData = this.getUrls();
        const hasUrls = urlsData.length > 0;
        
        this.downloadZipBtn.disabled = !hasUrls;
        this.downloadIndividualBtn.disabled = !hasUrls;
    }

    showProgress() {
        this.progressSection.style.display = 'block';
        this.resultsSection.style.display = 'none';
        this.progressFill.style.width = '0%';
        this.progressText.textContent = '准备下载...';
    }

    hideProgress() {
        this.progressSection.style.display = 'none';
    }

    updateProgress(current, total, message = '') {
        const percentage = (current / total) * 100;
        this.progressFill.style.width = percentage + '%';
        this.progressText.textContent = message || `${current}/${total} (${Math.round(percentage)}%)`;
    }

    showResults() {
        this.resultsSection.style.display = 'block';
    }

    addResult(message, isSuccess = true) {
        const resultItem = document.createElement('div');
        resultItem.className = 'result-item';
        
        const icon = document.createElement('div');
        icon.className = `result-icon ${isSuccess ? 'result-success' : 'result-error'}`;
        icon.innerHTML = isSuccess ? '✓' : '✗';
        
        const text = document.createElement('div');
        text.className = 'result-text';
        text.textContent = message;
        
        resultItem.appendChild(icon);
        resultItem.appendChild(text);
        this.downloadResults.appendChild(resultItem);
        
        // 滚动到底部
        this.downloadResults.scrollTop = this.downloadResults.scrollHeight;
    }

    clearResults() {
        this.downloadResults.innerHTML = '';
    }

    async downloadAsZip() {
        const urlsData = this.getUrls();
        if (urlsData.length === 0) return;

        this.showProgress();
        this.clearResults();
        
        try {
            this.updateProgress(0, 1, '准备创建压缩包...');
            
            // 发送请求到后端 (Vercel API)
            const response = await fetch('/api/download-zip', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ images: urlsData })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            // 获取文件名
            const contentDisposition = response.headers.get('content-disposition');
            let filename = 'images.zip';
            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
                if (filenameMatch) {
                    filename = filenameMatch[1];
                }
            }

            // 创建下载链接
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            this.updateProgress(1, 1, '压缩包下载完成！');
            this.showResults();
            this.addResult(`成功下载压缩包: ${filename}`);
            
        } catch (error) {
            console.error('下载压缩包失败:', error);
            this.showResults();
            this.addResult(`下载压缩包失败: ${error.message}`, false);
        } finally {
            setTimeout(() => this.hideProgress(), 2000);
        }
    }

    async downloadIndividually() {
        const urlsData = this.getUrls();
        if (urlsData.length === 0) return;

        this.showProgress();
        this.clearResults();
        this.showResults();
        
        let successCount = 0;
        let failCount = 0;

        for (let i = 0; i < urlsData.length; i++) {
            const imageData = urlsData[i];
            const url = typeof imageData === 'string' ? imageData : imageData.url;
            const altFilename = typeof imageData === 'object' ? imageData.filename : null;
            
            this.updateProgress(i, urlsData.length, `正在下载第 ${i + 1} 张图片...`);
            
            try {
                // 获取图片文件名（优先使用alt属性）
                const filename = altFilename || this.getFilenameFromUrl(url);
                
                // 下载图片
                const response = await fetch(url);
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }
                
                const blob = await response.blob();
                const downloadUrl = window.URL.createObjectURL(blob);
                
                // 创建下载链接
                const a = document.createElement('a');
                a.href = downloadUrl;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(downloadUrl);
                document.body.removeChild(a);
                
                successCount++;
                this.addResult(`✓ 下载成功: ${filename}`);
                
                // 添加小延迟避免浏览器限制
                await this.sleep(100);
                
            } catch (error) {
                failCount++;
                const displayUrl = typeof imageData === 'string' ? imageData : imageData.url;
                this.addResult(`✗ 下载失败: ${displayUrl} (${error.message})`, false);
            }
        }

        this.updateProgress(urlsData.length, urlsData.length, 
            `下载完成！成功: ${successCount}, 失败: ${failCount}`);
        
        setTimeout(() => this.hideProgress(), 3000);
    }

    getFilenameFromUrl(url) {
        try {
            const urlObj = new URL(url);
            const pathname = urlObj.pathname;
            const filename = pathname.substring(pathname.lastIndexOf('/') + 1);
            
            // 如果没有文件名或没有扩展名，生成一个
            if (!filename || !filename.includes('.')) {
                const timestamp = Date.now();
                const extension = this.guessExtensionFromUrl(url) || 'jpg';
                return `image_${timestamp}.${extension}`;
            }
            
            return filename;
        } catch (error) {
            // 如果URL解析失败，生成一个随机文件名
            const timestamp = Date.now();
            const random = Math.random().toString(36).substring(2, 8);
            return `image_${timestamp}_${random}.jpg`;
        }
    }

    guessExtensionFromUrl(url) {
        const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'];
        const lowerUrl = url.toLowerCase();
        
        for (const ext of imageExtensions) {
            if (lowerUrl.includes(`.${ext}`)) {
                return ext;
            }
        }
        
        return 'jpg'; // 默认扩展名
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    new ImageDownloader();
});
