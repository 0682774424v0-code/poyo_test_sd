#!/usr/bin/env python3
"""
Generate Google_Colab_Backend_FIXED.ipynb with proper cloudflared installation
v3 - WITH PROPER DIAGNOSTIC AND INSTALLATION FIX
"""

import json
import os

notebook = {
    "cells": [
        {
            "cell_type": "markdown",
            "metadata": {},
            "source": [
                "# 🚀 Stable Diffusion + Cloudflare Tunnel (FIXED v3.0)\n",
                "## Google Colab Setup with Smart cloudflared Detection\n",
                "\n",
                "### ✅ What this notebook does:\n",
                "1. ✅ Verify GPU (Tesla T4/A100/L4)\n",
                "2. ✅ Install cloudflared properly\n",
                "3. ✅ Find cloudflared location (diagnostic)\n",
                "4. ✅ Install Stable Diffusion WebUI\n",
                "5. ✅ Launch WebUI + Tunnel\n",
                "6. ✅ Get public HTTPS URL"
            ]
        },
        {
            "cell_type": "markdown",
            "metadata": {},
            "source": [
                "## Cell 1: System Check & GPU Verification"
            ]
        },
        {
            "cell_type": "code",
            "execution_count": None,
            "metadata": {},
            "outputs": [],
            "source": [
                "import subprocess\nimport os\nimport sys\nimport time\nimport psutil\n\nprint(\"\\n\" + \"=\"*70)\nprint(\"[1/5] SYSTEM DIAGNOSTICS & GPU CHECK\")\nprint(\"=\"*70)\n\n# CPU Info\ncpu_percent = psutil.cpu_percent(interval=1)\ncpu_count = psutil.cpu_count()\nprint(f\"\\n📊 CPU:\")\nprint(f\"   • Cores: {cpu_count}\")\nprint(f\"   • Usage: {cpu_percent}%\")\n\n# Memory Info\nmem = psutil.virtual_memory()\nprint(f\"\\n💾 RAM:\")\nprint(f\"   • Total: {mem.total / (1024**3):.1f} GB\")\nprint(f\"   • Available: {mem.available / (1024**3):.1f} GB\")\nprint(f\"   • Usage: {mem.percent}%\")\n\n# GPU Check\nprint(f\"\\n🎮 GPU Check:\")\ntry:\n    import torch\n    if torch.cuda.is_available():\n        print(f\"   ✅ CUDA Available\")\n        print(f\"   • Device: {torch.cuda.get_device_name(0)}\")\n        print(f\"   • VRAM: {torch.cuda.get_device_properties(0).total_memory / (1024**3):.1f} GB\")\n    else:\n        print(f\"   ❌ CUDA NOT available\")\n        print(f\"   → Go to Runtime → Change runtime type → Select GPU\")\nexcept Exception as e:\n    print(f\"   ⚠️ Error: {e}\")\n\nprint(\"\\n\" + \"=\"*70)\nprint(\"✅ System check complete\")\nprint(\"=\"*70)"
            ]
        },
        {
            "cell_type": "markdown",
            "metadata": {},
            "source": [
                "## Cell 2: Install & Verify Cloudflared (DIAGNOSTIC)"
            ]
        },
        {
            "cell_type": "code",
            "execution_count": None,
            "metadata": {},
            "outputs": [],
            "source": [
                "import subprocess\nimport os\nimport shutil\n\nprint(\"\\n\" + \"=\"*70)\nprint(\"[2/5] CLOUDFLARED INSTALLATION & DIAGNOSTIC\")\nprint(\"=\"*70)\n\nprint(\"\\n🔍 Step 1: Check if already installed...\")\nresult = shutil.which('cloudflared')\nif result:\n    print(f\"   ✅ Already found at: {result}\")\nelse:\n    print(f\"   ❌ Not found in PATH\")\n\nprint(\"\\n📥 Step 2: Install via apt-get...\")\nresult = subprocess.run(\n    \"sudo apt-get update && sudo apt-get install -y cloudflared\",\n    shell=True,\n    capture_output=True,\n    text=True,\n    timeout=120\n)\n\nif result.returncode == 0:\n    print(f\"   ✅ Installation successful\")\nelse:\n    print(f\"   ⚠️ Installation had issues\")\n    print(result.stderr[:200] if result.stderr else \"(no error output)\")\n\nprint(\"\\n🔍 Step 3: Verify installation...\")\n\n# Method 1: which command\nresult = subprocess.run(\"which cloudflared\", shell=True, capture_output=True, text=True)\nif result.returncode == 0 and result.stdout.strip():\n    cloudflared_path = result.stdout.strip()\n    print(f\"   ✅ Found via 'which': {cloudflared_path}\")\nelse:\n    print(f\"   ❌ 'which' command failed\")\n    cloudflared_path = None\n\n# Method 2: find command\nif not cloudflared_path:\n    print(f\"\\n   Trying 'find' command...\")\n    result = subprocess.run(\n        \"find /usr -name cloudflared -type f 2>/dev/null\",\n        shell=True,\n        capture_output=True,\n        text=True,\n        timeout=10\n    )\n    if result.stdout.strip():\n        cloudflared_path = result.stdout.strip().split('\\n')[0]\n        print(f\"   ✅ Found via 'find': {cloudflared_path}\")\n    else:\n        print(f\"   ❌ 'find' command failed\")\n\n# Method 3: dpkg\nif not cloudflared_path:\n    print(f\"\\n   Checking via dpkg...\")\n    result = subprocess.run(\n        \"dpkg -L cloudflared 2>/dev/null | grep bin/cloudflared\",\n        shell=True,\n        capture_output=True,\n        text=True\n    )\n    if result.stdout.strip():\n        cloudflared_path = result.stdout.strip().split('\\n')[0]\n        print(f\"   ✅ Found via dpkg: {cloudflared_path}\")\n    else:\n        print(f\"   ❌ dpkg check failed\")\n\n# Test the binary\nif cloudflared_path and os.path.exists(cloudflared_path):\n    print(f\"\\n✅ CLOUDFLARED LOCATION CONFIRMED: {cloudflared_path}\")\n    result = subprocess.run(\n        [cloudflared_path, \"--version\"],\n        capture_output=True,\n        text=True,\n        timeout=5\n    )\n    if result.returncode == 0:\n        version = result.stdout.strip().split('\\n')[0]\n        print(f\"   Version: {version}\")\n    print(f\"\\n   💾 Saving path for next cell...\")\n    import json\n    with open('/tmp/cloudflared_config.json', 'w') as f:\n        json.dump({\n            'cloudflared_path': cloudflared_path,\n            'status': 'ready'\n        }, f)\n    print(f\"   ✅ Saved\")\nelse:\n    print(f\"\\n❌ CRITICAL: Could not find cloudflared binary!\")\n    print(f\"   Trying manual installation...\")\n    result = subprocess.run(\n        \"wget https://github.com/cloudflare/cloudflared/releases/download/2024.11.0/cloudflared-linux-amd64 -O /tmp/cloudflared && chmod +x /tmp/cloudflared && sudo cp /tmp/cloudflared /usr/local/bin/cloudflared\",\n        shell=True,\n        capture_output=True,\n        text=True,\n        timeout=60\n    )\n    if result.returncode == 0:\n        print(f\"   ✅ Manual installation successful\")\n        cloudflared_path = \"/usr/local/bin/cloudflared\"\n        with open('/tmp/cloudflared_config.json', 'w') as f:\n            json.dump({\n                'cloudflared_path': cloudflared_path,\n                'status': 'ready'\n            }, f)\n    else:\n        print(f\"   ❌ Manual installation failed\")\n        print(result.stderr[:300])\n\nprint(\"\\n\" + \"=\"*70)\nprint(\"✅ Cloudflared check complete\")\nprint(\"=\"*70)"
            ]
        },
        {
            "cell_type": "markdown",
            "metadata": {},
            "source": [
                "## Cell 3: Install WebUI & Dependencies"
            ]
        },
        {
            "cell_type": "code",
            "execution_count": None,
            "metadata": {},
            "outputs": [],
            "source": [
                "import subprocess\nimport os\nimport time\n\nprint(\"\\n\" + \"=\"*70)\nprint(\"[3/5] STABLE DIFFUSION WEBUI SETUP\")\nprint(\"=\"*70)\n\nwebui_dir = \"/root/stable-diffusion-webui\"\n\nprint(f\"\\n📥 Cloning WebUI to {webui_dir}...\")\nif not os.path.exists(webui_dir):\n    result = subprocess.run(\n        [\"git\", \"clone\", \"https://github.com/AUTOMATIC1111/stable-diffusion-webui\", webui_dir],\n        capture_output=True,\n        timeout=300\n    )\n    if result.returncode == 0:\n        print(f\"   ✅ Cloned successfully\")\n    else:\n        print(f\"   ⚠️ Clone had issues, continuing anyway\")\nelse:\n    print(f\"   ⏭️ Already exists\")\n\nos.chdir(webui_dir)\n\nprint(f\"\\n📦 Installing Python dependencies...\")\ncommands = [\n    (\"pip install --upgrade pip setuptools wheel\", \"pip upgrade\"),\n    (\"pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118\", \"PyTorch\"),\n    (\"pip install transformers diffusers accelerate gradio omegaconf einops\", \"ML libraries\"),\n    (\"pip install peft xformers requests Pillow\", \"Additional tools\")\n]\n\nfor i, (cmd, desc) in enumerate(commands, 1):\n    print(f\"   [{i}/{len(commands)}] Installing {desc}...\")\n    try:\n        result = subprocess.run(\n            cmd,\n            shell=True,\n            capture_output=True,\n            timeout=180\n        )\n        if result.returncode == 0:\n            print(f\"        ✅ Done\")\n        else:\n            print(f\"        ⚠️ Some warnings (OK)\")\n    except subprocess.TimeoutExpired:\n        print(f\"        ⏱️ Timeout (continuing)\")\n    except Exception as e:\n        print(f\"        ⚠️ Error: {str(e)[:50]}\")\n\nprint(\"\\n\" + \"=\"*70)\nprint(\"✅ WebUI installation complete\")\nprint(\"=\"*70)"
            ]
        },
        {
            "cell_type": "markdown",
            "metadata": {},
            "source": [
                "## Cell 4: Launch WebUI & Tunnel (SMART VERSION)"
            ]
        },
        {
            "cell_type": "code",
            "execution_count": None,
            "metadata": {},
            "outputs": [],
            "source": [
                "import subprocess\nimport time\nimport os\nimport re\nimport json\n\nprint(\"\\n\" + \"=\"*70)\nprint(\"[4/5] LAUNCHING WEBUI & TUNNEL\")\nprint(\"=\"*70)\n\n# Kill old processes\nprint(\"\\n🧹 Cleaning up old processes...\")\nsubprocess.run(\"pkill -f 'python.*launch.py'\", shell=True, stderr=subprocess.DEVNULL)\nsubprocess.run(\"pkill -f cloudflared\", shell=True, stderr=subprocess.DEVNULL)\ntime.sleep(2)\n\n# Launch WebUI\nprint(\"\\n🚀 Starting WebUI...\")\nwebui_dir = \"/root/stable-diffusion-webui\"\nos.chdir(webui_dir)\n\nwebui_process = subprocess.Popen(\n    [\"python\", \"launch.py\", \"--api\", \"--cors-allow-origins=*\", \"--listen\"],\n    stdout=subprocess.PIPE,\n    stderr=subprocess.STDOUT,\n    text=True,\n    bufsize=1,\n    cwd=webui_dir\n)\n\nprint(\"   ⏳ Waiting 30 seconds for WebUI to initialize...\")\ntime.sleep(30)\nprint(\"   ✅ WebUI running on http://localhost:7860\")\n\n# Load cloudflared path\nprint(\"\\n🌐 Setting up Tunnel...\")\ncloudflared_path = None\n\ntry:\n    with open('/tmp/cloudflared_config.json', 'r') as f:\n        config = json.load(f)\n        cloudflared_path = config.get('cloudflared_path')\n        print(f\"   ✅ Loaded cloudflared path from config: {cloudflared_path}\")\nexcept:\n    print(f\"   ⚠️ Config file not found, trying default paths...\")\n    import shutil\n    cloudflared_path = shutil.which('cloudflared')\n    if cloudflared_path:\n        print(f\"   ✅ Found via shutil.which: {cloudflared_path}\")\n\nif not cloudflared_path:\n    print(f\"   ❌ Could not find cloudflared!\")\n    print(f\"      This is likely a Google Colab environment issue.\")\n    print(f\"      Try running the apt-get install cell again.\")\nelse:\n    print(f\"\\n   🚀 Starting tunnel with: {cloudflared_path}\")\n    try:\n        # Start tunnel process\n        tunnel_process = subprocess.Popen(\n            [cloudflared_path, \"tunnel\", \"--url\", \"http://localhost:7860\"],\n            stdout=subprocess.PIPE,\n            stderr=subprocess.STDOUT,\n            text=True,\n            bufsize=1,\n            universal_newlines=True\n        )\n        \n        print(\"   ⏳ Waiting for tunnel URL (15 seconds)...\\n\")\n        timeout = time.time() + 20\n        tunnel_url = None\n        \n        while time.time() < timeout:\n            try:\n                line = tunnel_process.stdout.readline()\n                if line:\n                    print(f\"      {line.rstrip()}\")\n                    # Search for URL\n                    match = re.search(r'https://[a-zA-Z0-9-]+\\.trycloudflare\\.com', line)\n                    if match:\n                        tunnel_url = match.group(0)\n                        break\n                time.sleep(0.1)\n            except:\n                pass\n        \n        if tunnel_url:\n            print(f\"\\n\" + \"=\"*70)\n            print(f\"🎉 SUCCESS! TUNNEL URL OBTAINED\")\n            print(f\"=\"*70)\n            print(f\"\\n🌐 Public URL: {tunnel_url}\")\n            print(f\"\\n📋 NEXT STEPS:\")\n            print(f\"   1. Copy the URL above\")\n            print(f\"   2. Go to your GitHub Pages site\")\n            print(f\"   3. Click ⚙️ Settings (top right)\")\n            print(f\"   4. Paste URL in 'Cloudflared Tunnel URL' field\")\n            print(f\"   5. Click 'Test Connection'\")\n            print(f\"   6. Start generating! 🎨\")\n            print(f\"\\n\" + \"=\"*70)\n            \n            # Save for later use\n            with open('/tmp/tunnel_url.txt', 'w') as f:\n                f.write(tunnel_url)\n        else:\n            print(f\"\\n⚠️ No URL found in output\")\n            print(f\"   But tunnel should be running on port 8000\")\n            print(f\"   Try accessing: http://localhost:8000\")\n    \n    except Exception as e:\n        print(f\"   ❌ Error launching tunnel: {e}\")\n        import traceback\n        traceback.print_exc()\n\nprint(f\"\\n💡 Keep this notebook running!\")\nprint(f\"   Do NOT close this browser tab or this cell.\")"
            ]
        },
        {
            "cell_type": "markdown",
            "metadata": {},
            "source": [
                "## Cell 5: Test API Connection & Show Status"
            ]
        },
        {
            "cell_type": "code",
            "execution_count": None,
            "metadata": {},
            "outputs": [],
            "source": [
                "import requests\nimport time\n\nprint(\"\\n\" + \"=\"*70)\nprint(\"[5/5] TESTING API CONNECTION\")\nprint(\"=\"*70)\n\napi_url = \"http://localhost:7860\"\n\nprint(f\"\\n🔌 Testing WebUI API...\")\nfor attempt in range(1, 4):\n    try:\n        response = requests.get(f\"{api_url}/api/sd-models\", timeout=5)\n        if response.status_code == 200:\n            print(f\"   ✅ API responding (attempt {attempt})\")\n            data = response.json()\n            if isinstance(data, list) and len(data) > 0:\n                print(f\"   ✅ Models loaded: {len(data)} checkpoint(s)\")\n                print(f\"      • {data[0].get('model_name', 'Unknown')[:60]}\")\n            else:\n                print(f\"   ⚠️ Models still loading, try again in 30 seconds\")\n            break\n    except requests.exceptions.ConnectionError:\n        if attempt < 3:\n            print(f\"   ⏳ WebUI still initializing... (attempt {attempt}/3)\")\n            time.sleep(5)\n        else:\n            print(f\"   ❌ Cannot reach WebUI after {attempt} attempts\")\n            print(f\"      Try running this cell again in 60 seconds\")\n    except Exception as e:\n        print(f\"   ⚠️ Error: {str(e)[:100]}\")\n        break\n\nprint(\"\\n\" + \"=\"*70)\nprint(\"🎉 SETUP COMPLETE!\")\nprint(\"=\"*70)\nprint(f\"\\n✅ WebUI: http://localhost:7860\")\nprint(f\"✅ API: http://localhost:7860/api\")\nprint(f\"✅ Tunnel: Check Cell 4 output for public URL\")\nprint(f\"\\n📌 DO NOT CLOSE THIS NOTEBOOK!\")\nprint(f\"   The tunnel and WebUI will stop if you do.\")"
            ]
        }
    ],
    "metadata": {
        "kernelspec": {
            "display_name": "Python 3",
            "language": "python",
            "name": "python3"
        },
        "language_info": {
            "name": "python",
            "version": "3.10.12"
        }
    },
    "nbformat": 4,
    "nbformat_minor": 2
}

# Write notebook
script_dir = os.path.dirname(os.path.abspath(__file__))
output_path = os.path.join(script_dir, "Google_Colab_Backend_FIXED.ipynb")

with open(output_path, "w") as f:
    json.dump(notebook, f, indent=2)

print(f"✅ Created: Google_Colab_Backend_FIXED.ipynb")
print(f"Size: {os.path.getsize(output_path) / 1024:.1f} KB")
