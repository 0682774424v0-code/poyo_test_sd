/**
 * Stable Diffusion WebUI API Integration
 * Приклади та утиліти для роботи з API через Cloudflare Tunnel
 */

class StableDiffusionAPI {
    constructor(apiUrl) {
        this.apiUrl = apiUrl?.replace(/\/$/, ''); // Remove trailing slash
        this.timeout = 300000; // 5 minutes timeout for long requests
    }

    /**
     * Отримати список завантажених моделей
     */
    async getModels() {
        if (!this.apiUrl) throw new Error('API URL not configured');
        
        try {
            const response = await fetch(`${this.apiUrl}/sdapi/v1/sd-models`);
            if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
            return await response.json();
        } catch (error) {
            console.error('Error fetching models:', error);
            throw error;
        }
    }

    /**
     * Отримати список доступних сампліршів
     */
    async getSamplers() {
        if (!this.apiUrl) throw new Error('API URL not configured');
        
        try {
            const response = await fetch(`${this.apiUrl}/sdapi/v1/samplers`);
            if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
            return await response.json();
        } catch (error) {
            console.error('Error fetching samplers:', error);
            throw error;
        }
    }

    /**
     * Генерувати зображення з тексту (txt2img)
     */
    async generateImage(options = {}) {
        if (!this.apiUrl) throw new Error('API URL not configured');

        const payload = {
            prompt: options.prompt || '',
            negative_prompt: options.negative_prompt || '',
            steps: options.steps || 20,
            sampler_name: options.sampler || 'Euler',
            cfg_scale: options.cfg_scale || 7,
            width: options.width || 512,
            height: options.height || 512,
            seed: options.seed ?? -1,
            batch_size: options.batch_size || 1,
            n_iter: options.n_iter || 1,
            send_images: true,
            save_images: false,
            ...options
        };

        try {
            const response = await this._makeRequest(
                `${this.apiUrl}/sdapi/v1/txt2img`,
                'POST',
                payload
            );
            
            if (response.images && response.images.length > 0) {
                return {
                    success: true,
                    images: response.images.map(img => `data:image/png;base64,${img}`),
                    info: response.info
                };
            }
            throw new Error('No images generated');
        } catch (error) {
            console.error('Error generating image:', error);
            throw error;
        }
    }

    /**
     * Генерувати зображення з початкового зображення (img2img)
     */
    async generateImageFromImage(imageData, options = {}) {
        if (!this.apiUrl) throw new Error('API URL not configured');

        const payload = {
            init_images: [imageData],
            prompt: options.prompt || '',
            negative_prompt: options.negative_prompt || '',
            steps: options.steps || 20,
            sampler_name: options.sampler || 'Euler',
            cfg_scale: options.cfg_scale || 7,
            denoising_strength: options.denoising_strength || 0.75,
            seed: options.seed ?? -1,
            send_images: true,
            save_images: false,
            ...options
        };

        try {
            const response = await this._makeRequest(
                `${this.apiUrl}/sdapi/v1/img2img`,
                'POST',
                payload
            );
            
            if (response.images && response.images.length > 0) {
                return {
                    success: true,
                    images: response.images.map(img => `data:image/png;base64,${img}`),
                    info: response.info
                };
            }
            throw new Error('No images generated');
        } catch (error) {
            console.error('Error generating image from image:', error);
            throw error;
        }
    }

    /**
     * Отримати конфігурацію серверу
     */
    async getConfig() {
        if (!this.apiUrl) throw new Error('API URL not configured');
        
        try {
            const response = await fetch(`${this.apiUrl}/config`);
            if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
            return await response.json();
        } catch (error) {
            console.error('Error fetching config:', error);
            throw error;
        }
    }

    /**
     * Отримати статус прогресу
     */
    async getProgress() {
        if (!this.apiUrl) throw new Error('API URL not configured');
        
        try {
            const response = await fetch(`${this.apiUrl}/sdapi/v1/progress`);
            if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
            return await response.json();
        } catch (error) {
            console.error('Error fetching progress:', error);
            throw error;
        }
    }

    /**
     * Отримати список LoRA моделей
     */
    async getLoRAs() {
        if (!this.apiUrl) throw new Error('API URL not configured');
        
        try {
            const response = await fetch(`${this.apiUrl}/sdapi/v1/loras`);
            if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
            return await response.json();
        } catch (error) {
            console.error('Error fetching LoRAs:', error);
            throw error;
        }
    }

    /**
     * Отримати список VAE моделей
     */
    async getVAEs() {
        if (!this.apiUrl) throw new Error('API URL not configured');
        
        try {
            const response = await fetch(`${this.apiUrl}/sdapi/v1/vae`);
            if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
            return await response.json();
        } catch (error) {
            console.error('Error fetching VAEs:', error);
            throw error;
        }
    }

    /**
     * Встановити активну модель
     */
    async setModel(modelName) {
        if (!this.apiUrl) throw new Error('API URL not configured');
        
        const payload = {
            sd_model_checkpoint: modelName
        };

        try {
            return await this._makeRequest(
                `${this.apiUrl}/sdapi/v1/options`,
                'POST',
                payload
            );
        } catch (error) {
            console.error('Error setting model:', error);
            throw error;
        }
    }

    /**
     * Встановити активний VAE
     */
    async setVAE(vaeName) {
        if (!this.apiUrl) throw new Error('API URL not configured');
        
        const payload = {
            sd_vae: vaeName
        };

        try {
            return await this._makeRequest(
                `${this.apiUrl}/sdapi/v1/options`,
                'POST',
                payload
            );
        } catch (error) {
            console.error('Error setting VAE:', error);
            throw error;
        }
    }

    /**
     * Рефреш моделей (переганити список)
     */
    async refreshModels() {
        if (!this.apiUrl) throw new Error('API URL not configured');
        
        try {
            return await this._makeRequest(
                `${this.apiUrl}/sdapi/v1/refresh-checkpoints`,
                'POST',
                {}
            );
        } catch (error) {
            console.error('Error refreshing models:', error);
            throw error;
        }
    }

    /**
     * Проста перевірка з'єднання
     */
    async ping() {
        if (!this.apiUrl) return false;
        
        try {
            const response = await fetch(`${this.apiUrl}/sdapi/v1/sd-models`, {
                method: 'HEAD'
            });
            return response.ok;
        } catch (error) {
            return false;
        }
    }

    /**
     * Внутрішний метод для HTTP запитів з обробкою помилок
     */
    async _makeRequest(url, method = 'GET', body = null, timeout = this.timeout) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
            const options = {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                signal: controller.signal
            };

            if (body) {
                options.body = JSON.stringify(body);
            }

            const response = await fetch(url, options);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            // Деякі endpoints повертають пусто
            const text = await response.text();
            if (!text) return {};

            return JSON.parse(text);
        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error('Request timeout');
            }
            throw error;
        } finally {
            clearTimeout(timeoutId);
        }
    }
}

// Глобальний екземпляр API
let sdApi = null;

function initializeSDAPI(apiUrl) {
    sdApi = new StableDiffusionAPI(apiUrl);
    console.log('[SD API] Initialized with URL:', apiUrl);
    return sdApi;
}

function getSDAPI() {
    if (!sdApi) {
        const url = localStorage.getItem('sd_tunnel_url');
        if (url) {
            sdApi = new StableDiffusionAPI(url);
        }
    }
    return sdApi;
}

// Експортуємо для використання в інших скриптах
if (typeof window !== 'undefined') {
    window.StableDiffusionAPI = StableDiffusionAPI;
    window.initializeSDAPI = initializeSDAPI;
    window.getSDAPI = getSDAPI;
}
