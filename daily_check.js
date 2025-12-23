const CryptoJS = require("crypto-js");
const fs = require("fs");
const https = require("https");

// 从环境变量获取配置
const MASTER_KEY = process.env.MASTER_KEY;
const BARK_KEY = process.env.BARK_KEY;
const BARK_SERVER = process.env.BARK_SERVER; // 已改为从 Secret 获取
const FILE_PATH = "./data/subscriptions.json.enc";

/**
 * 核心逻辑：计算下一个续费日期
 * 确保即使原始日期是一年前，也能计算出本月或明年的扣费日
 */
function getNextBillDate(baseDateStr, period) {
    let billDate = new Date(baseDateStr);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    
    while (billDate < now) {
        if (period === 'month') {
            billDate.setMonth(billDate.getMonth() + 1);
        } else if (period === 'year') {
            billDate.setFullYear(billDate.getFullYear() + 1);
        } else {
            break;
        }
    }
    return billDate;
}

/**
 * 推送 Bark 通知
 */
function sendBarkNotification(sub, timeDesc) {
    if (!BARK_SERVER || !BARK_KEY) return;

    const title = encodeURIComponent(`续费提醒: ${sub.name}`);
    const content = encodeURIComponent(`${sub.name} 将于 ${timeDesc} 扣费：${sub.currency} ${sub.price}`);
    const group = "SubTrack";
    // 动态图标：使用 clearbit 获取 Logo，失败时显示首字母
    const icon = `https://logo.clearbit.com/${sub.name.toLowerCase().replace(/\s/g,'')}.com?size=128`;
    
    // 适配私有服务器地址拼接
    const baseUrl = BARK_SERVER.endsWith('/') ? BARK_SERVER.slice(0, -1) : BARK_SERVER;
    const url = `${baseUrl}/${BARK_KEY}/${title}/${content}?group=${group}&icon=${icon}&sound=calypso`;

    https.get(url, (res) => {
        if (res.statusCode === 200) console.log(`🚀 ${sub.name} 通知成功`);
        else console.error(`⚠️ ${sub.name} 推送失败: ${res.statusCode}`);
    }).on('error', (e) => console.error(`❌ 网络错误: ${e.message}`));
}

// 主程序运行
try {
    if (!MASTER_KEY || !BARK_KEY || !BARK_SERVER) {
        throw new Error("环境变量配置不不全，请检查 MASTER_KEY, BARK_KEY, BARK_SERVER");
    }

    if (!fs.existsSync(FILE_PATH)) {
        console.log("ℹ️ 未发现加密数据文件，退出。");
        process.exit(0);
    }

    // 读取并解密
    const base64FromFile = fs.readFileSync(FILE_PATH, "utf8").trim();
    const encryptedStr = Buffer.from(base64FromFile, 'base64').toString('utf8');
    const bytes = CryptoJS.AES.decrypt(encryptedStr, MASTER_KEY);
    const decryptedText = bytes.toString(CryptoJS.enc.Utf8);
    
    if (!decryptedText) throw new Error("解密失败，请检查 MASTER_KEY");

    const subscriptions = JSON.parse(decryptedText);
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    subscriptions.forEach(sub => {
        const nextDate = getNextBillDate(sub.date, sub.period);
        const diffTime = nextDate - now;
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

        console.log(`🔍 [${sub.name}] 下次续费: ${nextDate.toISOString().split('T')[0]} (剩余 ${diffDays} 天)`);

        // 提醒策略：提前1天及当天
        if (diffDays === 1) sendBarkNotification(sub, "明天");
        else if (diffDays === 0) sendBarkNotification(sub, "今天");
    });

} catch (e) {
    console.error("❌ 执行错误:", e.message);
    process.exit(1);
}
