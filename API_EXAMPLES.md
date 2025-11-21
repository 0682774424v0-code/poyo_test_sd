# Примеры использования Stable Diffusion API через GitHub Pages

## Инициализация

```javascript
// Инициализировать API с URL туннеля
const apiUrl = localStorage.getItem('sd_tunnel_url');
const sdApi = new StableDiffusionAPI(apiUrl);

// Или использовать глобальный метод
initializeSDAPI(apiUrl);
const sdApi = getSDAPI();
```

## Примеры

### 1. Проверка соединения

```javascript
// Простая проверка доступности
const isConnected = await sdApi.ping();
console.log('Connected:', isConnected);

// Получить конфигурацию сервера
const config = await sdApi.getConfig();
console.log('Server config:', config);
```

### 2. Получение списка моделей

```javascript
// Получить доступные модели
const models = await sdApi.getModels();
models.forEach(model => {
    console.log(`Model: ${model.model_name} (${model.hash})`);
});

// Установить активную модель
await sdApi.setModel('sd-v1-5.ckpt');
```

### 3. Генерирование изображения (txt2img)

```javascript
const result = await sdApi.generateImage({
    prompt: 'a beautiful landscape with mountains',
    negative_prompt: 'ugly, blurry',
    steps: 30,
    cfg_scale: 7.5,
    width: 768,
    height: 512,
    sampler: 'DPM++ 2M Karras',
    seed: 12345
});

if (result.success) {
    // result.images содержит base64-кодированные изображения
    const img = new Image();
    img.src = result.images[0];
    document.body.appendChild(img);
}
```

### 4. Обработка прогресса

```javascript
// Получить информацию о прогрессе генерирования
async function checkProgress() {
    const progress = await sdApi.getProgress();
    console.log(`Progress: ${(progress.progress * 100).toFixed(0)}%`);
    console.log(`ETA: ${progress.eta_relative.toFixed(1)}s`);
}

// Периодически проверять прогресс
const interval = setInterval(checkProgress, 500);
// clearInterval(interval); // Для остановки
```

### 5. Генерирование изображения из изображения (img2img)

```javascript
// Загрузить изображение
const file = document.getElementById('imageInput').files[0];
const reader = new FileReader();

reader.onload = async (e) => {
    const base64Image = e.target.result.split(',')[1];
    
    const result = await sdApi.generateImageFromImage(base64Image, {
        prompt: 'make it more vibrant',
        negative_prompt: 'dull, gray',
        denoising_strength: 0.75,
        steps: 20
    });
    
    if (result.success) {
        console.log('Generated:', result.images[0]);
    }
};

reader.readAsDataURL(file);
```

### 6. Работа с LoRA

```javascript
// Получить доступные LoRA
const loras = await sdApi.getLoRAs();
loras.forEach(lora => {
    console.log(`LoRA: ${lora.name} - ${lora.path}`);
});

// Использовать LoRA в промпте
const result = await sdApi.generateImage({
    prompt: 'a beautiful girl <lora:chilloutmix:0.8>',
    // ... остальные параметры
});
```

### 7. Работа с VAE

```javascript
// Получить доступные VAE
const vaes = await sdApi.getVAEs();
vaes.forEach(vae => {
    console.log(`VAE: ${vae}`);
});

// Установить активный VAE
await sdApi.setVAE('vae-mse-840000-ema-pruned.ckpt');
```

### 8. Список сампліршів

```javascript
// Получить доступные сампліры
const samplers = await sdApi.getSamplers();
samplers.forEach(sampler => {
    console.log(`Sampler: ${sampler.name} - ${sampler.aliases.join(', ')}`);
});

// Использовать в запросе
const result = await sdApi.generateImage({
    prompt: 'a cat',
    sampler: 'DPM++ SDE Karras', // Используйте имя из списка
    // ... остальные параметры
});
```

## Интеграция в HTML

```html
<!-- Добавить загрузчик файлов -->
<input type="file" id="imageInput" accept="image/*">

<!-- Добавить область для результатов -->
<div id="results"></div>

<script>
// Инициализировать при загрузке страницы
window.addEventListener('DOMContentLoaded', async () => {
    const apiUrl = localStorage.getItem('sd_tunnel_url');
    if (!apiUrl) {
        console.error('API URL не установлен в настройках');
        return;
    }
    
    const sdApi = new StableDiffusionAPI(apiUrl);
    
    // Проверить соединение
    const connected = await sdApi.ping();
    console.log('API Connected:', connected);
    
    // Загрузить модели
    try {
        const models = await sdApi.getModels();
        console.log('Available models:', models);
    } catch (error) {
        console.error('Error loading models:', error);
    }
});
</script>
```

## Обработка ошибок

```javascript
try {
    const result = await sdApi.generateImage({
        prompt: 'a cat',
        steps: 20
    });
} catch (error) {
    if (error.message.includes('timeout')) {
        console.error('Запрос истек - генерирование заняло слишком много времени');
    } else if (error.message.includes('HTTP 500')) {
        console.error('Ошибка сервера - проверьте логи Stable Diffusion');
    } else {
        console.error('Ошибка:', error.message);
    }
}
```

## Tips & Tricks

### 1. Используйте параллельные запросы

```javascript
// Сгенерировать несколько батчей одновременно
const results = await Promise.all([
    sdApi.generateImage({ prompt: 'cat', ...opts }),
    sdApi.generateImage({ prompt: 'dog', ...opts }),
    sdApi.generateImage({ prompt: 'bird', ...opts })
]);
```

### 2. Сохраняйте избранные настройки

```javascript
// Сохранить параметры в localStorage
const params = {
    prompt: 'my favorite prompt',
    steps: 25,
    cfg_scale: 7.5,
    width: 512,
    height: 512
};

localStorage.setItem('sd_params', JSON.stringify(params));

// Загрузить позже
const saved = JSON.parse(localStorage.getItem('sd_params'));
const result = await sdApi.generateImage(saved);
```

### 3. Обновляйте список моделей

```javascript
// Периодически обновлять доступные модели
async function updateAvailableModels() {
    try {
        await sdApi.refreshModels();
        const models = await sdApi.getModels();
        console.log('Models refreshed:', models.length);
    } catch (error) {
        console.error('Error refreshing models:', error);
    }
}

// Обновить каждые 5 минут
setInterval(updateAvailableModels, 5 * 60 * 1000);
```

### 4. Отслеживание прогресса в реальном времени

```javascript
async function generateWithProgress(options) {
    console.log('Starting generation...');
    
    // Запустить запрос (не ждем ответа сразу)
    const generatePromise = sdApi.generateImage(options);
    
    // Отслеживать прогресс
    const progressInterval = setInterval(async () => {
        try {
            const progress = await sdApi.getProgress();
            console.log(`${(progress.progress * 100).toFixed(0)}% - ETA: ${progress.eta_relative.toFixed(1)}s`);
        } catch (error) {
            console.error('Error checking progress:', error);
        }
    }, 500);
    
    // Дождаться результата
    const result = await generatePromise;
    clearInterval(progressInterval);
    
    console.log('Generation complete!');
    return result;
}
```

## Тестирование API

```bash
# Проверить доступность API
curl https://YOUR_TUNNEL_URL/config

# Получить список моделей
curl https://YOUR_TUNNEL_URL/sdapi/v1/sd-models

# Получить список сампліров
curl https://YOUR_TUNNEL_URL/sdapi/v1/samplers

# Генерировать изображение (пример)
curl -X POST https://YOUR_TUNNEL_URL/sdapi/v1/txt2img \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "a cat",
    "negative_prompt": "ugly",
    "steps": 20,
    "cfg_scale": 7,
    "width": 512,
    "height": 512
  }'
```

## Документация

- [Stable Diffusion WebUI API](https://github.com/AUTOMATIC1111/stable-diffusion-webui/wiki/API)
- [SD API Reference](https://github.com/AUTOMATIC1111/stable-diffusion-webui-docs/wiki/Features#api)

---

**Удачи в работе с API! 🚀**
