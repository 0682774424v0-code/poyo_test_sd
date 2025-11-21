# Stable Diffusion GUI Integration - Setup Guide

## Overview

This Discord-styled web application now includes a complete Stable Diffusion GUI with support for:
- **Text to Image (txt2img)**: Generate images from text prompts
- **Image to Image (img2img)**: Modify existing images
- **Inpainting**: Edit specific areas of images with mask painting
- **Settings**: API configuration, model management, and API key storage

## Architecture

### Frontend Components
1. **index.html**: New "Stable Diffusion" server with 4 channels in the sidebar
2. **stable-diffusion-api.js**: API client class for communicating with SD WebUI backend
3. **script.js**: UI logic for tabs, image generation, and progress tracking
4. **style.css**: Discord-styled components for all SD features

### Backend Requirements
- **Stable Diffusion WebUI** running on Google Colab or local machine
- **Cloudflared tunnel** for secure HTTPS connection
- **API enabled** in WebUI launch parameters

## Quick Start

### 1. Setup Stable Diffusion on Google Colab

Create a new Google Colab notebook and run these cells:

#### Cell 1: Install Dependencies
```python
!git clone https://github.com/AUTOMATIC1111/stable-diffusion-webui
%cd stable-diffusion-webui
!pip install -r requirements.txt
```

#### Cell 2: Download Cloudflared
```python
!wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64
!chmod +x cloudflared-linux-amd64
```

#### Cell 3: Start WebUI with API
```python
import subprocess
import threading
import time

def run_webui():
    subprocess.run([
        "python", "launch.py",
        "--api",
        "--cors-allow-origins=*",
        "--xformers",
        "--no-half-vae"
    ])

def run_tunnel():
    time.sleep(10)
    subprocess.run(["./cloudflared-linux-amd64", "tunnel", "--url", "http://localhost:7860"])

threading.Thread(target=run_webui, daemon=True).start()
threading.Thread(target=run_tunnel, daemon=True).start()

# Keep the cell running
import time
time.sleep(3600)
```

Wait for the output showing the cloudflared tunnel URL (looks like: `https://xxxx.trycloudflare.com`)

### 2. Configure the Web Application

1. Click the Stable Diffusion server (sparkles icon) in the left sidebar
2. Go to **#settings** channel
3. Enter the Cloudflared tunnel URL in the "API Configuration" section
4. Click "Test Connection" to verify connectivity
5. The page will automatically load available models, samplers, and LoRAs

### 3. Generate Images

#### Text to Image (#txt2img)
1. Enter your creative prompt
2. Optionally add a negative prompt (things to avoid)
3. Configure parameters:
   - **Model**: Select checkpoint (e.g., Stable Diffusion 1.5)
   - **Sampler**: Choose sampling method (DPM++, Euler a, etc.)
   - **Steps**: 20 is usually good (more = better quality but slower)
   - **CFG Scale**: 7 is default (higher = more adherent to prompt)
   - **Width/Height**: 512x512 is standard
   - **Seed**: -1 for random, or fixed number for reproducibility
4. Optionally select LoRAs and set their weights
5. Click "Generate" and wait for results

#### Image to Image (#img2img)
1. Drag and drop an image or click to upload
2. Enter your modification prompt
3. Set **Denoising Strength** (0.75 is typical):
   - Lower = closer to original image
   - Higher = more variation
4. Click "Generate"

#### Inpainting (#inpaint)
1. Upload an image
2. The canvas will appear - draw on it to create a mask:
   - **Brush**: Paint white areas to regenerate
   - **Eraser**: Remove mask areas
   - **Brush Size**: Adjust with slider
3. Enter your prompt for what to generate
4. Set parameters:
   - **Mask Blur**: Smooth mask edges (0-64)
   - **Inpaint Area**: "Whole picture" or "Only masked"
5. Click "Generate"

### 4. Model Management (Settings)

#### Add LoRAs and Checkpoints
- Models can be downloaded from:
  - **CivitAI** (civitai.com) - Requires CivitAI API key
  - **HuggingFace** (huggingface.co) - Requires HuggingFace token

Store your API keys in the settings tab - they're saved to browser localStorage.

## Features

### Storage & Persistence
- **API URL**: Saved in localStorage
- **API Keys**: CivitAI and HuggingFace tokens saved securely
- **Parameters**: Can be configured per generation
- **Images**: Downloaded as PNG files with metadata

### Real-time Feedback
- **Progress bar**: Shows generation progress (0-100%)
- **Status indicator**: Green when connected, red when disconnected
- **Toast notifications**: Success/error messages for all operations
- **ETA display**: Estimated time remaining (if available from API)

### Compatibility
- **Works offline**: Set API URL and use immediately
- **No server needed**: Runs entirely in browser (except connection to SD backend)
- **localStorage safe**: Keys encrypted or use incognito mode if concerned

## API Endpoints Used

The application communicates with these Stable Diffusion WebUI API endpoints:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/sdapi/v1/txt2img` | POST | Text-to-image generation |
| `/sdapi/v1/img2img` | POST | Image-to-image modification |
| `/sdapi/v1/progress` | GET | Generation progress polling |
| `/sdapi/v1/interrupt` | POST | Stop current generation |
| `/sdapi/v1/sd-models` | GET | List available checkpoints |
| `/sdapi/v1/samplers` | GET | List available samplers |
| `/sdapi/v1/loras` | GET | List available LoRAs |

## Troubleshooting

### "Failed to connect" error
- Check that the Cloudflared tunnel is still running on Colab
- Verify the URL is correct (should be https://xxxx.trycloudflare.com)
- Ensure no typos in the URL
- Try refreshing the page

### Generation takes too long
- Reduce steps (20 is usually enough)
- Lower resolution (512x512 is faster than 768x768)
- Check Colab GPU usage (it might be throttled)

### Models/LoRAs not loading
- Re-test connection after adding new models to Colab
- Click "Test Connection" to refresh model list
- Ensure LoRAs are in the correct folder in WebUI

### Images not displaying
- Check browser console for errors (F12 → Console)
- Ensure CORS is enabled (`--cors-allow-origins=*`)
- Try a simpler prompt with fewer special characters

## Advanced Usage

### Parameter Presets
Save your favorite parameter combinations:
```javascript
// In browser console:
localStorage.setItem('sd-preset-anime', JSON.stringify({
    sampler: 'DPM++ 2M Karras',
    steps: 28,
    cfg: 7.5,
    width: 512,
    height: 768
}));
```

### Batch Generation
Use Batch Count to generate multiple images at once:
- **Batch Count**: 3 = Generate 3 different images
- **Batch Size**: 2 = Process 2 at a time (GPU memory dependent)

### Reproducible Results
Set a fixed seed to get the same image again:
- Random seed: -1
- Fixed seed: Use any number (e.g., 123)

## File Structure

```
Stable_Diffusion/
├── index.html                   # Main app with SD tabs
├── script.js                    # UI logic
├── style.css                    # Styling
├── stable-diffusion-api.js      # API client
├── SD_SETUP_GUIDE.md           # This file
└── img/
    ├── server.png
    ├── civitai.png
    ├── discord.png
```

## Security Notes

- **localStorage storage**: API keys stored in browser - use incognito/private mode if on shared computer
- **HTTPS required**: Cloudflared provides this automatically
- **CORS headers**: WebUI must be launched with `--cors-allow-origins=*`
- **No external servers**: All processing happens on your own infrastructure

## Browser Compatibility

- ✅ Chrome/Chromium (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Edge (latest)
- ⚠️ IE11 (not supported)

## Performance Tips

1. **GPU Memory**:
   - Reduce batch size if out of memory
   - Lower resolution for faster generation
   - Use `--medvram` or `--lowvram` in WebUI if needed

2. **Speed**:
   - DPM++ faster than Euler but similar quality
   - Heun is slower but produces better results
   - Start with 20 steps, increase if needed

3. **Quality**:
   - Higher CFG (10-15) for more detail
   - More steps (40+) for smoother results
   - Negative prompt helps avoid artifacts

## Keeping Existing Features

All existing functionality remains unchanged:
- ✅ Metadata viewer (#viewing)
- ✅ Metadata editor (#editing)
- ✅ Dataset creator (#dataset)
- ✅ LoRA metadata viewer (#lora-metadata)
- ✅ Reference popup
- ✅ Discord sidebar navigation

## Integrations

### With Existing Tools
- **Dataset Creator**: Generate training datasets for LoRA
- **Metadata Editor**: Edit generated image metadata before download
- **LoRA Metadata**: View info about LoRA files in generations

### Future Enhancements
- [ ] Favorite prompts history
- [ ] Parameter templates
- [ ] Image comparison (side-by-side)
- [ ] Batch CSV import for bulk generation
- [ ] Integration with dataset creator for auto-tagging

## Support & Issues

For issues with:
- **Web UI**: Check browser console (F12)
- **API connection**: Verify Colab notebook status
- **Generation errors**: Check Colab GPU availability
- **Models/LoRAs**: Ensure correct file paths in WebUI

## License

This integration is provided as-is for personal use with Stable Diffusion WebUI.

---

**Version**: 1.0  
**Last Updated**: November 2025  
**Tested With**: Stable Diffusion WebUI v1.6+, Python 3.10+
