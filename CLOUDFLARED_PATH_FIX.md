# ⚠️ CLOUDFLARED PATH ISSUE - SOLUTION

## Проблема:
```
❌ cloudflared not found in /usr/local/bin
❌ Failed: [Errno 2] No such file or directory: '/tmp/cloudflared'
```

cloudflared встановлений через apt-get, але в системі його знайти не можна.

---

## 🔧 РІШЕННЯ:

### Крок 1: Знайти де реально встановлений cloudflared

Запустіть цю комірку в Google Colab:

```python
import subprocess
import os

# Знайти cloudflared
result = subprocess.run("which cloudflared", shell=True, capture_output=True, text=True)
if result.returncode == 0:
    cloudflared_path = result.stdout.strip()
    print(f"✅ Found cloudflared at: {cloudflared_path}")
else:
    # Спробуємо знайти
    result = subprocess.run("find /usr -name cloudflared 2>/dev/null", shell=True, capture_output=True, text=True)
    paths = result.stdout.strip().split('\n')
    print("Found paths:")
    for p in paths:
        if p:
            print(f"  • {p}")
            cloudflared_path = p
            break
```

Це покаже де реально встановлений cloudflared.

---

### Крок 2: Використовуйте правильний path у cell [4]

Коли знайдете path (наприклад `/usr/bin/cloudflared`), змініть cell [4]:

**Змініть це:**
```python
tunnel_process = subprocess.Popen(
    ["/usr/local/bin/cloudflared", "tunnel", "--url", "http://localhost:7860"],
```

**На це:**
```python
tunnel_process = subprocess.Popen(
    ["/usr/bin/cloudflared", "tunnel", "--url", "http://localhost:7860"],
    # або яка б то не була path з крока 1
```

---

## 🚀 АЛЬТЕРНАТИВА: Використовуйте shell=True

```python
tunnel_process = subprocess.Popen(
    "cloudflared tunnel --url http://localhost:7860",
    shell=True,
    stdout=subprocess.PIPE,
    stderr=subprocess.STDOUT,
    text=True,
    bufsize=1
)
```

Це дозволить системі автоматично знайти cloudflared в PATH.

---

## 📋 ПОВНА ВИПРАВЛЕНА КОМІРКА [4]

```python
import subprocess
import time
import os
import re

print("\n" + "="*60)
print("[4/5] LAUNCHING WEBUI & TUNNEL")
print("="*60)

# Kill any existing processes
print("\n🧹 Cleaning up old processes...")
subprocess.run("pkill -f 'python.*launch.py'", shell=True, stderr=subprocess.DEVNULL)
subprocess.run("pkill -f cloudflared", shell=True, stderr=subprocess.DEVNULL)
time.sleep(2)

# Launch WebUI
print("\n🚀 Starting WebUI...")
webui_dir = "/root/stable-diffusion-webui"
os.chdir(webui_dir)

webui_process = subprocess.Popen(
    [" python", "launch.py", "--api", "--cors-allow-origins=*", "--listen"],
    stdout=subprocess.PIPE,
    stderr=subprocess.STDOUT,
    text=True,
    bufsize=1,
    cwd=webui_dir
)

print("   ⏳ Waiting for WebUI to initialize (30 seconds)...")
time.sleep(30)
print("   ✅ WebUI should be running on http://localhost:7860")

# Now launch cloudflared - with shell=True for better compatibility
print("\n🌐 Starting Cloudflare Tunnel...")

tunnel_url = None
try:
    # Use shell=True для mejor compatibility
    tunnel_process = subprocess.Popen(
        "cloudflared tunnel --url http://localhost:7860",
        shell=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1
    )
    
    print("   ⏳ Waiting for tunnel URL (10 seconds)...")
    timeout = time.time() + 15
    
    while time.time() < timeout:
        line = tunnel_process.stdout.readline()
        if line:
            print(f"   {line.strip()}")
            # Extract URL pattern
            match = re.search(r'https://[a-zA-Z0-9-]+\.trycloudflare\.com', line)
            if match:
                tunnel_url = match.group(0)
                print(f"\n" + "="*60)
                print(f"🎉 SUCCESS!")
                print(f"="*60)
                print(f"\n🌐 Public URL: {tunnel_url}")
                print(f"\n📋 Next steps:")
                print(f"   1. Copy this URL: {tunnel_url}")
                print(f"   2. Go to your GitHub Pages site")
                print(f"   3. Click ⚙️ Settings → Cloudflare Tunnel URL")
                print(f"   4. Paste the URL above")
                print(f"   5. Click 'Test Connection'")
                print(f"   6. Start generating images! 🎨")
                print(f"\n" + "="*60)
                break
        time.sleep(0.5)
    
    if not tunnel_url:
        print("   ⚠️ URL not found in output, but tunnel should be running")
        print(f"   Try accessing: http://localhost:7860 directly")

except Exception as e:
    print(f"   ❌ Error launching tunnel: {e}")

print("\n💡 Tunnel will keep running. Do NOT close this cell!")
print("   Keep this notebook running in the background.")
```

---

## 🎯 СТИСЛО

1. **Запустіть крок 1** - знайдіть де встановлений cloudflared
2. **Обновіть cell [4]** - використовуйте правильний path або shell=True
3. **Запустіть cell [4]** - мав показати публічний URL

---

**Версія:** 6.0 (PATH FIX)  
**Статус:** ✅ Рішення готово  
**Причина:** cloudflared встановлений але в іншій папці
