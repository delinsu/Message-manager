const CryptoJS = require("crypto-js");
const fs = require("fs");
const https = require("https");

// 1. 配置与环境
const MASTER_KEY = process.env.MASTER_KEY;
const BARK_KEY = process.env.BARK_KEY;
const BARK_SERVER = "https://bark-server-2z8w.onrender.com"; // 你的私有服务器
const FILE_PATH = "./data/subscriptions.json.enc";

if (!MASTER_KEY || !BARK_KEY) {
    console.error("❌ 错误: 缺少环境变量 MASTER_KEY 或 BARK_KEY");
    process.exit(1);
}

// 2. 执行解密
try {
    if (!fs.existsSync(FILE_PATH)) {
        console.log("ℹ️ 未发现加密文件，跳过检查。");
        process.exit(0);
    }

    const base64FromFile = fs.readFileSync(FILE_PATH, "utf8").trim();
    // 还原前端 btoa 操作：Base64 -> CipherText
    const encryptedStr = Buffer.from(base64FromFile, 'base64').toString('utf8');
    
    // AES 解密
    const bytes = CryptoJS.AES.decrypt(encryptedStr, MASTER_KEY);
    const decryptedText = bytes.toString(CryptoJS.enc.Utf8);
    
    if (!decryptedText) throw new Error("解密结果为空，请检查 MASTER_KEY 是否匹配");
    
    const subscriptions = JSON.parse(decryptedText);
    console.log(`✅ 成功解密 ${subscriptions.length} 个订阅项目`);
    
    checkAndNotify(subscriptions);
} catch (e) {
    console.error("❌ 执行出错:", e.message);
    process.exit(1);
}

// 3. 计算下一次续费日期的逻辑
function getNextBillDate(baseDateStr, period) {
    let billDate = new Date(baseDateStr);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    
    // 如果扣费日期已经过去了，根据周期移动到未来的第一个日期
    while (billDate < now) {
        if (period === 'month') {
            billDate.setMonth(billDate.getMonth() + 1);
        } else if (period === 'year') {
            billDate.setFullYear(billDate.getFullYear() + 1);
        } else {
            break; // 防止死循环
        }
    }
    return billDate;
}

// 4. 检查并通知
function checkAndNotify(subs) {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    subs.forEach(sub => {
        // 计算真实的下一次扣费日期
        const nextDate = getNextBillDate(sub.date, sub.period);
        
        const diffTime = nextDate - now;
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

        console.log(`🔍 检查项: ${sub.name} | 下次日期: ${nextDate.toISOString().split('T')[0]} | 剩余: ${diffDays}天`);

        // 提醒策略：提前一天
        if (diffDays === 1) {
            sendBarkNotification(sub, "明天");
        } else if (diffDays === 0) {
            sendBarkNotification(sub, "今天");
        }
    });
}

// 5. Bark 发送函数
function sendBarkNotification(sub, timeDesc) {
    const title = encodeURIComponent(`续费提醒: ${sub.name}`);
    const content = encodeURIComponent(`${sub.name} 将于 ${timeDesc} 扣费：${sub.currency} ${sub.price}`);
    const group = "SubTrack";
    const icon = `https://logo.clearbit.com/${sub.name.toLowerCase().replace(/\s/g,'')}.com`;
    
    // 构造请求 URL (适配你的私有服务器)
    const url = `${BARK_SERVER}/${BARK_KEY}/${title}/${content}?group=${group}&icon=${icon}`;

    https.get(url, (res) => {
        if (res.statusCode === 200) {
            console.log(`🚀 通知成功: ${sub.name}`);
        } else {
            console.error(`⚠️ 推送失败，Bark 服务器返回码: ${res.statusCode}`);
        }
    }).on('error', (e) => {
        console.error(`❌ 网络请求失败: ${e.message}`);
    });
}
