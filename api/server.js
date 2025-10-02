const axios = require('axios');
const archiver = require('archiver');

// 添加文件类型检测功能
function detectImageTypeFromBuffer(buffer) {
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
    
    // SVG
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
        
        if (!filename) {
            filename = `image_${index + 1}`;
        }
        
        const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');
        
        if (detectedType) {
            filename = `${nameWithoutExt}.${detectedType.ext}`;
        } else {
            if (!filename.includes('.')) {
                filename = `${nameWithoutExt}.jpg`;
            }
        }
        
        filename = filename.replace(/[<>:"/\\|?*]/g, '_');
        return filename;
    } catch (error) {
        const extension = detectedType ? detectedType.ext : 'jpg';
        return `image_${index + 1}.${extension}`;
    }
}

async function downloadImage(url) {
    try {
        const response = await axios({
            url: url,
            method: 'GET',
            responseType: 'arraybuffer',
            timeout: 25000, // Vercel 有时间限制，减少到25秒
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

module.exports = async (req, res) => {
    // 设置 CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    
    if (req.method === 'GET' && req.url === '/api/health') {
        res.status(200).json({ 
            status: 'ok', 
            timestamp: new Date().toISOString(),
            platform: 'vercel'
        });
        return;
    }
    
    if (req.method === 'POST' && req.url === '/api/download-zip') {
        try {
            const { images, urls } = req.body;
            
            // 兼容新旧格式
            let imageList = images || urls;
            
            if (!imageList || !Array.isArray(imageList) || imageList.length === 0) {
                res.status(400).json({ error: '请提供有效的图片数据数组' });
                return;
            }

            // Vercel 限制：最多处理10张图片
            const limitedImages = imageList.slice(0, 10);
            if (imageList.length > 10) {
                console.log(`限制处理图片数量：${imageList.length} -> 10`);
            }

            console.log(`开始创建压缩包，包含 ${limitedImages.length} 张图片...`);

            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            const zipFilename = `images_${timestamp}.zip`;
            
            res.setHeader('Content-Type', 'application/octet-stream');
            res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(zipFilename)}`);

            const archive = archiver('zip', { zlib: { level: 6 } }); // 中等压缩，提高速度
            
            archive.on('error', (err) => {
                console.error('压缩包创建错误:', err);
                if (!res.headersSent) {
                    res.status(500).json({ error: '创建压缩包时发生错误' });
                }
            });

            archive.pipe(res);

            let successCount = 0;
            let failCount = 0;

            // 并发下载图片（最多3个并发）
            const concurrency = 3;
            for (let i = 0; i < limitedImages.length; i += concurrency) {
                const batch = limitedImages.slice(i, i + concurrency);
                const promises = batch.map(async (imageData, batchIndex) => {
                    const globalIndex = i + batchIndex;
                    
                    // 兼容新旧格式：支持字符串URL或对象格式
                    const url = typeof imageData === 'string' ? imageData : imageData.url;
                    const altFilename = typeof imageData === 'object' ? imageData.filename : null;
                    
                    console.log(`正在下载第 ${globalIndex + 1} 张图片: ${url}`);
                    
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
                                filename = fixFilename(url, result.detectedType, globalIndex);
                            }
                            
                            archive.append(result.data, { name: filename });
                            successCount++;
                            
                            if (result.detectedType) {
                                console.log(`✓ 成功添加: ${filename} (${result.detectedType.mime})`);
                            } else {
                                console.log(`✓ 成功添加: ${filename}`);
                            }
                        } else {
                            failCount++;
                            console.log(`✗ 下载失败: ${url} - ${result.error}`);
                            
                            const errorMsg = `下载失败: ${url}\n错误: ${result.error}\n`;
                            archive.append(errorMsg, { name: `error_${globalIndex + 1}.txt` });
                        }
                    } catch (error) {
                        failCount++;
                        console.log(`✗ 处理失败: ${url} - ${error.message}`);
                        
                        const errorMsg = `处理失败: ${url}\n错误: ${error.message}\n`;
                        archive.append(errorMsg, { name: `error_${globalIndex + 1}.txt` });
                    }
                });
                
                await Promise.all(promises);
            }

            // 添加下载报告
            const report = `下载报告 (Vercel版本)
================
总计: ${limitedImages.length} 张图片 ${imageList.length > 10 ? `(限制从${imageList.length}张)` : ''}
成功: ${successCount} 张
失败: ${failCount} 张
下载时间: ${new Date().toLocaleString('zh-CN')}
平台: Vercel Serverless

功能特性:
- ✅ 自动检测图片真实格式
- ✅ 修复文件扩展名不匹配问题
- ✅ 支持HTML img标签解析
- ✅ 使用alt属性作为文件名
- ✅ 支持 JPEG, PNG, GIF, WebP, BMP, SVG 格式
- ⚠️  Vercel限制：最多同时处理10张图片

详细列表:
${limitedImages.map((imageData, index) => {
    const url = typeof imageData === 'string' ? imageData : imageData.url;
    const altName = typeof imageData === 'object' && imageData.filename ? ` (${imageData.filename})` : '';
    return `${index + 1}. ${url}${altName}`;
}).join('\n')}
`;
            
            archive.append(report, { name: 'download_report.txt' });
            archive.finalize();
            
            console.log(`压缩包创建完成! 成功: ${successCount}, 失败: ${failCount}`);
            
        } catch (error) {
            console.error('服务器错误:', error);
            if (!res.headersSent) {
                res.status(500).json({ 
                    error: '服务器内部错误',
                    message: error.message 
                });
            }
        }
        return;
    }
    
    // 404
    res.status(404).json({ error: 'Not Found' });
};
