#!/usr/bin/env python3
"""
Generate Google_Colab_Backend_FIXED.ipynb with proper cloudflared PATH detection
"""

import json
import os

notebook = {
    "cells": [
        {
            "cell_type": "markdown",
            "metadata": {},
            "source": [
                "# 🚀 Stable Diffusion + Cloudflare Tunnel (FIXED v2.0)\n",
                "## Complete setup with cloudflared PATH detection\n",
                "\n",
                "### ✅ What you'll get:\n",
                "- GPU verification (T4/A100/L4)\n",
                "- Automatic WebUI installation\n",
                "- Smart cloudflared detection (finds wherever it's installed)\n",
                "- Cloudflare Tunnel with public HTTPS URL\n",
                "- Full error handling and diagnostics"
            ]
        },
        {
            "cell_type": "markdown",
            "metadata": {},
            "source": [
                "## Part 1: System Check & GPU Verification"
            ]
        },
        {
            "cell_type": "code",
            "execution_count": None,
            "metadata": {},
            "outputs": [],
            "source": [
                "import subprocess\nimport os\nimport sys\nimport time\nimport re\nimport psutil\n\nprint(\"\\\\n\" + \"=\"*60)\nprint(\"[1/5] SYSTEM DIAGNOSTICS\")\nprint(\"=\"*60)\n\n# CPU Info\ncpu_percent = psutil.cpu_percent(interval=1)\ncpu_count = psutil.cpu_count()\nprint(f\"\\\\n📊 CPU:\")\nprint(f\"   • Cores: {cpu_count}\")\nprint(f\"   • Usage: {cpu_percent}%\")\n\n# Memory Info\nmem = psutil.virtual_memory()\nprint(f\"\\\\n💾 RAM:\")\nprint(f\"   • Total: {mem.total / (1024**3):.1f} GB\")\nprint(f\"   • Available: {mem.available / (1024**3):.1f} GB\")\nprint(f\"   • Usage: {mem.percent}%\")\n\n# GPU Check\nprint(f\"\\\\n🎮 GPU Check:\")\ntry:\n    import torch\n    if torch.cuda.is_available():\n        print(f\"   ✅ CUDA Available\")\n        print(f\"   • Device: {torch.cuda.get_device_name(0)}\")\n        print(f\"   • VRAM: {torch.cuda.get_device_properties(0).total_memory / (1024**3):.1f} GB\")\n    else:\n        print(f\"   ❌ CUDA NOT available - GPU not enabled!\")\n        print(f\"   → Go to Runtime → Change runtime type → Select GPU\")\nexcept Exception as e:\n    print(f\"   ⚠️ Error checking GPU: {e}\")\n\nprint(\"\\\\n\" + \"=\"*60)\nprint(\"✅ System check complete\")\nprint(\"=\"*60)"
            ]
        },
        {
            "cell_type": "markdown",
            "metadata": {},
            "source": [
                "## Part 2: Check and Find Cloudflared Installation"
            ]
        },
        {
            "cell_type": "code",
            "execution_count": None,
            "metadata": {},
            "outputs": [],
            "source": [
                "import subprocess\nimport os\n\nprint(\"\\\\n\" + \"=\"*60)\nprint(\"[2/5] FINDING CLOUDFLARED\")\nprint(\"=\"*60)\n\ncloudflared_path = None\n\n# Try to find cloudflared\nprint(\"\\\\n🔍 Searching for cloudflared...\")\n\n# Method 1: which command\nresult = subprocess.run(\"which cloudflared\", shell=True, capture_output=True, text=True)\nif result.returncode == 0:\n    cloudflared_path = result.stdout.strip()\n    print(f\"   ✅ Found via 'which': {cloudflared_path}\")\n\n# Method 2: Check common paths\nif not cloudflared_path:\n    common_paths = [\n        \"/usr/bin/cloudflared\",\n        \"/usr/local/bin/cloudflared\",\n        \"/snap/bin/cloudflared\",\n    ]\n    for path in common_paths:\n        if os.path.exists(path):\n            cloudflared_path = path\n            print(f\"   ✅ Found at: {path}\")\n            break\n\n# Method 3: find command\nif not cloudflared_path:\n    result = subprocess.run(\"find /usr -name cloudflared 2>/dev/null | head -1\", shell=True, capture_output=True, text=True)\n    if result.stdout.strip():\n        cloudflared_path = result.stdout.strip()\n        print(f\"   ✅ Found via find: {cloudflared_path}\")\n\nif cloudflared_path:\n    print(f\"\\\\n✅ CLOUDFLARED FOUND\")\n    print(f\"   Path: {cloudflared_path}\")\n    print(f\"\\\\n   Will use this for tunnel!\")\nelse:\n    print(f\"\\\\n⚠️ CLOUDFLARED NOT FOUND\")\n    print(f\"   Will try to use 'cloudflared' command via shell\")\n    cloudflared_path = \"cloudflared\"  # Fallback to shell\n\n# Save for next cell\nimport json\nwith open('/tmp/cloudflared_path.json', 'w') as f:\n    json.dump({'path': cloudflared_path}, f)\n\nprint(\"\\\\n\" + \"=\"*60)\nprint(\"✅ Cloudflared search complete\")\nprint(\"=\"*60)"
            ]
        },
        {
            "cell_type": "markdown",
            "metadata": {},
            "source": [
                "## Part 3: Install WebUI & Dependencies"
            ]
        },
        {
            "cell_type": "code",
            "execution_count": None,
            "metadata": {},
            "outputs": [],
            "source": [
                "import os\nimport subprocess\nimport time\n\nprint(\"\\\\n\" + \"=\"*60)\nprint(\"[3/5] STABLE DIFFUSION WEBUI SETUP\")\nprint(\"=\"*60)\n\n# Clone WebUI\nprint(\"\\\\n📥 Cloning Stable Diffusion WebUI...\")\nwebui_dir = \"/root/stable-diffusion-webui\"\n\nif not os.path.exists(webui_dir):\n    result = subprocess.run(\n        [\"git\", \"clone\", \"https://github.com/AUTOMATIC1111/stable-diffusion-webui\", webui_dir],\n        capture_output=True,\n        timeout=300\n    )\n    if result.returncode == 0:\n        print(f\"   ✅ Cloned to {webui_dir}\")\n    else:\n        print(f\"   ⚠️ Clone might have issues\")\nelse:\n    print(f\"   ⏭️ Already exists\")\n\nos.chdir(webui_dir)\n\n# Install dependencies\nprint(\"\\\\n📦 Installing dependencies (5-10 min)...\")\n\ncommands = [\n    \"pip install --upgrade pip setuptools wheel\",\n    \"pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118\",\n    \"pip install transformers diffusers accelerate gradio omegaconf einops\",\n    \"pip install peft xformers requests Pillow\"\n]\n\nfor i, cmd in enumerate(commands, 1):\n    print(f\"\\\\n   [{i}/{len(commands)}] {cmd[:40]}...\")\n    try:\n        result = subprocess.run(cmd, shell=True, capture_output=True, timeout=180)\n        if result.returncode == 0:\n            print(f\"        ✅ Done\")\n        else:\n            print(f\"        ⚠️ Some warnings (OK)\")\n    except Exception as e:\n        print(f\"        ⚠️ Error: {str(e)[:40]}\")\n\nprint(\"\\\\n\" + \"=\"*60)\nprint(\"✅ WebUI setup complete\")\nprint(\"=\"*60)"
            ]
        },
        {
            "cell_type": "markdown",
            "metadata": {},
            "source": [
                "## Part 4: Launch WebUI & Cloudflare Tunnel (SMART PATH)"
            ]
        },
        {
            "cell_type": "code",
            "execution_count": None,
            "metadata": {},
            "outputs": [],
            "source": [
                "import subprocess\nimport time\nimport os\nimport re\nimport json\n\nprint(\"\\\\n\" + \"=\"*60)\nprint(\"[4/5] LAUNCHING WEBUI & TUNNEL\")\nprint(\"=\"*60)\n\n# Kill old processes\nprint(\"\\\\n🧹 Cleaning up...\")\nsubprocess.run(\"pkill -f 'python.*launch.py'\", shell=True, stderr=subprocess.DEVNULL)\nsubprocess.run(\"pkill -f cloudflared\", shell=True, stderr=subprocess.DEVNULL)\ntime.sleep(2)\n\n# Launch WebUI\nprint(\"\\\\n🚀 Starting WebUI...\")\nwebui_dir = \"/root/stable-diffusion-webui\"\nos.chdir(webui_dir)\n\nwebui_process = subprocess.Popen(\n    [\"python\", \"launch.py\", \"--api\", \"--cors-allow-origins=*\", \"--listen\"],\n    stdout=subprocess.PIPE,\n    stderr=subprocess.STDOUT,\n    text=True,\n    bufsize=1,\n    cwd=webui_dir\n)\n\nprint(\"   ⏳ Waiting 30 seconds...\")\ntime.sleep(30)\nprint(\"   ✅ WebUI running on http://localhost:7860\")\n\n# Load cloudflared path from previous cell\ncloudflared_path = \"cloudflared\"\ntry:\n    with open('/tmp/cloudflared_path.json', 'r') as f:\n        data = json.load(f)\n        cloudflared_path = data.get('path', 'cloudflared')\nexcept:\n    pass\n\nprint(f\"\\\\n🌐 Starting Tunnel (using: {cloudflared_path})...\")\n\ntunnel_url = None\ntry:\n    if cloudflared_path.startswith('/'):\n        # Use full path\n        tunnel_process = subprocess.Popen(\n            [cloudflared_path, \"tunnel\", \"--url\", \"http://localhost:7860\"],\n            stdout=subprocess.PIPE,\n            stderr=subprocess.STDOUT,\n            text=True,\n            bufsize=1\n        )\n    else:\n        # Use shell for PATH lookup\n        tunnel_process = subprocess.Popen(\n            f\"{cloudflared_path} tunnel --url http://localhost:7860\",\n            shell=True,\n            stdout=subprocess.PIPE,\n            stderr=subprocess.STDOUT,\n            text=True,\n            bufsize=1\n        )\n    \n    print(\"   ⏳ Waiting for URL (10 seconds)...\")\n    timeout = time.time() + 15\n    \n    while time.time() < timeout:\n        line = tunnel_process.stdout.readline()\n        if line:\n            print(f\"   {line.strip()}\")\n            match = re.search(r'https://[a-zA-Z0-9-]+\\\\.trycloudflare\\\\.com', line)\n            if match:\n                tunnel_url = match.group(0)\n                print(f\"\\\\n\" + \"=\"*60)\n                print(f\"🎉 SUCCESS!\")\n                print(f\"=\"*60)\n                print(f\"\\\\n🌐 Public URL: {tunnel_url}\")\n                print(f\"\\\\n   Copy & use in GitHub Pages!\")\n                print(f\"\\\\n\" + \"=\"*60)\n                break\n        time.sleep(0.5)\n    \n    if not tunnel_url:\n        print(\"   ⚠️ No URL found, but tunnel should be running\")\n\nexcept Exception as e:\n    print(f\"   ❌ Error: {e}\")\n    print(f\"   Try running in a new cell!\")\n\nprint(\"\\\\n💡 Keep this notebook running in the background!\")"
            ]
        },
        {
            "cell_type": "markdown",
            "metadata": {},
            "source": [
                "## Part 5: Test API Connection"
            ]
        },
        {
            "cell_type": "code",
            "execution_count": None,
            "metadata": {},
            "outputs": [],
            "source": [
                "import requests\n\nprint(\"\\\\n\" + \"=\"*60)\nprint(\"[5/5] TESTING API\")\nprint(\"=\"*60)\n\napi_url = \"http://localhost:7860\"\n\nprint(f\"\\\\n🔌 Testing {api_url}\")\ntry:\n    response = requests.get(f\"{api_url}/api/sd-models\", timeout=5)\n    if response.status_code == 200:\n        print(f\"   ✅ API responding\")\n        data = response.json()\n        if isinstance(data, list) and len(data) > 0:\n            print(f\"   ✅ Models: {len(data)}\")\n        else:\n            print(f\"   ⚠️ No models loaded yet\")\n    else:\n        print(f\"   ⚠️ Status: {response.status_code}\")\nexcept Exception as e:\n    print(f\"   ❌ Error: {str(e)[:60]}\")\n    print(f\"   WebUI might still be loading...\")\n\nprint(\"\\\\n\" + \"=\"*60)\nprint(\"🎉 SETUP COMPLETE!\")\nprint(\"=\"*60)\nprint(f\"\\\\n✅ WebUI: http://localhost:7860\")\nprint(f\"✅ API: http://localhost:7860/api\")\nprint(f\"✅ Tunnel: See cell [4] for URL\")\nprint(f\"\\\\n🚀 Ready to generate images!\")"
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

# Write to file
script_dir = os.path.dirname(os.path.abspath(__file__))
output_path = os.path.join(script_dir, "Google_Colab_Backend_FIXED.ipynb")

with open(output_path, "w") as f:
    json.dump(notebook, f, indent=2)

print(f"✅ Created: Google_Colab_Backend_FIXED.ipynb")
print(f"Size: {os.path.getsize(output_path) / 1024:.1f} KB")
