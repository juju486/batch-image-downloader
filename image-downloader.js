// 下载图片函数
async function downloadImages(imageUrls, destinationFolder) {
    const fs = require('fs');
    const path = require('path');
    const axios = require('axios');
    const ProgressBar = require('progress');

    // 创建目标文件夹如果不存在
    if (!fs.existsSync(destinationFolder)) {
        fs.mkdirSync(destinationFolder, { recursive: true });
    }

    // 如果输入的是字符串，按空白字符分割成数组
    let urlArray = typeof imageUrls === 'string' ? imageUrls.trim().split(/\s+/) : imageUrls;

    // 过滤掉空行
    urlArray = urlArray.filter(url => url.trim() !== '');

    console.log(`开始下载 ${urlArray.length} 张图片...`);
    const bar = new ProgressBar(':bar :current/:total (:percent) :etas', {
        total: urlArray.length,
        width: 40
    });

    for (let i = 0; i < urlArray.length; i++) {
        try {
            const imageUrl = urlArray[i];
            const imageName = path.basename(imageUrl);
            const imagePath = path.join(destinationFolder, imageName);

            // 使用axios获取图片数据
            const response = await axios({
                url: imageUrl,
                method: 'GET',
                responseType: 'stream'
            });

            // 写入文件流
            const writer = fs.createWriteStream(imagePath);
            response.data.pipe(writer);

            // 等待写入完成
            await new Promise((resolve, reject) => {
                writer.on('finish', resolve);
                writer.on('error', reject);
            });

            bar.tick();
            console.log(`\n第${i + 1}张图片下载成功: ${imageName}`);
        } catch (error) {
            bar.tick();
            console.error(`第${i + 1}张图片下载失败: ${urlArray[i]}`);
            console.error(error.message);
        }
    }
}

// 从命令行参数读取图片链接
function getUrlsFromArgs() {
    const args = process.argv.slice(2);
    if (args.length === 0) {
        return null;
    }
    
    // 如果只有一个参数且看起来像是URL
    if (args.length === 1 && (args[0].startsWith('http://') || args[0].startsWith('https://'))) {
        return args[0];
    }
    
    // 如果多个参数或参数中包含多个URL
    return args.join(' ');
}

// 示例用法
const imageUrls = `
https://img.alicdn.com/imgextra/i1/2218802116005/O1CN013KTs011uELSKlgUgb_!!2218802116005.jpg 
https://img.alicdn.com/imgextra/i2/2218802116005/O1CN01aoj8Qa1uELSJdXZKn_!!2218802116005.jpg 
https://img.alicdn.com/imgextra/i2/2218802116005/O1CN01M2u4nb1uELSIkjseR_!!2218802116005.jpg 
https://img.alicdn.com/imgextra/i1/2218802116005/O1CN01ClL5cD1uELSDsnqpR_!!2218802116005.jpg 
https://img.alicdn.com/imgextra/i4/2218802116005/O1CN01rreDNw1uELSKOw7o7_!!2218802116005.jpg 
https://img.alicdn.com/imgextra/i2/2218802116005/O1CN01OgVXXz1uELSJPEeV9_!!2218802116005.jpg 
https://img.alicdn.com/imgextra/i2/2218802116005/O1CN01zvVwgq1uELSIki8TS_!!2218802116005.jpg 
https://img.alicdn.com/imgextra/i1/2218802116005/O1CN01BvjKp91uELSJMAXBE_!!2218802116005.jpg 
https://img.alicdn.com/imgextra/i3/2218802116005/O1CN01OXfz1c1uELSIErR68_!!2218802116005.jpg 
https://img.alicdn.com/imgextra/i3/2218802116005/O1CN01M9QwFe1uELSKzxzy3_!!2218802116005.jpg 
https://img.alicdn.com/imgextra/i4/2218802116005/O1CN01J2Av8D1uELSKOvFj3_!!2218802116005.jpg 
https://img.alicdn.com/imgextra/i4/2218802116005/O1CN01BBNgW71uELSKlhZMB_!!2218802116005.jpg 
https://img.alicdn.com/imgextra/i1/2218802116005/O1CN01p6nca01uELSJgNRzz_!!2218802116005.jpg 
https://img.alicdn.com/imgextra/i1/2218802116005/O1CN01yzxH4Q1uELSJM8rG5_!!2218802116005.jpg 
https://img.alicdn.com/imgextra/i1/2218802116005/O1CN01nEWtDp1uELSIErMxK_!!2218802116005.jpg
`;

const destinationFolder = './downloaded_images';

// 使用示例：node image-downloader.js "<url1>" "<url2>" ...
downloadImages(getUrlsFromArgs() || imageUrls, destinationFolder);