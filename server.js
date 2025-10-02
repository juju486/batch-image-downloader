const express = require('express');
const axios = require('axios');
const archiver = require('archiver');
const path = require('path');
const fs = require('fs');
const { promisify } = require('util');

const app = express();
const port = process.env.PORT || 8079;

// 中间件
app.use(express.json());
app.use(express.static('public')); // 提供静态文件服务

// 下载单个图片并返回buffer和检测到的文件类型
async function downloadImage(url) {
    try {
        const response = await axios({
            url: url,
            method: 'GET',
            responseType: 'arraybuffer',
            timeout: 30000, // 30秒超时
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        
        const buffer = Buffer.from(response.data);
        const detectedType = detectImageTypeFromBuffer(buffer);
        
        return {
            success: true,
            data: buffer,
            contentType: response.headers['content-type'],
            detectedType: detectedType
        };
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}



// 从URL猜测文件扩展名
function guessExtensionFromUrl(url) {
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'];
    const lowerUrl = url.toLowerCase();
    
    for (const ext of imageExtensions) {
        if (lowerUrl.includes(`.${ext}`)) {
            return ext;
        }
    }
    
    return 'jpg'; // 默认扩展名
}

// 添加文件类型检测功能
function detectImageTypeFromBuffer(buffer) {
    // 检测常见图片格式的文件头
    if (buffer.length < 12) return null;
    
    // JPEG
    if (buffer[0] === 0xFF && buffer[1] === 0xD8) {
        return { ext: 'jpg', mime: 'image/jpeg' };
    }
    
    // PNG
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
        return { ext: 'png', mime: 'image/png' };
    }
    
    // GIF
    if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
        return { ext: 'gif', mime: 'image/gif' };
    }
    
    // WebP
    if (buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) {
        return { ext: 'webp', mime: 'image/webp' };
    }
    
    // BMP
    if (buffer[0] === 0x42 && buffer[1] === 0x4D) {
        return { ext: 'bmp', mime: 'image/bmp' };
    }
    
    // SVG (检查文本开头)
    const svgStart = buffer.toString('utf8', 0, Math.min(100, buffer.length)).toLowerCase();
    if (svgStart.includes('<svg') || svgStart.includes('<?xml')) {
        return { ext: 'svg', mime: 'image/svg+xml' };
    }
    
    return null;
}

function fixFilename(originalUrl, detectedType, index) {
    try {
        const urlObj = new URL(originalUrl);
        const pathname = urlObj.pathname;
        let filename = pathname.substring(pathname.lastIndexOf('/') + 1);
        
        // 如果没有文件名，生成一个
        if (!filename) {
            filename = `image_${index + 1}`;
        }
        
        // 移除原有扩展名
        const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');
        
        // 使用检测到的正确扩展名
        if (detectedType) {
            filename = `${nameWithoutExt}.${detectedType.ext}`;
        } else {
            // 如果检测失败，保持原有扩展名或使用默认
            if (!filename.includes('.')) {
                filename = `${nameWithoutExt}.jpg`;
            }
        }
        
        // 确保文件名安全
        filename = filename.replace(/[<>:"/\\|?*]/g, '_');
        
        return filename;
    } catch (error) {
        // 如果URL解析失败，生成一个文件名
        const extension = detectedType ? detectedType.ext : 'jpg';
        return `image_${index + 1}.${extension}`;
    }
}

// 压缩包下载端点
app.post('/download-zip', downloadZipHandler);
app.post('/api/download-zip', downloadZipHandler);

async function downloadZipHandler(req, res) {
    const { images, urls } = req.body;
    
    // 兼容新旧格式
    let imageList = images || urls;
    
    if (!imageList || !Array.isArray(imageList) || imageList.length === 0) {
        return res.status(400).json({ error: '请提供有效的图片数据数组' });
    }

    console.log(`开始创建压缩包，包含 ${imageList.length} 张图片...`);

    // 设置响应头
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const zipFilename = `images_${timestamp}.zip`;
    
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(zipFilename)}`);

    // 创建压缩包
    const archive = archiver('zip', {
        zlib: { level: 9 } // 最高压缩级别
    });

    // 处理错误
    archive.on('error', (err) => {
        console.error('压缩包创建错误:', err);
        if (!res.headersSent) {
            res.status(500).json({ error: '创建压缩包时发生错误' });
        }
    });

    // 将压缩包流传输到响应
    archive.pipe(res);

    let successCount = 0;
    let failCount = 0;

    // 下载并添加图片到压缩包
    for (let i = 0; i < imageList.length; i++) {
        const imageData = imageList[i];
        
        // 兼容新旧格式：支持字符串URL或对象格式
        const url = typeof imageData === 'string' ? imageData : imageData.url;
        const altFilename = typeof imageData === 'object' ? imageData.filename : null;
        
        console.log(`正在下载第 ${i + 1} 张图片: ${url}`);
        
        try {
            const result = await downloadImage(url);
            
            if (result.success) {
                // 优先使用alt属性作为文件名，否则使用检测到的格式修复文件名
                let filename;
                if (altFilename) {
                    // 如果有alt文件名，使用它，但确保有正确的扩展名
                    const detectedExt = result.detectedType ? result.detectedType.ext : 'jpg';
                    if (!altFilename.includes('.')) {
                        filename = `${altFilename}.${detectedExt}`;
                    } else {
                        filename = altFilename;
                    }
                } else {
                    filename = fixFilename(url, result.detectedType, i);
                }
                
                archive.append(result.data, { name: filename });
                successCount++;
                
                // 显示类型检测信息
                if (result.detectedType) {
                    console.log(`✓ 成功添加: ${filename} (检测类型: ${result.detectedType.mime})`);
                } else {
                    console.log(`✓ 成功添加: ${filename} (未检测到类型，使用默认)`);
                }
            } else {
                failCount++;
                console.log(`✗ 下载失败: ${url} - ${result.error}`);
                
                // 添加错误信息文件到压缩包
                const errorMsg = `下载失败: ${url}\n错误: ${result.error}\n`;
                archive.append(errorMsg, { name: `error_${i + 1}.txt` });
            }
        } catch (error) {
            failCount++;
            console.log(`✗ 处理失败: ${url} - ${error.message}`);
            
            // 添加错误信息文件到压缩包
            const errorMsg = `处理失败: ${url}\n错误: ${error.message}\n`;
            archive.append(errorMsg, { name: `error_${i + 1}.txt` });
        }
    }

    // 添加下载报告
    const report = `下载报告
================
总计: ${imageList.length} 张图片
成功: ${successCount} 张
失败: ${failCount} 张
下载时间: ${new Date().toLocaleString('zh-CN')}

功能特性:
- ✅ 自动检测图片真实格式
- ✅ 修复文件扩展名不匹配问题
- ✅ 支持HTML img标签解析
- ✅ 使用alt属性作为文件名
- ✅ 支持 JPEG, PNG, GIF, WebP, BMP, SVG 格式

详细列表:
${imageList.map((imageData, index) => {
    const url = typeof imageData === 'string' ? imageData : imageData.url;
    const altName = typeof imageData === 'object' && imageData.filename ? ` (${imageData.filename})` : '';
    return `${index + 1}. ${url}${altName}`;
}).join('\n')}
`;
    
    archive.append(report, { name: 'download_report.txt' });

    // 完成压缩包
    archive.finalize();
    
    console.log(`压缩包创建完成! 成功: ${successCount}, 失败: ${failCount}`);
}

// 根路径提供HTML页面
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 健康检查端点
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        platform: 'local'
    });
});

// 启动服务器
app.listen(port, () => {
    console.log(`图片下载服务器运行在 http://localhost:${port}`);
    console.log('请在浏览器中打开上述地址使用批量图片下载器');
});

// 优雅关闭
process.on('SIGINT', () => {
    console.log('\n正在关闭服务器...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n正在关闭服务器...');
    process.exit(0);
});
