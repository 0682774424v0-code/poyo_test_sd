/**
 * Stable Diffusion API Client
 * Connects to Stable Diffusion WebUI via Cloudflared tunnel
 */

class StableDiffusionAPI {
    constructor(baseURL = null) {
        this.baseURL = baseURL || localStorage.getItem('sd_api_url') || '';
        this.civitaiKey = localStorage.getItem('civitai_key') || '';
        this.hfToken = localStorage.getItem('hf_token') || '';
        this.isConnected = false;
        this.defaultModel = null;
        this.models = [];
        this.samplers = [];
        this.loras = [];
    }

    setBaseURL(url) {
        this.baseURL = url;
        localStorage.setItem('sd_api_url', url);
    }

    setCivitaiKey(key) {
        this.civitaiKey = key;
        localStorage.setItem('civitai_key', key);
    }

    setHuggingFaceToken(token) {
        this.hfToken = token;
        localStorage.setItem('hf_token', token);
    }

    async testConnection() {
        if (!this.baseURL) return false;
        try {
            const response = await fetch(`${this.baseURL}/sdapi/v1/progress`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            this.isConnected = response.ok;
            return this.isConnected;
        } catch (err) {
            console.error('Connection test failed:', err);
            this.isConnected = false;
            return false;
        }
    }

    async getModels() {
        if (!this.baseURL) return [];
        try {
            const response = await fetch(`${this.baseURL}/sdapi/v1/sd-models`);
            if (!response.ok) throw new Error('Failed to fetch models');
            const models = await response.json();
            this.models = models.map(m => m.model_name || m.title || m);
            return this.models;
        } catch (err) {
            console.error('Error fetching models:', err);
            return [];
        }
    }

    async getSamplers() {
        if (!this.baseURL) return [];
        try {
            const response = await fetch(`${this.baseURL}/sdapi/v1/samplers`);
            if (!response.ok) throw new Error('Failed to fetch samplers');
            const samplers = await response.json();
            this.samplers = samplers.map(s => s.name);
            return this.samplers;
        } catch (err) {
            console.error('Error fetching samplers:', err);
            return [];
        }
    }

    async getLoras() {
        if (!this.baseURL) return [];
        try {
            const response = await fetch(`${this.baseURL}/sdapi/v1/loras`);
            if (!response.ok) throw new Error('Failed to fetch LoRAs');
            const loras = await response.json();
            this.loras = loras.map(l => ({
                name: l.name,
                filename: l.filename,
                alias: l.alias || l.name
            }));
            return this.loras;
        } catch (err) {
            console.error('Error fetching LoRAs:', err);
            return [];
        }
    }

    async txt2img(params) {
        if (!this.baseURL) throw new Error('API URL not configured');
        try {
            const response = await fetch(`${this.baseURL}/sdapi/v1/txt2img`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(params)
            });
            if (!response.ok) throw new Error(`API error: ${response.statusText}`);
            return await response.json();
        } catch (err) {
            console.error('txt2img error:', err);
            throw err;
        }
    }

    async img2img(params, imageBase64) {
        if (!this.baseURL) throw new Error('API URL not configured');
        try {
            // Remove data URI prefix if present
            const cleanedImage = imageBase64.replace(/^data:image\/[^;]+;base64,/, '');
            const payload = {
                ...params,
                init_images: [cleanedImage]
            };
            
            const response = await fetch(`${this.baseURL}/sdapi/v1/img2img`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!response.ok) throw new Error(`API error: ${response.statusText}`);
            return await response.json();
        } catch (err) {
            console.error('img2img error:', err);
            throw err;
        }
    }

    async inpaint(params, imageBase64, maskBase64) {
        if (!this.baseURL) throw new Error('API URL not configured');
        try {
            const cleanedImage = imageBase64.replace(/^data:image\/[^;]+;base64,/, '');
            const cleanedMask = maskBase64.replace(/^data:image\/[^;]+;base64,/, '');
            
            const payload = {
                ...params,
                init_images: [cleanedImage],
                mask: cleanedMask,
                inpaint_full_res: params.inpaint_area === 'Only masked'
            };
            
            const response = await fetch(`${this.baseURL}/sdapi/v1/img2img`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!response.ok) throw new Error(`API error: ${response.statusText}`);
            return await response.json();
        } catch (err) {
            console.error('inpaint error:', err);
            throw err;
        }
    }

    async getProgress() {
        if (!this.baseURL) return { progress: 0, eta_relative: 0 };
        try {
            const response = await fetch(`${this.baseURL}/sdapi/v1/progress`);
            if (!response.ok) return { progress: 0, eta_relative: 0 };
            return await response.json();
        } catch (err) {
            console.error('Error fetching progress:', err);
            return { progress: 0, eta_relative: 0 };
        }
    }

    async interrupt() {
        if (!this.baseURL) return false;
        try {
            const response = await fetch(`${this.baseURL}/sdapi/v1/interrupt`, {
                method: 'POST'
            });
            return response.ok;
        } catch (err) {
            console.error('Error interrupting generation:', err);
            return false;
        }
    }

    async downloadModelFromCivitAI(modelId) {
        if (!this.civitaiKey) throw new Error('CivitAI API key not set');
        // Implementation depends on backend support
        throw new Error('CivitAI download not yet implemented');
    }

    async downloadModelFromHuggingFace(repoId, filename) {
        if (!this.hfToken) throw new Error('HuggingFace token not set');
        // Implementation depends on backend support
        throw new Error('HuggingFace download not yet implemented');
    }
}

/**
 * Inpaint Canvas Handler
 */
class InpaintCanvas {
    constructor(canvasId, baseImageUrl = null) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) throw new Error(`Canvas element ${canvasId} not found`);
        
        this.ctx = this.canvas.getContext('2d');
        this.isDrawing = false;
        this.tool = 'brush'; // brush or eraser
        this.brushSize = 20;
        this.baseImage = null;
        
        // Initialize with transparent background
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.setupEventListeners();
        
        if (baseImageUrl) {
            this.loadImage(baseImageUrl);
        }
    }

    setupEventListeners() {
        // Mouse events
        this.canvas.addEventListener('mousedown', (e) => this.startDrawing(e));
        this.canvas.addEventListener('mousemove', (e) => this.draw(e));
        this.canvas.addEventListener('mouseup', () => this.stopDrawing());
        this.canvas.addEventListener('mouseleave', () => this.stopDrawing());

        // Touch events
        this.canvas.addEventListener('touchstart', (e) => this.startDrawing(e));
        this.canvas.addEventListener('touchmove', (e) => this.draw(e));
        this.canvas.addEventListener('touchend', () => this.stopDrawing());
    }

    startDrawing(e) {
        this.isDrawing = true;
        const rect = this.canvas.getBoundingClientRect();
        const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
        const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;
        
        if (this.tool === 'brush') {
            this.drawBrush(x, y);
        } else if (this.tool === 'eraser') {
            this.erase(x, y);
        }
    }

    draw(e) {
        if (!this.isDrawing) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
        const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;
        
        if (this.tool === 'brush') {
            this.drawBrush(x, y);
        } else if (this.tool === 'eraser') {
            this.erase(x, y);
        }
    }

    stopDrawing() {
        this.isDrawing = false;
    }

    drawBrush(x, y) {
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.beginPath();
        this.ctx.arc(x, y, this.brushSize / 2, 0, Math.PI * 2);
        this.ctx.fill();
    }

    erase(x, y) {
        this.ctx.clearRect(x - this.brushSize / 2, y - this.brushSize / 2, this.brushSize, this.brushSize);
    }

    clear() {
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    setTool(tool) {
        this.tool = tool; // 'brush' or 'eraser'
    }

    setBrushSize(size) {
        this.brushSize = parseInt(size);
    }

    loadImage(imageUrl) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                this.baseImage = img;
                // Don't draw it yet - just store reference
                resolve();
            };
            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = imageUrl;
        });
    }

    getMaskBase64() {
        return this.canvas.toDataURL('image/png');
    }

    getBaseImageBase64() {
        if (!this.baseImage) return null;
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = this.baseImage.width;
        tempCanvas.height = this.baseImage.height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(this.baseImage, 0, 0);
        return tempCanvas.toDataURL('image/png');
    }
}

// Export for use
window.StableDiffusionAPI = StableDiffusionAPI;
window.InpaintCanvas = InpaintCanvas;
