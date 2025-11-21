# Troubleshooting Guide - Stable Diffusion GUI

## Connection Issues

### "Failed to connect" Error
**Symptoms**: Red status indicator, cannot test connection

**Solutions**:
1. ✓ Verify Colab notebook is still running
   - Open Colab tab
   - Check Cell 4 still has output
   - If not, restart it

2. ✓ Check the tunnel URL
   - Copy URL from Colab cell output
   - Paste in #settings → API Configuration
   - Ensure no spaces or typos

3. ✓ Use HTTPS, not HTTP
   - URL must start with `https://`
   - Not `http://`

4. ✓ Check firewall/network
   - Try from different network
   - Disable VPN if using one
   - Check antivirus isn't blocking

5. ✓ Refresh the page
   - F5 or Ctrl+Shift+R (hard refresh)
   - Clear browser cache if persists

### Connection Works, But Models Don't Load
**Symptoms**: Green status, but model dropdown empty

**Solutions**:
1. ✓ Restart model loading
   - Click "Test Connection" again
   - Wait 5-10 seconds

2. ✓ Ensure models exist in Colab
   - Check `/content/stable-diffusion-webui/models/Stable-diffusion/`
   - If empty, download a model (e.g., SD 1.5)

3. ✓ Models are downloading
   - Initial model download takes 5-10 minutes
   - Check Colab cell for download progress
   - Wait until "Model loaded" message appears

## Generation Issues

### Generation Hangs (No Progress)
**Symptoms**: Click generate, nothing happens for >2 minutes

**Solutions**:
1. ✓ Check Colab GPU status
   - Go to Colab → View GPU in browser dev tools
   - Or run `!nvidia-smi` in Colab

2. ✓ Generate timeout
   - WebUI default timeout is 120 seconds
   - For large images, generation might exceed this
   - Try smaller resolution (512x512)

3. ✓ Out of VRAM
   - Reduce batch size to 1
   - Lower resolution
   - Reduce steps to 15-20

4. ✓ Check Colab connection
   - Try navigating in Colab
   - If unresponsive, Colab may have disconnected
   - Restart the notebook

### "Out of VRAM" Error
**Symptoms**: Error message about GPU memory

**Solutions**:
1. ✓ Reduce generation size:
   - Width: 512 (from 768+)
   - Height: 512 (from 768+)
   - Steps: 15-20 (from 30+)

2. ✓ Reduce batch size:
   - Batch count: 1
   - Batch size: 1

3. ✓ Enable memory optimization in Colab:
   ```python
   # In Cell 4, modify the subprocess.run command:
   "--medvram",
   "--opt-split-attention",
   ```

4. ✓ Restart Colab
   - Sometimes memory leaks accumulate
   - Restart the notebook

### Images Are Blurry/Low Quality
**Symptoms**: Generated images look fuzzy or pixelated

**Solutions**:
1. ✓ Increase steps:
   - Try 30-40 instead of 20
   - Each step ~5-10% improvement

2. ✓ Increase CFG scale:
   - Try 10-12 instead of 7
   - But don't exceed 20 (creates artifacts)

3. ✓ Try different sampler:
   - Heun: Best quality but slow
   - DPM++ 2M: Good balance
   - Euler a: Fast but less detail

4. ✓ Better prompts:
   - More descriptive
   - Add style keywords (e.g., "trending on artstation")
   - Use negative prompts to remove unwanted elements

### Image Doesn't Match Prompt
**Symptoms**: Generated image ignores parts of the prompt

**Solutions**:
1. ✓ Reduce CFG scale:
   - Try 5-6 instead of 7
   - Current setting might be too rigid

2. ✓ Simplify prompt:
   - Too many conflicting elements confuse model
   - Break into secondary prompts with lower weight

3. ✓ Use negative prompt:
   - Add what NOT to include
   - Example: "blurry, low quality, distorted"

4. ✓ Try different model:
   - Some models better at certain styles
   - Chillout Mix → Realism
   - Anything v3 → Anime

### Generation Produces Same Image
**Symptoms**: Multiple generations look identical

**Solutions**:
1. ✓ Change the seed:
   - Set to -1 (random seed)
   - Or use different numbers

2. ✓ Increase variation:
   - Higher temperature (if supported)
   - Lower CFG scale
   - Try different sampler

## Image Upload Issues

### Can't Upload Image to img2img/inpaint
**Symptoms**: Drop zone doesn't accept files, or nothing happens

**Solutions**:
1. ✓ Check file format:
   - Supported: PNG, JPG, JPEG, WebP
   - Not supported: BMP, GIF, TIFF

2. ✓ Check file size:
   - Maximum typically ~50MB
   - For T4 GPU, images should be <512MB in memory

3. ✓ Try different browser:
   - Chrome/Firefox usually most reliable
   - Safari may have issues

4. ✓ Upload directly:
   - Don't drag-drop, click upload zone
   - Select file from file picker

## Inpainting Issues

### Canvas Not Appearing
**Symptoms**: No canvas shown after uploading image

**Solutions**:
1. ✓ Reload the page
   - Canvas may fail to initialize
   - F5 or refresh button

2. ✓ Check image format
   - Try PNG or JPG only
   - Avoid unusual formats

3. ✓ Check browser console
   - F12 → Console tab
   - Look for error messages
   - Screenshot and search for solution

### Mask Not Working / No Effect on Generation
**Symptoms**: Inpaint generates but ignores mask

**Solutions**:
1. ✓ Ensure mask is visible:
   - Click canvas to verify it's active
   - Brush should draw white on black

2. ✓ Clear and redraw:
   - Click "Clear" button
   - Draw mask again
   - Ensure it's in right area

3. ✓ Change inpaint area:
   - Try "Only masked" instead of "Whole picture"
   - Different option may work better

4. ✓ Increase mask blur:
   - Try 8-16 instead of 4
   - Smoother transitions sometimes help

## Settings & Storage Issues

### Can't Save API Keys
**Symptoms**: Keys disappear after refresh

**Solutions**:
1. ✓ Enable localStorage:
   - Check browser privacy settings
   - Allow localStorage for this website

2. ✓ Not in incognito/private mode:
   - Private mode clears data on close
   - Use normal browsing mode

3. ✓ Clear browser cache:
   - DevTools → Application → Clear Site Data
   - Refresh and try again

### Settings Not Persisting
**Symptoms**: API URL disappears after refresh

**Solutions**:
1. ✓ Check localStorage enabled:
   - DevTools (F12) → Application → Local Storage
   - Should show 'sd_api_url', etc.

2. ✓ Storage quota exceeded:
   - DevTools → Application → Storage
   - Check available space
   - Clear old data if needed

3. ✓ Try incognito mode first:
   - If it works there, normal mode has conflicts
   - Clear site data and try again

## Browser-Specific Issues

### Chrome/Chromium
**Issue**: Downloads are blocked
- **Fix**: Check Chrome download settings, allow file types

**Issue**: Slow generation
- **Fix**: Check Chrome extensions aren't interfering
- Disable extensions and try again

### Firefox
**Issue**: Large file operations slow
- **Fix**: Increase `network.http.max-connections` in about:config

**Issue**: Drag-and-drop not working
- **Fix**: Update to latest Firefox version

### Safari
**Issue**: API requests fail with CORS error
- **Fix**: Update Safari, or use Chrome
- Safari has stricter CORS policy

## Performance Issues

### Generation Takes Too Long
**Symptoms**: 512x512 @ 20 steps takes >1 minute

**Solutions**:
1. ✓ Check Colab GPU:
   - Run `!nvidia-smi` in Colab
   - Should show "T4 GPU" or better
   - If CPU-only, generation will be very slow

2. ✓ Reduce quality temporarily:
   - Lower steps to 15
   - Lower resolution to 384x384
   - Increase batch size (paradoxically faster)

3. ✓ Check for background processes:
   - Other Colab cells shouldn't be running
   - Only WebUI cell should be active

4. ✓ Colab may be throttling:
   - Free Colab throttles GPU after heavy use
   - Try Colab Pro for consistent performance

### Page Is Slow/Laggy
**Symptoms**: UI feels sluggish, buttons don't respond

**Solutions**:
1. ✓ Close other tabs:
   - Having many tabs open = less RAM
   - Close unnecessary tabs

2. ✓ Clear browser cache:
   - DevTools (F12) → Network → "Disable cache"
   - Or Settings → Clear browsing data

3. ✓ Disable browser extensions:
   - Some extensions slow down pages
   - Try incognito mode (no extensions)

## API Key Issues

### CivitAI Download Not Working
**Symptoms**: Download button doesn't work

**Solutions**:
1. ✓ Check API key is valid:
   - Go to civitai.com
   - Settings → API Keys
   - Copy and paste correct key

2. ✓ Key saved properly:
   - Enter key
   - Click "Save Keys"
   - Check localStorage: DevTools → Application → Local Storage

3. ✓ Feature may not be fully implemented:
   - CivitAI download requires backend support
   - May need custom implementation

### HuggingFace Token Issues
**Symptoms**: Can't download from HuggingFace

**Solutions**:
1. ✓ Create access token:
   - huggingface.co → Settings → Access Tokens
   - Create "Fine-grained" token with repo read access

2. ✓ Use correct token:
   - Token should start with `hf_`
   - Not your account password

3. ✓ Account has permissions:
   - Some models require accepting license
   - Accept license on model page first

## Colab-Specific Issues

### Colab Notebook Crashes
**Symptoms**: Notebook restarts or shows "Runtime Error"

**Solutions**:
1. ✓ Check RAM usage:
   - Run `!free -h`
   - Should have >10GB available

2. ✓ Reduce model size:
   - Use lighter models
   - Enable `--medvram` flag

3. ✓ Too many generations in sequence:
   - Colab memory accumulates
   - Restart notebook occasionally

4. ✓ Increase session timeout:
   - Colab → Settings → Enable notifications
   - Or use Colab Pro

### Tunnel URL Keeps Changing
**Symptoms**: URL from Colab is different each time

**Solutions**:
1. ✓ This is expected behavior:
   - Cloudflare creates new tunnel each session
   - Just copy new URL into settings

2. ✓ To keep same URL:
   - Use Cloudflare account with custom domain
   - Or use Ngrok (requires key)
   - Not practical for most users

## General Troubleshooting Steps

1. **Check the basics**:
   - Is Colab running?
   - Is browser refreshed?
   - Is API URL correct?

2. **Test connection**:
   - Go to #settings
   - Click "Test Connection"
   - Check status indicator

3. **Check browser console**:
   - F12 → Console tab
   - Look for red error messages
   - Copy-paste errors into search

4. **Restart involved services**:
   - Refresh browser (F5)
   - Restart Colab Cell 4
   - Try in different browser

5. **Check documentation**:
   - SD_SETUP_GUIDE.md
   - COLAB_SETUP.md
   - SD_QUICK_REFERENCE.md

6. **Clear cache**:
   - DevTools → Application → Clear Site Data
   - Or use incognito mode

7. **Ask for help**:
   - Provide error messages
   - Describe what you did
   - Include browser/OS info

## FAQ - Frequently Asked Questions

**Q: Is my API key secure?**
A: API keys are stored in browser localStorage. Use incognito mode if on shared computer.

**Q: Why does the tunnel URL change?**
A: Cloudflare creates temporary tunnels. Each session gets new URL.

**Q: Can I use this without Google Colab?**
A: Yes! Any Stable Diffusion WebUI instance works (local, cloud, etc.)

**Q: How long do generations take?**
A: 512x512 @ 20 steps ≈ 15-20 seconds on T4 GPU

**Q: What if Colab runs out of GPU?**
A: Use `--medvram` flag, reduce resolution, or restart notebook

**Q: Can I use multiple GPUs?**
A: Colab doesn't support multi-GPU for free users

**Q: Is there a limit to generations?**
A: Colab has usage limits. Free tier: ~100 GPU hours/month

**Q: How do I use custom models?**
A: Download to `/models/Stable-diffusion/` in Colab, then restart WebUI

---

## Still Having Issues?

1. **Check all documentation files**:
   - SD_SETUP_GUIDE.md
   - COLAB_SETUP.md  
   - SD_QUICK_REFERENCE.md
   - IMPLEMENTATION_SUMMARY.md

2. **Common sources of issues**:
   - [ ] Connection problems (most common)
   - [ ] VRAM out of memory
   - [ ] Model files not found
   - [ ] Browser cache issues

3. **Before reporting**:
   - [ ] Restart Colab
   - [ ] Clear browser cache
   - [ ] Try different browser
   - [ ] Check all settings are correct

---

**Version**: 1.0  
**Last Updated**: November 2025

Good luck! Most issues are connection or memory-related and easily fixable! 🎉
