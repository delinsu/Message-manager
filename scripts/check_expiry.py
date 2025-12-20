import json, os, base64, requests
from hashlib import md5
from Crypto.Cipher import AES
from Crypto.Util.Padding import unpad
from datetime import datetime, timedelta, timezone

def derive_key_and_iv(password, salt, key_len, iv_len):
    d = d_i = b""
    while len(d) < key_len + iv_len:
        d_i = md5(d_i + password + salt).digest()
        d += d_i
    return d[:key_len], d[key_len:key_len + iv_len]

def decrypt_data(encrypted_str, password):
    data = base64.b64decode(encrypted_str)
    salt = data[8:16]
    key, iv = derive_key_and_iv(password.encode(), salt, 32, 16)
    cipher = AES.new(key, AES.MODE_CBC, iv)
    return json.loads(unpad(cipher.decrypt(data[16:]), AES.block_size).decode())

def run():
    master_key = os.getenv("MASTER_KEY")
    bark_url = os.getenv("BARK_URL")
    file_path = 'data/subscriptions.json.enc'
    
    if not os.path.exists(file_path): return

    with open(file_path, 'r') as f:
        content = f.read()
    
    subs = decrypt_data(content, master_key)
    # 获取北京时间
    today = datetime.now(timezone(timedelta(hours=8))).date()
    
    for item in subs:
        expiry_date = datetime.strptime(item['nextDate'], '%Y-%m-%d').date()
        days_left = (expiry_date - today).days
        
        # 定义提醒阈值：即将到期前3天、1天或当天
        if days_left in [3, 1, 0]:
            msg = f"{item['name']} 将在 {days_left} 天后扣费 ({item['price']}{item['currency']})"
            requests.get(f"{bark_url}/订阅提醒/{msg}?group=SubTrack")

if __name__ == "__main__":
    run()
