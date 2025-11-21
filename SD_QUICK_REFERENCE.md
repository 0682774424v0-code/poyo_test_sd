# Stable Diffusion GUI - Quick Reference

## Keyboard Shortcuts
- **Click Stable Diffusion icon** → Switch to SD interface
- **#txt2img** → Text-to-Image tab
- **#img2img** → Image-to-Image tab
- **#inpaint** → Inpainting/Masking tab
- **#settings** → Configure API & manage models

## Parameter Quick Guide

### txt2img/img2img/inpaint
| Parameter | Default | Recommended Range | Notes |
|-----------|---------|------------------|-------|
| Steps | 20 | 15-50 | Higher = better quality but slower |
| CFG Scale | 7 | 5-15 | Higher = more prompt adherence |
| Seed | -1 | Any | -1 for random, fixed number for reproducibility |
| Width | 512 | 512-768 | Must be multiple of 64 |
| Height | 512 | 512-768 | Must be multiple of 64 |
| Sampler | DPM++ 2M | - | Try different samplers for varied results |

### img2img Only
| Parameter | Default | Recommended Range |
|-----------|---------|------------------|
| Denoising | 0.75 | 0.3-0.9 | Lower = closer to original |

### inpaint Only
| Parameter | Default | Recommended Range |
|-----------|---------|------------------|
| Mask Blur | 4 | 0-16 | Smooth mask edges |

## Quality Tips

**For Better Results:**
- ✓ Longer, more detailed prompts
- ✓ Negative prompt with things to avoid
- ✓ Higher steps (30-50 for detail)
- ✓ Consistent seed when iterating
- ✓ LoRAs for specific styles

**For Faster Generation:**
- ✓ Lower steps (15-20)
- ✓ Simpler prompts (but still descriptive)
- ✓ DPM++ sampler
- ✓ 512x512 resolution

## Common Prompts

### Photography Style
```
a portrait of [subject], professional photography, 
sharp focus, soft lighting, shallow depth of field
```

### Illustration Style
```
an illustration of [subject], trending on artstation, 
digital art, highly detailed, painted
```

### 3D Rendering
```
3d rendered [subject], octane render, volumetric lighting, 
cinematic composition, ultra detailed
```

## Model Recommendations

- **Stable Diffusion 1.5**: Fast, versatile, good baseline
- **Chillout Mix**: Realistic people, landscapes
- **Anything v3**: Anime, digital art
- **Dreamshaper**: Good for general art
- **RevAnimated**: Animated and stylized content

## LoRA Examples

Add to prompt: `<lora:lora_name:weight>`

Examples:
- `<lora:add_detail:0.5>` - More detail
- `<lora:epiCRealism:0.7>` - More realistic
- `<lora:niji_journey_v3:0.8>` - Anime style

## Troubleshooting Quick Fixes

| Problem | Solution |
|---------|----------|
| VRAM error | Reduce batch size, lower resolution |
| Blurry output | Increase steps, increase CFG scale |
| Off-prompt | Lower CFG scale, use negative prompt |
| Wrong dimensions | Check Width/Height are multiples of 64 |
| Connection fails | Test connection button in #settings |
| Models not showing | Restart Colab notebook cell 3 |

## Browser Storage

All settings saved to `localStorage`:
- `sd_api_url` - Cloudflared URL
- `civitai_key` - CivitAI API key
- `hf_token` - HuggingFace token

Clear data: DevTools → Application → Local Storage → Clear All

## Performance Benchmarks

Average generation time on T4 GPU (Colab):
- 512x512 @ 20 steps: ~15-20 seconds
- 768x768 @ 30 steps: ~40-50 seconds
- 1024x1024 @ 20 steps: May cause VRAM error

## Supported File Formats

**Input Images (img2img/inpaint):**
- PNG, JPG, JPEG, WebP

**Output Images:**
- PNG (with metadata)

## Tips & Tricks

1. **Iteration**: Use the same seed to refine with higher steps
2. **Blending**: Use lower denoising (0.3-0.5) for subtle changes
3. **Composition**: Use negative prompts to remove unwanted elements
4. **Consistency**: Use LoRAs to maintain style across generations
5. **Faster feedback**: Lower steps for quick tests, then refine

## Common LoRA Repositories

- **CivitAI**: civitai.com (largest collection)
- **HuggingFace**: huggingface.co/models
- **OpenModelDB**: openmodeldb.info

## Contact & Support

- GitHub Issues: [Your Repo URL]
- Discord: [Your Discord]
- Email: [Your Email]

---
**Last Updated**: November 2025
