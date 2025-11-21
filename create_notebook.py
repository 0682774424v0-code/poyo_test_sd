#!/usr/bin/env python3
import json

notebook = {
    "cells": [
        {
            "cell_type": "markdown",
            "metadata": {},
            "source": [
                "# 🎨 Stable Diffusion WebUI on Google Colab\n",
                "## з інтеграцією GitHub Pages + Cloudflare Tunnel\n",
                "\n",
                "**Цей notebook дозволяє:**\n",
                "- Запустити повнофункціональний Stable Diffusion WebUI на Google Colab\n",
                "- Використовувати його через веб-інтерфейс на GitHub Pages\n",
                "- Генерувати зображення користуючись хмарною GPU\n",
                "\n",
                "⚡ **Вимоги:**\n",
                "- Google Colab акаунт (безплатний)\n",
                "- GPU включена (T4, A100 або L4)\n",
                "- GitHub Pages сайт з файлами з цього репозиторію"
            ]
        },
        {
            "cell_type": "markdown",
            "metadata": {},
            "source": [
                "---\n",
                "## ⚙️ КРОК 1: Перевірка GPU\n",
                "\n",
                "Перед запуском переконайтеся, що GPU включена!"
            ]
        },
        {
            "cell_type": "code",
            "execution_count": None,
            "metadata": {},
            "outputs": [],
            "source": [
                "import torch\n",
                "\n",
                "print(\"🖥️  ПЕРЕВІРКА СИСТЕМИ\")\n",
                "print(\"=\"*50)\n",
                "\n",
                "if torch.cuda.is_available():\n",
                "    print(f\"✅ GPU: {torch.cuda.get_device_name(0)}\")\n",
                "    print(f\"   CUDA: {torch.version.cuda}\")\n",
                "    print(f\"   Пам'ять: {torch.cuda.get_device_properties(0).total_memory / 1e9:.2f} GB\")\n",
                "else:\n",
                "    print(\"❌ GPU НЕ знайдена!\")\n",
                "    print(\"   Runtime → Change runtime type → GPU\")"
            ]
        },
        {
            "cell_type": "markdown",
            "metadata": {},
            "source": [
                "---\n",
                "## 📦 КРОК 2: Встановлення та запуск"
            ]
        },
        {
            "cell_type": "code",
            "execution_count": None,
            "metadata": {},
            "outputs": [],
            "source": [
                "import subprocess, os, time\n",
                "\n",
                "print(\"\\n🚀 ВСТАНОВЛЕННЯ ТА ЗАПУСК\")\n",
                "print(\"=\"*50)\n",
                "\n",
                "webui_dir = \"/root/stable-diffusion-webui\"\n",
                "\n",
                "# Клонування\n",
                "if not os.path.exists(webui_dir):\n",
                "    subprocess.run([\"git\", \"clone\", \"https://github.com/AUTOMATIC1111/stable-diffusion-webui.git\", webui_dir], capture_output=True)\n",
                "    print(\"✅ WebUI встановлена\")\n",
                "\n",
                "# Залежності\n",
                "print(\"\\n📦 Встановлення залежностей...\")\n",
                "deps = [\"torch\", \"transformers\", \"diffusers\", \"accelerate\", \"flask\", \"flask-cors\"]\n",
                "for dep in deps:\n",
                "    subprocess.run([\"pip\", \"install\", \"-q\", dep], capture_output=True, timeout=60)\n",
                "print(\"✅ Залежності встановлені\")\n",
                "\n",
                "# Запуск WebUI\n",
                "print(\"\\n⏳ Запуск WebUI (чекаємо 30 сек)...\")\n",
                "os.chdir(webui_dir)\n",
                "webui_process = subprocess.Popen(\n",
                "    [\"python\", \"launch.py\", \"--api\", \"--cors-allow-origins=*\", \"--listen\", \"127.0.0.1\", \"--port\", \"7860\", \"--xformers\"],\n",
                "    stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True\n",
                ")\n",
                "time.sleep(30)\n",
                "print(\"✅ WebUI запущена на http://localhost:7860\")\n",
                "\n",
                "# cloudflared\n",
                "print(\"\\n🔗 Встановлення Cloudflare...\")\n",
                "subprocess.run([\"wget\", \"-q\", \"https://github.com/cloudflare/wrangler/releases/download/wrangler-v3.0.0/cloudflared-linux-amd64\", \"-O\", \"/usr/local/bin/cloudflared\"], capture_output=True, timeout=30)\n",
                "os.chmod(\"/usr/local/bin/cloudflared\", 0o755)\n",
                "print(\"✅ Готово!\")"
            ]
        },
        {
            "cell_type": "markdown",
            "metadata": {},
            "source": [
                "---\n",
                "## 🌐 КРОК 3: Cloudflare Tunnel\n",
                "\n",
                "Цей крок запускає туннель - скопіюйте URL!"
            ]
        },
        {
            "cell_type": "code",
            "execution_count": None,
            "metadata": {},
            "outputs": [],
            "source": [
                "import subprocess, time, re\n",
                "\n",
                "print(\"🚀 ЗАПУСК CLOUDFLARE TUNNEL\")\n",
                "print(\"=\"*50 + \"\\n\")\n",
                "\n",
                "tunnel_url = None\n",
                "process = subprocess.Popen(\n",
                "    [\"cloudflared\", \"tunnel\", \"--url\", \"http://localhost:7860\"],\n",
                "    stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, bufsize=1\n",
                ")\n",
                "\n",
                "start = time.time()\n",
                "while time.time() - start < 60:\n",
                "    line = process.stdout.readline()\n",
                "    if not line:\n",
                "        time.sleep(0.5)\n",
                "        continue\n",
                "    print(line.rstrip())\n",
                "    if \"trycloudflare.com\" in line:\n",
                "        match = re.search(r'https://[a-zA-Z0-9-]+\\.trycloudflare\\.com', line)\n",
                "        if match:\n",
                "            tunnel_url = match.group(0)\n",
                "            break\n",
                "\n",
                "if tunnel_url:\n",
                "    print(\"\\n\" + \"🎉\"*20)\n",
                "    print(\"\\n✅ ТУННЕЛЬ АКТИВНА!\")\n",
                "    print(f\"\\n🌐 URL: {tunnel_url}\")\n",
                "    print(\"\\n📋 СКОПІЮЙТЕ URL В GITHUB PAGES!\")\n",
                "    print(\"   1. Відкрийте сайт\")\n",
                "    print(\"   2. Сервер іконка (справа)\")\n",
                "    print(\"   3. #settings вкладка\")\n",
                "    print(\"   4. Вставте URL\")\n",
                "    print(\"   5. Test Connection\")\n",
                "    print(\"\\n⚠️  НЕ ВИМИКАЙТЕ ЦЕЙ ФАЙЛ!\")\n",
                "else:\n",
                "    print(\"\\n⏳ Туннель запускається, чекайте...\")"
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

# Write to file
with open("sd_colab.ipynb", "w", encoding="utf-8") as f:
    json.dump(notebook, f, indent=1, ensure_ascii=False)

print("✅ Notebook created successfully: sd_colab.ipynb")
