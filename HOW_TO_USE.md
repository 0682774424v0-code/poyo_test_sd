# 📖 HOW TO USE - SETUP INSTRUCTIONS

## 🎯 Quick Summary

This project is a **Discord-like Stable Diffusion interface** that runs on Google Colab and is accessible via Cloudflare Tunnel.

### Components:
- **Frontend**: GitHub Pages (index.html + style.css + script.js)
- **Backend**: Google Colab Notebook (WebUI + GPU)
- **Tunnel**: Cloudflare Tunnel (public HTTPS access)

---

## 📋 STEP-BY-STEP SETUP

### Step 1: Download the Notebook

📥 **File to download**: `server/Google_Colab_Backend_FIXED.ipynb`

### Step 2: Open in Google Colab

1. Go to https://colab.research.google.com
2. **File** → **Upload notebook**
3. Select `Google_Colab_Backend_FIXED.ipynb`

### Step 3: Enable GPU (IMPORTANT!)

1. **Runtime** (top menu)
2. **Change runtime type**
3. **Hardware accelerator** → **T4 GPU**
4. Click **Save**

✅ You should see: `Tesla T4 GPU` on the right side

### Step 4: Run the 5 Cells in Order

```
Cell [1]: System Diagnostics
   ↓
Cell [2]: Cloudflared Installation  
   ↓
Cell [3]: WebUI Setup (takes 5-10 min)
   ↓
Cell [4]: Launch WebUI & Tunnel ⭐ COPY URL FROM HERE
   ↓
Cell [5]: Test API Connection
```

**⏰ Total time: ~15-20 minutes**

### Step 5: Copy the Tunnel URL

When **Cell [4]** finishes, you'll see:

```
🎉 SUCCESS! TUNNEL URL OBTAINED
======================================================================

🌐 Public URL: https://xxxx-yyyy-zzzz.trycloudflare.com
```

📋 **Copy this URL** (you'll need it next)

### Step 6: Configure Your GitHub Pages Site

1. Navigate to your GitHub Pages site (https://username.github.io/poyo_test_sd)
2. Click **⚙️ Settings** (gear icon, top right)
3. Find the input field: **"Cloudflared Tunnel URL"**
4. Paste the URL from Step 5
5. Click **"Test Connection"**

✅ If you see a **green checkmark**, you're connected!

### Step 7: Start Generating!

1. Go back to your site
2. Click the **#txt2img** channel
3. Enter a prompt (e.g., "a cat playing guitar, digital art")
4. Click **Generate**
5. Wait for the image to appear (30-120 seconds depending on settings)

---

## ⚙️ Configuration Details

### API Connection Settings

The frontend automatically detects the tunnel URL from the HTML settings field.

In `index.html`, the settings tab contains:
```html
<input type="text" id="sd-api-url" 
       placeholder="https://xxxx.trycloudflare.com">
```

This URL is sent to:
- `sd-api-client.js` - handles API communication
- `stable-diffusion-api.js` - API wrapper methods

### Supported Models

The notebook will work with any checkpoint compatible with AUTOMATIC1111's WebUI:
- Stable Diffusion 1.5
- Stable Diffusion 2.1
- Custom fine-tuned models
- DreamBooth trained models

Models should be placed in `models/Stable-diffusion/` folder in the WebUI.

### LoRA Support

The frontend has built-in support for LoRA models:
1. Upload LoRA files to the WebUI
2. Use syntax in prompt: `<lora:model_name:1.0>`
3. The API will apply the LoRA during generation

---

## 🔍 Troubleshooting

### "cloudflared not found" Error

**Solution:**
1. Run **Cell [2]** again
2. If still fails, try updating apt: `!sudo apt-get update -y`
3. Restart the Colab runtime: **Runtime** → **Restart runtime**

### "Cannot reach local API" Error

**Solution:**
1. Wait 2-3 minutes for WebUI to fully initialize
2. Run **Cell [5]** again to test
3. Check if **Cell [1]** shows GPU available

### Tunnel URL not appearing in Cell [4]

**Solution:**
1. Wait longer (up to 20 seconds)
2. Check Cell [4] output carefully - URL might be there
3. Look for line with `https://` pattern
4. If still nothing: restart Colab and run all cells again

### "Connection Failed" on GitHub Pages

**Solution:**
1. Verify the URL is correct (no typos)
2. Check that Colab notebook is still running
3. Make sure GPU is still in use (check Colab right sidebar)
4. Refresh the page (F5)

### WebUI is very slow

**Solution:**
1. Reduce image resolution (512x512 instead of 768x768)
2. Reduce number of steps (20 instead of 50)
3. Disable TensorRT or other optimizations
4. Check if other heavy processes are running

---

## 📊 Frontend Features

### Metadata Image Editor
- **View**: Extract and display image metadata (prompts, parameters)
- **Edit**: Modify metadata and re-export images
- **Supports**: PNG, JPG, JPEG, WebP

### LoRA Dataset Creator
- **Upload**: Multiple images or ZIP files
- **Tag**: Organize images with wildcards and custom tags
- **Export**: Download as ZIP with text files for training

### Stable Diffusion Generation
- **txt2img**: Text-to-image generation
- **img2img**: Image variation/modification
- **inpaint**: Selective area regeneration
- **Settings**: Model, sampler, CFG, steps, etc.

---

## 🔐 Security Notes

### Is it safe to share the tunnel URL?

⚠️ **Important**: The tunnel URL provides access to your WebUI.

Anyone with this URL can:
- ✅ Generate unlimited images
- ✅ Download generated images
- ⚠️ See your configured models
- ❌ Cannot delete models (read-only API)
- ❌ Cannot access system files

**Recommendation**: Share the URL only with trusted people.

If you want to restrict access, consider:
1. Adding authentication (requires code changes)
2. Using a different Cloudflare Workers rule
3. Terminating the tunnel after use

### What about API keys?

The API key input fields in Settings are for:
- CivitAI API (model downloads)
- HuggingFace Token (model access)

These are **stored locally in your browser** - never sent to servers.

---

## 📈 Advanced Usage

### Custom Models

To use custom Stable Diffusion models:

1. In Colab, mount Google Drive:
```python
from google.colab import drive
drive.mount('/content/drive')
```

2. Copy model to WebUI:
```bash
cp /content/drive/My\ Drive/model.safetensors /root/stable-diffusion-webui/models/Stable-diffusion/
```

3. Refresh models in Settings tab
4. Select from dropdown

### Batch Generation

To generate multiple images in one request:
1. Set "Batch Count" = 2-4
2. Set "Batch Size" = 1 (usually)
3. Click Generate
4. All images will be generated sequentially

### Using NSFW Filter

The WebUI has built-in NSFW detection. To disable:
```python
# In Colab cell, before running WebUI:
import os
os.environ['DISABLE_NSFW'] = '1'
```

---

## 📚 File Structure

```
poyo_test_sd/
├── index.html                    # Main UI page
├── style.css                     # Styling (Discord-like theme)
├── script.js                     # Main logic (3000+ lines)
│   ├── MetadataParser            # PNG/JPG/WebP metadata extraction
│   ├── DashboardRenderer         # Display rendering
│   ├── ImageMetadataEditor       # Image editing
│   ├── DatasetCreator            # LoRA dataset creation
│   └── More...
│
├── sd-api-client.js              # Stable Diffusion API wrapper
├── cloudflare-tunnel.js          # Tunnel configuration
├── stable-diffusion-api.js       # High-level API methods
│
├── server/
│   └── Google_Colab_Backend_FIXED.ipynb  # Run this to start backend
│
├── img/                          # Icons
│   ├── civitai.png
│   ├── discord.png
│   └── server.png
│
└── README.md (this file)
```

---

## 🐛 Known Issues & Limitations

1. **Google Colab 12-hour timeout**
   - Sessions auto-terminate after 12 hours
   - You'll need to restart the notebook
   - (Free tier limitation)

2. **Cloudflare Tunnel is temporary**
   - URLs are temporary and change each session
   - You'll need to update GitHub Pages settings after restart
   - (Free tier limitation)

3. **Memory limits**
   - T4 GPU has ~15GB VRAM
   - Very large models (7GB+) may not fit
   - Consider using quantized models

4. **Speed**
   - First generation is slow (model loading)
   - Subsequent generations are faster
   - Consider using smaller models for faster inference

---

## 🚀 Future Improvements

- [ ] Persistent storage for models (Google Drive integration)
- [ ] Authentication/authorization system
- [ ] Queue system for multiple users
- [ ] WebSocket support for real-time progress
- [ ] Image history storage
- [ ] Advanced settings UI
- [ ] Model marketplace integration

---

## 📞 Support

If you encounter issues:

1. **Check the troubleshooting section above**
2. **Review Colab cell output carefully** (error messages are helpful)
3. **Check your internet connection** (Colab needs stable connection)
4. **Try restarting**: Runtime → Restart runtime
5. **Last resort**: Start fresh with a new Colab session

---

## 📄 License & Attribution

**Frontend UI**: Inspired by Discord's design
**Backend**: AUTOMATIC1111 Stable Diffusion WebUI
**Tunnel**: Cloudflare Tunnel (free tier)
**Frontend Code**: Original modifications for your use case

---

**Last Updated**: November 2025
**Version**: 3.0 (FIXED with proper diagnostics)
