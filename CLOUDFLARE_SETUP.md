# Налаштування GitHub Pages + Cloudflare Tunnel для Stable Diffusion

## 🚀 Швидкий старт

### Крок 1: Встановіть Cloudflared

**На Windows:**
```powershell
# Завантажте отримувач
$ProgressPreference = 'SilentlyContinue'
Invoke-WebRequest -Uri "https://github.com/cloudflare/wrangler/releases/download/wrangler-v3.0.0/cloudflared-windows-amd64.exe" -OutFile "C:\Program Files\cloudflared.exe"

# Або використовуйте chocolatey
choco install cloudflared
```

**На macOS:**
```bash
brew install cloudflare/cloudflare/cloudflared
```

**На Linux:**
```bash
wget https://github.com/cloudflare/wrangler/releases/download/wrangler-v3.0.0/cloudflared-linux-amd64
chmod +x cloudflared-linux-amd64
sudo mv cloudflared-linux-amd64 /usr/local/bin/cloudflared
```

### Крок 2: Запустіть Stable Diffusion з API

**На Google Colab:**
```bash
# Виконайте в notebook sd_colab.ipynb
!python launch.py --api --cors-allow-origins=* --listen 127.0.0.1
```

### Крок 3: Запустіть Cloudflared Туннель

**На Windows (PowerShell):**
```powershell
# Дайте дозвіл на виконання скриптів
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Запустіть туннель
.\start-tunnel.ps1 -Port 7860
```

**На Linux/macOS:**
```bash
./start-tunnel.sh --port 7860
```

### Крок 4: Скопіюйте URL Туннелю

Видалите буде щось типу:
```
https://xxxx-xxxx-xxxx.trycloudflare.com
```

### Крок 5: Встановіть URL у GitHub Pages

1. Откройте сайт у браузері: `https://yourusername.github.io/Stable_Diffusion/poyo_test_sd/`
2. Перейдіть на вкладку **#settings**
3. Введіть URL в поле "Cloudflared Tunnel URL"
4. Натисніть "Test Connection"
5. URL автоматично збереживается в `localStorage`

## 🔧 Конфігурація

### `cloudflare-tunnel.js`
- Управління URL туннелю
- Перевірка статусу з'єднання
- Автоматичне збереження в `localStorage`

### `start-tunnel.ps1`
- Запуск/зупинення туннелю
- Видобування та збереження URL

## 📊 Як це працює

```
┌─────────────────────────┐
│  GitHub Pages (вас)     │
│  (cloudflare-tunnel.js) │
└────────────┬────────────┘
             │
        HTTP запити
             │
┌────────────▼────────────┐
│ Cloudflare Tunnel       │
│ (https://xxxx....)      │
└────────────┬────────────┘
             │
        Локальна мережа
             │
┌────────────▼──────────────────┐
│  Локальний Stable Diffusion   │
│  (localhost:7860)              │
└───────────────────────────────┘
```

## 🔒 Безпека

- Туннель є **закритим** за замовчуванням (потребує автентифікації Cloudflare)
- URL зберігається у `localStorage` браузера (безпечно)
- Немає прямого доступу до локальної IP-адреси
- Весь трафік зашифрований

## 🆘 Тубування проблем

### Туннель не запускається
```powershell
# Перевірте, чи встановлений cloudflared
cloudflared --version

# Проверьте, чи запущена SD
curl http://localhost:7860
```

### Z'єднання відмовляється
- Переконайтеся, що SD запущена з `--api` флагом
- Перевірте порт (за замовчуванням 7860)
- Видаліть старий URL та введіть новий

### URL часто змінюється
Це нормально! Cloudflare генерує нові URL кожного разу. Просто оновіть у налаштуваннях.

## 📚 Посилання

- [Cloudflare Tunnel Docs](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/)
- [Stable Diffusion WebUI API](https://github.com/AUTOMATIC1111/stable-diffusion-webui/wiki/API)
- [GitHub Pages](https://pages.github.com/)

## 💡 Порадах

1. **Збережіть URL локально** - введіть його у налаштування один раз
2. **Перевіряйте з'єднання** - натисніть "Test Connection" в налаштуваннях
3. **Скористайтеся CORS** - спеціально налаштовано для веб-запитів
4. **Зберіжіть активність** - див. `tunnel-config.json`

Успіхів! 🎉
