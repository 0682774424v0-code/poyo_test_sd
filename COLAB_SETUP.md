# Stable Diffusion WebUI + Cloudflared Setup for Google Colab

This notebook sets up Stable Diffusion WebUI with API and Cloudflared tunnel for use with the Discord-styled GUI.

## Prerequisites
- Google Colab account (free or paid)
- At least 12GB VRAM (T4 GPU or better)
- ~20GB storage space

## Installation & Setup

### Cell 1: Clone and Install WebUI
```python
!git clone https://github.com/AUTOMATIC1111/stable-diffusion-webui
%cd stable-diffusion-webui
!pip install -r requirements.txt
```

### Cell 2: Download Cloudflared
```python
!wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64
!chmod +x cloudflared-linux-amd64
```

### Cell 3: Download Base Model (Stable Diffusion 1.5)
```python
%cd /content/stable-diffusion-webui/models/Stable-diffusion/
!wget https://huggingface.co/runwayml/stable-diffusion-v1-5/resolve/main/v1-5-pruned-emaonly.safetensors
```

### Cell 4: Start WebUI with API & Tunnel
```python
import subprocess
import threading
import time
import os

os.chdir('/content/stable-diffusion-webui')

def run_webui():
    """Start Stable Diffusion WebUI with API enabled"""
    print("Starting Stable Diffusion WebUI...")
    try:
        subprocess.run([
            "python", "launch.py",
            "--api",
            "--cors-allow-origins=*",
            "--xformers",
            "--no-half-vae",
            "--device-id", "0"
        ])
    except Exception as e:
        print(f"WebUI Error: {e}")

def run_tunnel():
    """Start Cloudflared tunnel"""
    print("Waiting for WebUI to start...")
    time.sleep(15)  # Wait for WebUI to start
    
    print("\n" + "="*60)
    print("Starting Cloudflared tunnel...")
    print("="*60)
    
    try:
        subprocess.run([
            "./cloudflared-linux-amd64", 
            "tunnel", 
            "--url", 
            "http://localhost:7860"
        ])
    except Exception as e:
        print(f"Tunnel Error: {e}")

# Start both services in background threads
webui_thread = threading.Thread(target=run_webui, daemon=True)
tunnel_thread = threading.Thread(target=run_tunnel, daemon=True)

webui_thread.start()
tunnel_thread.start()

print("Services starting... Check logs below:")
print("Wait for 'https://' URL to appear in the tunnel output")
print("\nYou can see this in the GUI: Settings → API Configuration → Tunnel URL")
print("\n" + "="*60)

# Keep cell alive
try:
    while True:
        time.sleep(10)
except KeyboardInterrupt:
    print("\nShutting down...")
```

## What This Does

1. **WebUI Setup**: Clones the official Stable Diffusion WebUI
2. **Dependencies**: Installs all required Python packages
3. **Cloudflared**: Downloads the tunnel client
4. **Model Download**: Gets Stable Diffusion v1.5 (can take 5-10 minutes)
5. **Services Start**: Runs WebUI with API on localhost:7860
6. **Tunnel**: Creates secure HTTPS tunnel via Cloudflare

## What You'll See

After running Cell 4, you should see:
```
Starting Stable Diffusion WebUI...
[Starting services...]
Starting Cloudflared tunnel...
======================================================
2024-XX-XX XX:XX:XX INF |Metrics| Scraper has been enabled
2024-XX-XX XX:XX:XX INF ... https://xxxx.trycloudflare.com
2024-XX-XX XX:XX:XX INF ...
```

**Copy the `https://xxxx.trycloudflare.com` URL** - this is what you paste in the GUI settings!

## Optional: Download Additional Models

Run these in additional cells to get more models:

### Chillout Mix (Realistic)
```python
%cd /content/stable-diffusion-webui/models/Stable-diffusion/
!wget https://civitai.com/api/download/models/11745
```

### Anything v3 (Anime)
```python
%cd /content/stable-diffusion-webui/models/Stable-diffusion/
!wget https://huggingface.co/Linaqruf/anything-v3.0/resolve/main/Anything-V3.0-pruned.ckpt
```

### Add LoRAs (Optional)
```python
%cd /content/stable-diffusion-webui/models/Lora/
!wget https://civitai.com/api/download/models/LORA_ID_HERE
```

## Troubleshooting

### WebUI won't start
- Check that T4 GPU is selected: Runtime → Change runtime type → GPU
- Increase timeout in `time.sleep(15)` to `time.sleep(30)`

### Tunnel URL doesn't appear
- Wait longer (up to 2 minutes for first run)
- Check cell output for error messages
- Restart the cell

### Out of VRAM errors
Add these flags to `launch.py`:
```python
"--medvram",  # Use less VRAM
"--opt-split-attention",  # Split attention computations
```

### Models aren't loading
- Check `/content/stable-diffusion-webui/models/Stable-diffusion/` folder
- Ensure filenames end with `.safetensors` or `.ckpt`
- Restart WebUI after adding new models

## Keeping it Running

The tunnel URL changes each time you restart. You'll need to:
1. Run Cell 4 again
2. Copy the new `https://xxxx.trycloudflare.com` URL
3. Update it in the GUI settings

To keep it running longer:
- Use Colab Pro (connects longer without timeout)
- Don't leave browser idle (Colab disconnects after 30 min)
- Keep the cell running

## Speed Tips

```python
# In launch.py command, add these for speed:
"--no-half-vae",  # Faster on T4
"--opt-split-attention",  # Memory efficient
"--opt-sub-quad-attention",  # Experimental, faster
```

## Memory Tips

For low-memory situations:
```python
"--lowvram",  # Slowest but uses ~4GB
"--medvram",  # Medium speed, ~8GB
# Default is best if you have 12GB+
```

## Monitoring

Watch GPU usage in separate cell:
```python
import subprocess
subprocess.run(["nvidia-smi", "-l", "1"])  # Updates every 1 second
```

## Security Notes

⚠️ **Important**: 
- The tunnel URL is temporary and regenerated on restart
- Never share your tunnel URL (anyone can use it)
- The tunnel runs for ~24 hours then stops
- Restart Colab weekly to refresh connection

## Complete Minimal Example

If you want just the essentials:

```python
!git clone https://github.com/AUTOMATIC1111/stable-diffusion-webui && \
cd stable-diffusion-webui && \
pip install -q -r requirements.txt && \
wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 && \
chmod +x cloudflared-linux-amd64 && \
wget -q https://huggingface.co/runwayml/stable-diffusion-v1-5/resolve/main/v1-5-pruned-emaonly.safetensors -O models/Stable-diffusion/model.safetensors

import subprocess, threading, time
subprocess.Popen(["python", "launch.py", "--api", "--cors-allow-origins=*", "--xformers", "--no-half-vae"])
time.sleep(15)
subprocess.run(["./cloudflared-linux-amd64", "tunnel", "--url", "http://localhost:7860"])
```

## Advanced: Custom YAML Configuration

Create `webui/config.yaml`:
```yaml
python_cmd: python3
use_cpu:
  - all
use_xformers: true
api: true
``` 

Then modify launch:
```python
subprocess.run(["python", "launch.py", "--config", "config.yaml"])
```

---

**Version**: 1.0  
**Last Updated**: November 2025  
**Tested On**: Google Colab T4 GPU, Python 3.10
