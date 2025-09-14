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
        
        // 按行分割，然后按空格分割，最后过滤空值
        const urls = text.split(/[\n\r]+/)
            .flatMap(line => line.trim().split(/\s+/))
            .filter(url => url.trim() !== '')
            .filter(url => this.isValidUrl(url));
        
        return urls;
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
        const urls = this.getUrls();
        this.urlCount.textContent = urls.length;
    }

    updateButtonState() {
        const urls = this.getUrls();
        const hasUrls = urls.length > 0;
        
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
        const urls = this.getUrls();
        if (urls.length === 0) return;

        this.showProgress();
        this.clearResults();
        
        try {
            this.updateProgress(0, 1, '准备创建压缩包...');
            
            // 发送请求到后端
            const response = await fetch('/download-zip', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ urls })
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
        const urls = this.getUrls();
        if (urls.length === 0) return;

        this.showProgress();
        this.clearResults();
        this.showResults();
        
        let successCount = 0;
        let failCount = 0;

        for (let i = 0; i < urls.length; i++) {
            const url = urls[i];
            this.updateProgress(i, urls.length, `正在下载第 ${i + 1} 张图片...`);
            
            try {
                // 获取图片文件名
                const filename = this.getFilenameFromUrl(url);
                
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
                this.addResult(`✗ 下载失败: ${url} (${error.message})`, false);
            }
        }

        this.updateProgress(urls.length, urls.length, 
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
