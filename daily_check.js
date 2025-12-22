const CryptoJS = require("crypto-js");
const fs = require("fs");
const https = require("https");

// 1. 获取环境变量（匹配你已有的 Secret 名）
const MASTER_KEY = process.env.MASTER_KEY;
const BARK_KEY = process.env.BARK_KEY;
const BARK_SERVER = "https://bark-server-2z8w.onrender.com"; // 你的私有服务器
const FILE_PATH = "./data/subscriptions.json.enc";

if (!MASTER_KEY || !BARK_KEY) {
    console.error("错误: 缺少环境变量 MASTER_KEY 或 BARK_KEY");
    process.exit(1);
}

// 2. 解密文件
try {
    if (!fs.existsSync(FILE_PATH)) {
        console.log("未发现加密文件，跳过检查。");
        process.exit(0);
    }

    const base64FromFile = fs.readFileSync(FILE_PATH, "utf8");
    // 对应前端的 btoa(encrypted) 操作，这里需要先 base64 解码得到密文
    const encryptedStr = Buffer.from(base64FromFile, 'base64').toString('utf8');
    
    const bytes = CryptoJS.AES.decrypt(encryptedStr, MASTER_KEY);
    const decryptedText = bytes.toString(CryptoJS.enc.Utf8);
    
    if (!decryptedText) throw new Error("解密失败，请检查 MASTER_KEY");
    
    const subscriptions = JSON.parse(decryptedText);
    checkAndNotify(subscriptions);
} catch (e) {
    console.error("执行出错:", e.message);
    process.exit(1);
}

function checkAndNotify(subs) {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    subs.forEach(sub => {
        const billDate = new Date(sub.date);
        billDate.setHours(0, 0, 0, 0);

        const diffTime = billDate - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        console.log(`项目: ${sub.name}, 剩余天数: ${diffDays}`);

        // 策略：当天扣费或提前 1 天提醒
        if (diffDays === 1 || diffDays === 0) {
            const timeDesc = diffDays === 1 ? "明天" : "今天";
            sendBarkNotification(sub, timeDesc);
        }
    });
}

function sendBarkNotification(sub, timeDesc) {
    const title = encodeURIComponent(`订阅续费提醒(${timeDesc})`);
    const content = encodeURIComponent(`${sub.name} 将于 ${timeDesc} 扣费：${sub.currency} ${sub.price}`);
    
    // 使用你的自定义服务器地址
    const url = `${BARK_SERVER}/${BARK_KEY}/${title}/${content}?group=SubTrack&icon=https://logo.clearbit.com/${sub.name.toLowerCase().replace(/\s/g,'')}.com`;

    https.get(url, (res) => {
        console.log(`通知已推送到私有服务器: ${sub.name}`);
    }).on('error', (e) => {
        console.error(`推送失败: ${e.message}`);
    });
}
