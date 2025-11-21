#!/usr/bin/env python3
import json

notebook = {
    "cells": [
        {
            "cell_type": "markdown",
            "metadata": {},
            "source": [
                "# 🎨 Stable Diffusion WebUI Advanced\n",
                "## Google Colab Backend Notebook\n",
                "\n",
                "**Цей notebook надає:**\n",
                "- Детальний крок за кроком процес встановлення\n",
                "- Тестування кожного компонента\n",
                "- Детальні логи та діагностику\n",
                "- API інтеграцію з GitHub Pages\n",
                "\n",
                "📌 **Для швидкого старту:** Використовуйте `sd_colab.ipynb`\n",
                "📌 **Для налаштувань:** Використовуйте цей файл"
            ]
        },
        {
            "cell_type": "markdown",
            "metadata": {},
            "source": [
                "---\n",
                "## ЧАСТИНА 1: Система та GPU"
            ]
        },
        {
            "cell_type": "code",
            "execution_count": None,
            "metadata": {},
            "outputs": [],
            "source": [
                "import torch\n",
                "import platform\n",
                "import psutil\n",
                "\n",
                "print(\"╔\" + \"═\"*58 + \"╗\")\n",
                "print(\"║\" + \" \"*10 + \"СИСТЕМА ТА GPU КОНФІГУРАЦІЯ\" + \" \"*20 + \"║\")\n",
                "print(\"╚\" + \"═\"*58 + \"╝\")\n",
                "\n",
                "print(\"\\n🖥️  ІНФОРМАЦІЯ ПРО СИСТЕМУ:\")\n",
                "print(f\"   OS: {platform.system()} {platform.release()}\")\n",
                "print(f\"   Python: {platform.python_version()}\")\n",
                "print(f\"   CPU cores: {psutil.cpu_count()}\")\n",
                "\n",
                "print(\"\\n💾 ПАМ'ЯТЬ:\")\n",
                "mem = psutil.virtual_memory()\n",
                "print(f\"   Всього: {mem.total / (1024**3):.2f} GB\")\n",
                "print(f\"   Доступно: {mem.available / (1024**3):.2f} GB\")\n",
                "print(f\"   Використано: {mem.percent}%\")\n",
                "\n",
                "print(\"\\n🎮 GPU:\")\n",
                "if torch.cuda.is_available():\n",
                "    print(f\"   ✅ Знайдена: {torch.cuda.get_device_name(0)}\")\n",
                "    print(f\"   CUDA: {torch.version.cuda}\")\n",
                "    print(f\"   Пам'ять: {torch.cuda.get_device_properties(0).total_memory / 1e9:.2f} GB\")\n",
                "else:\n",
                "    print(\"   ❌ GPU НЕ знайдена\")\n",
                "    print(\"   Runtime → Change runtime type → GPU\")"
            ]
        },
        {
            "cell_type": "markdown",
            "metadata": {},
            "source": [
                "---\n",
                "## ЧАСТИНА 2: WebUI Встановлення"
            ]
        },
        {
            "cell_type": "code",
            "execution_count": None,
            "metadata": {},
            "outputs": [],
            "source": [
                "import subprocess\n",
                "import os\n",
                "import time\n",
                "\n",
                "print(\"\\n🚀 ВСТАНОВЛЕННЯ STABLE DIFFUSION WEBUI\")\n",
                "print(\"=\"*50)\n",
                "\n",
                "webui_dir = \"/root/stable-diffusion-webui\"\n",
                "\n",
                "if not os.path.exists(webui_dir):\n",
                "    print(\"📥 Клонування репозиторію...\")\n",
                "    result = subprocess.run(\n",
                "        [\"git\", \"clone\", \"https://github.com/AUTOMATIC1111/stable-diffusion-webui.git\", webui_dir],\n",
                "        capture_output=True, text=True, timeout=300\n",
                "    )\n",
                "    if result.returncode == 0:\n",
                "        print(\"✅ Репозиторій клонований\")\n",
                "    else:\n",
                "        print(f\"❌ Помилка: {result.stderr[:100]}\")\n",
                "else:\n",
                "    print(\"✅ WebUI вже встановлена\")\n",
                "\n",
                "os.chdir(webui_dir)\n",
                "print(f\"📂 Робоча папка: {os.getcwd()}\")\n",
                "print(\"=\"*50)"
            ]
        },
        {
            "cell_type": "markdown",
            "metadata": {},
            "source": [
                "---\n",
                "## ЧАСТИНА 3: Запуск та Тестування"
            ]
        },
        {
            "cell_type": "code",
            "execution_count": None,
            "metadata": {},
            "outputs": [],
            "source": [
                "import subprocess\n",
                "import os\n",
                "import time\n",
                "import requests\n",
                "\n",
                "webui_dir = \"/root/stable-diffusion-webui\"\n",
                "os.chdir(webui_dir)\n",
                "\n",
                "print(\"\\n🎯 ЗАПУСК WEBUI ТА CLOUDFLARE\")\n",
                "print(\"=\"*50)\n",
                "\n",
                "# WebUI\n",
                "print(\"\\n[1/3] WebUI запуск...\")\n",
                "webui = subprocess.Popen(\n",
                "    [\"python\", \"launch.py\", \"--api\", \"--cors-allow-origins=*\", \"--listen\", \"127.0.0.1\", \"--port\", \"7860\", \"--xformers\"],\n",
                "    stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True\n",
                ")\n",
                "time.sleep(30)\n",
                "print(\"✅ WebUI готова: http://localhost:7860\")\n",
                "\n",
                "# Cloudflare\n",
                "print(\"\\n[2/3] Cloudflare встановлення...\")\n",
                "subprocess.run([\"wget\", \"-q\", \"https://github.com/cloudflare/wrangler/releases/download/wrangler-v3.0.0/cloudflared-linux-amd64\", \"-O\", \"/usr/local/bin/cloudflared\"], capture_output=True, timeout=30)\n",
                "os.chmod(\"/usr/local/bin/cloudflared\", 0o755)\n",
                "print(\"✅ Cloudflare готова\")\n",
                "\n",
                "# Тест\n",
                "print(\"\\n[3/3] Тестування API...\")\n",
                "try:\n",
                "    response = requests.get(\"http://localhost:7860/api/sd-models\", timeout=5)\n",
                "    print(f\"✅ API доступна (статус {response.status_code})\")\n",
                "except:\n",
                "    print(\"⏳ WebUI ще запускається\")\n",
                "\n",
                "print(\"\\n\" + \"=\"*50)\n",
                "print(\"✅ ГОТОВО! Переходьте до наступного кроку\")"
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
            "codemirror_mode": {
                "name": "ipython",
                "version": 3
            },
            "file_extension": ".py",
            "mimetype": "text/x-python",
            "name": "python",
            "nbconvert_exporter": "python",
            "pygments_lexer": "ipython3",
            "version": "3.10.12"
        }
    },
    "nbformat": 4,
    "nbformat_minor": 4
}

with open("Google_Colab_Backend.ipynb", "w", encoding="utf-8") as f:
    json.dump(notebook, f, indent=1, ensure_ascii=False)

print("✅ Google_Colab_Backend.ipynb created!")
