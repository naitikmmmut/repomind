import urllib.request
import time
from datetime import datetime

# URL to ping (the Render backend)
URL = "https://repomind-backend-42rv.onrender.com/api/"

def ping():
    try:
        response = urllib.request.urlopen(URL)
        status = response.getcode()
        print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Pinged {URL} - Status Code: {status}")
    except Exception as e:
        print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Failed to ping {URL} - Error: {e}")

if __name__ == "__main__":
    print("Starting RepoMind Keep-Alive Pinger...")
    print("Press Ctrl+C to stop.")
    while True:
        ping()
        # Sleep for 10 minutes (600 seconds)
        # Render free tier spins down after 15 minutes of inactivity
        time.sleep(600)
