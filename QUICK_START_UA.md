# 🚀 Quick Start Guide (Українська) 🇺🇦

## Що потрібно зробити

### 1️⃣ **Завантажи Google Colab Notebook**

Завантажи файл `Google_Colab_Backend_FIXED.ipynb` з теки `/server/`

### 2️⃣ **Відкрий Google Colab**

1. Перейди на https://colab.research.google.com
2. **Upload** → Виберіть завантажений файл
3. Notebook відкриється в браузері

### 3️⃣ **Переведи на GPU** (⚠️ ВАЖЛИВО!)

1. Вгорі справа: **Runtime** 
2. **Change runtime type**
3. **Hardware accelerator** → Вибери **T4 GPU** (або A100 якщо доступно)
4. **Save**

### 4️⃣ **Запусти комірки по порядку**

```
[1] System Diagnostics      → ✅ Перевірка GPU
[2] Cloudflared Install      → ✅ Встановлення туннелю  
[3] WebUI Setup              → ✅ Встановлення Stable Diffusion
[4] Launch WebUI & Tunnel    → 🎉 СКОПІЮЙ URL ЗВІДСИ!
[5] Test API Connection      → ✅ Перевірка підключення
```

### 5️⃣ **Скопіюй Tunnel URL**

У cell [4] буде такий вивід:

```
🎉 SUCCESS! TUNNEL URL OBTAINED
======================================================================

🌐 Public URL: https://xxxx-xxxx-xxx.trycloudflare.com

📋 NEXT STEPS:
   1. Copy the URL above
   2. Go to your GitHub Pages site
   3. Click ⚙️ Settings (top right)
   ...
```

**Скопіюй URL типу `https://xxxx-xxxx-xxx.trycloudflare.com`**

### 6️⃣ **Вставь URL у твій сайт**

1. Перейди на твій GitHub Pages сайт (https://username.github.io/poyo_test_sd)
2. Вгорі справа → **⚙️ Settings** (iконка шестерні)
3. Поле **"Cloudflared Tunnel URL"**
4. Вставь скопійований URL
5. Натисни **"Test Connection"**
6. Якщо зелена галочка ✅ - **все працює!**

### 7️⃣ **Генеруй зображення!** 🎨

1. Повернись на сайт
2. Перейди на табу **#txt2img**
3. Напиши prompt
4. Натисни **Generate**
5. Чекай результат 🖼️

---

## ⚠️ Важні моменти

### Notebook має працювати весь час!

```
❌ НЕ ЗАКРИВАЙ БРАУЗЕР
❌ НЕ ПЕРЕЗАВАНТАЖУЙ СТОРІНКУ
❌ НЕ ЗАКРИВАЙ GOOGLE COLAB
```

Якщо закриєш - туннель упаде, сайт не буде мати доступу до GPU.

### Notebook буде працювати 12 годин

Google Colab автоматично вимикає сесії через 12 годин неактивності. Після цього прийде жати до нового запуску.

### Якщо щось не працює

1. **Cell [1] показує помилку GPU?**
   - Перевір що Runtime на T4 GPU
   - Нижче в лісті буде "Tesla T4 GPU"

2. **Cell [2] не знаходить cloudflared?**
   - Запусти cell [2] ще раз
   - Якщо знову не помагає - це bug в Colab
   - Спробуй іншу сесію

3. **Cell [4] каже "No URL found"?**
   - Можливо WebUI завантажується довше
   - Почекай 1 хвилину
   - Запусти cell [4] ще раз
   - Якщо знову не працює - напиши "ERROR" в коментарях

4. **Сайт показує "Connection Failed"?**
   - Перевір що URL вставлений правильно
   - Перевір що Notebook все ще запущений
   - Перезавантаж сайт (F5)

---

## 🔧 Структура твого проекту

```
📦 poyo_test_sd/
├── 📄 index.html           ← Frontend (Discord-like інтерфейс)
├── 🎨 style.css            ← Стилі
├── 📜 script.js            ← Логіка фронтенду
├── 🔌 sd-api-client.js     ← Клієнт для API
├── 🌐 cloudflare-tunnel.js ← Налаштування туннелю
├── 📁 img/                 ← Картинки
│   ├── civitai.png
│   ├── discord.png
│   └── server.png
└── 📁 server/
    └── Google_Colab_Backend_FIXED.ipynb  ← **Цей файл!**
```

### Що робить кожна частина?

| Файл | Що робить |
|------|-----------|
| `index.html` | Показує інтерфейс користувача |
| `script.js` | Обробляє натискання кнопок, drag-n-drop |
| `sd-api-client.js` | Говорить з API Stable Diffusion |
| `cloudflare-tunnel.js` | Налаштовує з'єднання через туннель |
| `Google_Colab_Backend_FIXED.ipynb` | Запускає WebUI на GPU |

---

## 📱 Як це працює?

```
┌─────────────────────────────────────────┐
│  Твій браузер (GitHub Pages сайт)      │
│  https://username.github.io/poyo_test  │
│                                        │
│  Користувач:                           │
│  • Пише prompt: "cat playing guitar"   │
│  • Натискає кнопку "Generate"         │
│  • Чекає результат                     │
└──────────────┬──────────────────────────┘
               │
               │ HTTPS запит
               │ (через Cloudflare)
               ▼
┌──────────────────────────────┐
│ Cloudflare Tunnel            │
│ (перенаправляє запити)       │
│                              │
│ URL: xxxx.trycloudflare.com  │
└──────────────┬───────────────┘
               │
               │ localhost:7860
               ▼
┌──────────────────────────────────┐
│ Google Colab (твій backend)      │
│                                  │
│ Stable Diffusion WebUI           │
│ • Отримує prompt                 │
│ • Запускає модель на GPU         │
│ • Генерує зображення            │
│ • Повертає результат            │
└──────────────────────────────────┘
```

---

## 🆘 Потрібна допомога?

1. **Посилання на документацію:**
   - AUTOMATIC1111 WebUI: https://github.com/AUTOMATIC1111/stable-diffusion-webui
   - Cloudflare Tunnel: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/

2. **У коментарях напиши:**
   - Номер cell де проблема
   - Точна помилка (скопіюй весь текст)
   - Який runtime тип обраний

---

## 🎉 Після успішного запуску

Тепер у тебе є:

✅ **Власний Stable Diffusion генератор**
✅ **Метаедитор зображень** (view, edit, export metadata)  
✅ **LoRA датасет-крієйтор** (для тренування своїх моделей)
✅ **Discord-like інтерфейс** (красивий UI)
✅ **Публічний доступ** через Cloudflare (https)

**Можеш ділитися посиланням зі своїми друзями!** 🎨

---

**Made with ❤️ for AI generation enthusiasts**

Остання оновлення: November 2025
