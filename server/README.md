# 🎨 Stable Diffusion Backend Server

Complete Flask API server for Stable Diffusion with text-to-image, image-to-image, and inpainting support.

**Optimized for Google Colab with low VRAM GPU**

## 📋 Contents

```
server/
├── app.py                      # Main Flask application
├── config.py                   # Configuration settings
├── colab_setup.py             # Colab setup helper
├── requirements.txt           # Python dependencies
├── Google_Colab_Backend.ipynb # Google Colab notebook
└── README.md                  # This file
```

## 🚀 Quick Start (Google Colab)

### Option 1: Use the Colab Notebook (RECOMMENDED)

1. Upload the `server` folder to Google Drive
2. Open `Google_Colab_Backend.ipynb` in Google Colab
3. Run cells sequentially (Steps 1-5)
4. Copy the Cloudflared tunnel URL
5. Paste in your frontend app settings

### Option 2: Manual Setup

1. Upload all server files to Colab Files
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Install Cloudflared:
   ```bash
   wget https://github.com/cloudflare/wrangler/releases/download/wrangler-3.0.1/cloudflared-linux-amd64.deb -O /tmp/cloudflared.deb
   dpkg -i /tmp/cloudflared.deb
   ```

4. Setup environment:
   ```bash
   export PYTORCH_CUDA_ALLOC_CONF=expandable_segments:True
   export CUDA_LAUNCH_BLOCKING=1
   ```

5. Run the server:
   ```bash
   python app.py &                           # Start Flask
   cloudflared tunnel --url http://localhost:5000  # Start tunnel
   ```

## ⚙️ Configuration

Edit `config.py` to customize:

### Model Settings
```python
MODEL_ID = "runwayml/stable-diffusion-v1-5"  # Change model
USE_SAFETENSORS = True
ENABLE_XFORMERS = True         # Memory optimization
ENABLE_ATTENTION_SLICING = True
ENABLE_VAE_TILING = True
ENABLE_MODEL_CPU_OFFLOAD = True
```

### Generation Defaults
```python
DEFAULT_STEPS = 20
DEFAULT_CFG_SCALE = 7.5
DEFAULT_WIDTH = 512
DEFAULT_HEIGHT = 512
MAX_BATCH_SIZE = 4
```

### Performance
```python
USE_FP16 = True                # Float16 (saves 50% memory)
CLEAR_CACHE_AFTER_GENERATION = True
```

## 🔌 API Endpoints

### Health Check
```bash
GET /api/health
```

Response:
```json
{
  "status": "healthy",
  "gpu_available": true,
  "device": "cuda",
  "pipelines_loaded": true
}
```

### Text to Image
```bash
POST /api/txt2img
Content-Type: application/json

{
  "prompt": "a beautiful landscape",
  "negative_prompt": "ugly, blurry",
  "steps": 20,
  "cfg_scale": 7.5,
  "width": 512,
  "height": 512,
  "seed": -1,
  "batch_size": 1
}
```

Response:
```json
{
  "success": true,
  "images": ["data:image/png;base64,..."],
  "duration": 12.5
}
```

### Image to Image
```bash
POST /api/img2img

{
  "prompt": "make it more colorful",
  "image": "data:image/png;base64,...",
  "strength": 0.8,
  "steps": 20,
  "cfg_scale": 7.5,
  "seed": -1,
  "batch_size": 1
}
```

### Inpainting
```bash
POST /api/inpaint

{
  "prompt": "fill with a beautiful sky",
  "image": "data:image/png;base64,...",
  "mask": "data:image/png;base64,...",
  "strength": 0.8,
  "steps": 20,
  "cfg_scale": 7.5,
  "seed": -1,
  "batch_size": 1
}
```

### Get Progress
```bash
GET /api/progress
```

Response:
```json
{
  "is_generating": false,
  "current_prompt": "",
  "elapsed": 0
}
```

### Interrupt Generation
```bash
POST /api/interrupt
```

### System Info
```bash
GET /api/system
```

### Memory Status
```bash
GET /api/memory
```

## 🔒 Connecting from Frontend

Your frontend app connects via the Cloudflared tunnel URL:

```javascript
// Example in your frontend
const API_URL = "https://xxx.trycloudflare.com"; // From Colab

async function generateImage(prompt) {
  const response = await fetch(API_URL + "/api/txt2img", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt: prompt,
      steps: 20,
      cfg_scale: 7.5,
      width: 512,
      height: 512
    })
  });
  
  const data = await response.json();
  if (data.success) {
    return data.images[0]; // Base64 encoded PNG
  }
}
```

## 💾 Memory Optimization Tips

### For Google Colab T4 GPU (15GB):

1. **Use FP16** (enabled by default) - 50% memory reduction
2. **Enable attention slicing** - Trade speed for memory
3. **Enable VAE tiling** - Process images in tiles
4. **Enable model CPU offload** - Move unused models to CPU
5. **Reduce batch size** - Use `batch_size: 1`
6. **Reduce steps** - Use 15-25 instead of 50
7. **Clear cache** - Automatic after each generation

### If Still Getting OOM:

1. Reduce image size to 384x384
2. Set `ENABLE_SEQUENTIAL_CPU_OFFLOAD = True`
3. Use a smaller model: `runwayml/stable-diffusion-v1-5`
4. Switch to 8-bit quantization (modify config)

## 🐛 Troubleshooting

### CUDA Out of Memory
```
Error: CUDA out of memory. Tried to allocate 20.00 MiB.
```

**Solutions:**
- Reduce steps: 20 → 15
- Reduce batch_size: 2 → 1
- Reduce image size: 512x512 → 384x384
- Check if other processes use GPU

### Cloudflared Won't Start
```
Error: cloudflared tunnel failed
```

**Solutions:**
- Check internet connection
- Verify cloudflared installation: `which cloudflared`
- Try manual install: `dpkg -i /tmp/cloudflared.deb`

### Flask Won't Start
```
Error: Address already in use
```

**Solutions:**
```bash
# Find process on port 5000
lsof -i :5000

# Kill it
kill -9 <PID>

# Or use different port in config.py
FLASK_PORT = 5001
```

### Model Won't Load
```
Error: Cannot find model
```

**Solutions:**
- First run downloads model (can take 5+ minutes)
- Check internet connection
- Increase timeout in config
- Use pre-cached model from Hugging Face

## 📊 Performance Metrics

On Google Colab T4 GPU:

| Task | Size | Steps | Time |
|------|------|-------|------|
| txt2img | 512x512 | 20 | ~12s |
| txt2img | 512x512 | 50 | ~30s |
| img2img | 512x512 | 20 | ~12s |
| inpaint | 512x512 | 20 | ~12s |

*Times vary based on GPU load and model*

## 🔧 Advanced Configuration

### Using Different Models

Edit `config.py`:
```python
# SD 1.5
MODEL_ID = "runwayml/stable-diffusion-v1-5"

# SD 2.1
MODEL_ID = "stabilityai/stable-diffusion-2-1"

# SDXL (needs more VRAM)
MODEL_ID = "stabilityai/stable-diffusion-xl-base-1.0"

# Custom models from CivitAI
MODEL_ID = "username/model-name"
```

### Custom Safety Checker

Replace `safety_checker=None` in `app.py` with custom logic:

```python
def custom_safety_checker(images, **kwargs):
    # Your safety checks here
    return images, [False] * len(images)

pipeline.safety_checker = custom_safety_checker
```

### Quantization (8-bit)

For even lower memory usage:

```python
from transformers import AutoModelForCausalLM, BitsAndBytesConfig

quantization_config = BitsAndBytesConfig(
    load_in_8bit=True,
    llm_int8_threshold=6.0,
)

# In pipeline loading:
pipeline = StableDiffusionPipeline.from_pretrained(
    MODEL_ID,
    quantization_config=quantization_config
)
```

## 📝 Logs and Debugging

Server logs appear in:
- Colab: Cell output (Step 5)
- Local: Console output

Log levels:
- `DEBUG` - Detailed info
- `INFO` - General info (default)
- `WARNING` - Warnings
- `ERROR` - Errors

To increase logging, modify in `app.py`:
```python
logging.basicConfig(level=logging.DEBUG)
```

## 🌐 Cloudflared Tunnel

The tunnel makes your Colab server publicly accessible via HTTPS:

```
Local Server: http://localhost:5000
Public URL: https://xxx.trycloudflare.com
```

**Security:**
- Connection is encrypted (HTTPS)
- URL is temporary (changes each session)
- Only you can use it unless you share the URL
- No port forwarding needed

**Limitations:**
- URL changes each Colab session
- Slower than local (slight latency)
- Bandwidth limited by Cloudflare free plan

## 📚 Integration with Frontend

Your HTML/CSS/JS frontend on GitHub Pages or locally:

1. Detect API URL (Colab server)
2. Send requests to `/api/txt2img`, `/api/img2img`, `/api/inpaint`
3. Receive base64 images
4. Display in `<img>` tag or canvas

Example integration in `script.js`:
```javascript
const API_BASE_URL = localStorage.getItem('apiUrl') || 'http://localhost:5000';

async function apiRequest(endpoint, data) {
  const response = await fetch(`${API_BASE_URL}/api/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    mode: 'cors'
  });
  
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  return response.json();
}

// Usage
const result = await apiRequest('txt2img', {
  prompt: 'a cat',
  steps: 20
});

if (result.success) {
  document.querySelector('img').src = result.images[0];
}
```

## 🎯 Next Steps

1. ✅ Run the Google Colab notebook
2. ✅ Get the tunnel URL
3. ✅ Configure your frontend
4. ✅ Test connection
5. ✅ Generate images!

## 📞 Support

For issues:
1. Check troubleshooting section above
2. Check Colab notebook output for errors
3. Verify all files are in `/content/server/`
4. Check memory usage with `GET /api/memory`
5. Test API with `GET /api/health`

## 📜 License

Uses Stable Diffusion models (licensed under OpenRAIL License).
See https://huggingface.co/runwayml/stable-diffusion-v1-5 for details.

---

**Happy generating! 🎨**
