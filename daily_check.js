const CryptoJS = require("crypto-js");
const fs = require("fs");
const https = require("https");

// 配置
const MASTER_KEY = process.env.MASTER_KEY;
const BARK_KEY = process.env.BARK_KEY;
// const BARK_SERVER = "https://bark-server-2z8w.onrender.com/bark";
const BARK_SERVER = process.env.BARK_SERVER;
const FILE_PATH = "./data/subscriptions.json.enc";

if (!MASTER_KEY || !BARK_KEY) {
    console.error("❌ 错误: 环境变量 MASTER_KEY 或 BARK_KEY 未配置");
if (!MASTER_KEY) {
    console.error("❌ 错误: 环境变量 MASTER_KEY 未配置");
    process.exit(1);
}
if (!MASTER_KEY) {
    console.error("❌ 错误: 环境变量 BARK_KEY 未配置");
    process.exit(1);
}
if (!BARK_SERVER) {
    console.error("❌ 错误: 环境变量 BARK_SERVER 未配置");
    process.exit(1);
}

try {
    if (!fs.existsSync(FILE_PATH)) {
        console.log("ℹ️ 未发现加密文件，跳过检查。");
        process.exit(0);
    }

    // --- 核心修正点：直接读取文件，不添加额外的 Base64 解码 ---
    const encryptedData = fs.readFileSync(FILE_PATH, "utf8").trim();

    // 逻辑验证：CryptoJS 默认生成的加密串以 "U2FsdGVkX1" (Salted__) 开头
    console.log("🔐 正在解密文件...");

    // 直接解密
    const bytes = CryptoJS.AES.decrypt(encryptedData, MASTER_KEY);
    const decryptedText = bytes.toString(CryptoJS.enc.Utf8);

    if (!decryptedText) {
        // 如果依然失败，打印前10位用于比对逻辑（不泄露隐私）
        console.log(`⚠️ 解密失败。文件内容特征: ${encryptedData.substring(0, 10)}...`);
        throw new Error("解密结果为空。由于 Key 和 Secret 确定一致，这通常是因为文件内容与加密算法不匹配。");
    }

    const subscriptions = JSON.parse(decryptedText);
    console.log(`✅ 成功读取 ${subscriptions.length} 个项目`);

    checkAndNotify(subscriptions);

} catch (e) {
    console.error("❌ 执行出错:", e.message);
    process.exit(1);
}

// 时间处理与通知函数（保持健壮性）
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
        console.log(`🔍 检查项: ${sub.name} | 下次日期: ${nextDate.toISOString().split('T')[0]} | ${diffDays}天后`);
        if (diffDays === 1 || diffDays === 0) {
            sendBarkNotification(sub, diffDays === 1 ? "明天" : "今天");
        }
    });
}

function sendBarkNotification(sub, timeDesc) {
    const title = encodeURIComponent(`续费提醒: ${sub.name}`);
    const content = encodeURIComponent(`${sub.name} 将于 ${timeDesc} 扣费：${sub.currency} ${sub.price}`);
    // const url = `${BARK_SERVER}/${BARK_KEY}/${title}/${content}?group=SubTrack&icon=https://logo.clearbit.com/${sub.name.toLowerCase().replace(/\s/g,'')}.com`;
    const url = `${BARK_SERVER}/${BARK_KEY}/${title}/${content}`;
    https.get(url).on('error', (e) => console.error(`推送失败: ${e.message}`));
}