const CryptoJS = require("crypto-js");
const fs = require("fs");
const https = require("https");

// 配置
const MASTER_KEY = process.env.MASTER_KEY;
const BARK_KEY = process.env.BARK_KEY;
const BARK_SERVER = "https://bark-server-2z8w.onrender.com";
const FILE_PATH = "./data/subscriptions.json.enc";

// 1. 检查环境变量
if (!MASTER_KEY || !BARK_KEY) {
    console.error("❌ 错误: 缺少 MASTER_KEY 或 BARK_KEY 环境变量");
    process.exit(1);
}

try {
    // 2. 读取文件
    if (!fs.existsSync(FILE_PATH)) {
        console.log("ℹ️ 未发现加密文件，跳过检查。");
        process.exit(0);
    }

    const rawFileContent = fs.readFileSync(FILE_PATH, "utf8").trim();
    console.log(`📂 文件读取成功，长度: ${rawFileContent.length} 字符`);

    // 3. 还原双层编码：Base64 -> 密文
    // 对应前端的 btoa(encrypted)
    let encryptedStr;
    try {
        encryptedStr = Buffer.from(rawFileContent, 'base64').toString('utf8');
    } catch (e) {
        throw new Error("Base64 解码失败，文件内容格式不正确");
    }

    // 4. AES 解密
    console.log("🔐 正在尝试解密...");
    const bytes = CryptoJS.AES.decrypt(encryptedStr, MASTER_KEY);
    
    // 尝试转为 UTF-8
    const decryptedText = bytes.toString(CryptoJS.enc.Utf8);
    
    // 如果解密出来的字符串为空，或者解析不成 JSON，说明 Key 错了
    if (!decryptedText) {
        throw new Error("解密结果为空！原因：MASTER_KEY 错误或密文被篡改。");
    }

    let subscriptions;
    try {
        subscriptions = JSON.parse(decryptedText);
    } catch (e) {
        throw new Error("解密成功但解析 JSON 失败！原因：解密出的内容不是有效的 JSON 格式。");
    }

    console.log(`✅ 成功读取 ${subscriptions.length} 个订阅项目`);
    checkAndNotify(subscriptions);

} catch (e) {
    console.error("❌ 执行出错:", e.message);
    // 在 Github Actions 日志中打印更多调试信息，但不泄露 Secret
    if (e.message.includes("Malformed")) {
        console.error("💡 工程师提示: 这 99% 是因为 GitHub Secrets 里的 MASTER_KEY 与你网页端保存时用的密码不一致导致。");
    }
    process.exit(1);
}

// 后续计算逻辑 (getNextBillDate, sendBarkNotification 等) 与之前一致...
function getNextBillDate(baseDateStr, period) {
    let billDate = new Date(baseDateStr);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    while (billDate < now) {
        if (period === 'month') billDate.setMonth(billDate.getMonth() + 1);
        else if (period === 'year') billDate.setFullYear(billDate.getFullYear() + 1);
        else break;
    }
    return billDate;
}

function checkAndNotify(subs) {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    subs.forEach(sub => {
        const nextDate = getNextBillDate(sub.date, sub.period);
        const diffDays = Math.round((nextDate - now) / (1000 * 60 * 60 * 24));
        console.log(`🔍 检查项: ${sub.name} | 下次扣费: ${nextDate.toISOString().split('T')[0]} | 剩余: ${diffDays}天`);
        if (diffDays === 1 || diffDays === 0) {
            sendBarkNotification(sub, diffDays === 1 ? "明天" : "今天");
        }
    });
}

function sendBarkNotification(sub, timeDesc) {
    const title = encodeURIComponent(`续费提醒: ${sub.name}`);
    const content = encodeURIComponent(`${sub.name} 将于 ${timeDesc} 扣费：${sub.currency} ${sub.price}`);
    const url = `${BARK_SERVER}/${BARK_KEY}/${title}/${content}?group=SubTrack&icon=https://logo.clearbit.com/${sub.name.toLowerCase().replace(/\s/g,'')}.com`;
    https.get(url).on('error', (e) => console.error(`推送失败: ${e.message}`));
}
