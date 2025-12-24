# .github/workflows/check_script.py
import yaml
import requests
import os
from datetime import datetime, timedelta

BARK_SERVER_URL = os.environ.get("BARK_SERVER_URL")
DAYS_BEFORE_EXPIRY = 7

def send_notification(bark_key, title, body):
    if not bark_key or not BARK_SERVER_URL:
        print("Bark key or server URL is missing.")
        return
        
    url = f"{BARK_SERVER_URL}/{bark_key}/{title}/{body}"
    try:
        response = requests.get(url)
        response.raise_for_status()
        print(f"Successfully sent notification for {title}")
    except Exception as e:
        print(f"Failed to send notification: {e}")

def main():
    with open("../subscriptions.yaml", 'r') as f:
        subscriptions = yaml.safe_load(f)

    today = datetime.now().date()
    reminder_date = today + timedelta(days=DAYS_BEFORE_EXPIRY)

    for sub in subscriptions:
        next_date_str = sub['next_payment_date']
        next_date = datetime.strptime(next_date_str, '%Y-%m-%d').date()
        
        if today <= next_date <= reminder_date:
            days_left = (next_date - today).days
            title = "订阅即将到期"
            body = f"「{sub['name']}」将于 {days_left} 天后（{next_date_str}）到期。"
            send_notification(sub['bark_key'], title, body)

if __name__ == "__main__":
    main()