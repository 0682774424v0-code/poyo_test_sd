"""
🎨 Stable Diffusion Backend Server
Flask API for text-to-image, image-to-image, and inpainting
Optimized for Google Colab with memory management
"""

import torch
import gc
import io
import base64
from PIL import Image
from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
from datetime import datetime
import logging

# Import configuration
from config import *

# ============================================
# LOGGING SETUP
# ============================================

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============================================
# FLASK APP SETUP
# ============================================

app = Flask(__name__)
CORS(app)

# Global state
pipelines = {
    'txt2img': None,
    'img2img': None,
    'inpaint': None
}

generation_state = {
    'is_generating': False,
    'current_prompt': '',
    'start_time': None
}

# ============================================
# UTILITY FUNCTIONS
# ============================================

def log_memory():
    """Log GPU/CPU memory usage"""
    if torch.cuda.is_available():
        allocated = torch.cuda.memory_allocated() / 1024**3
        reserved = torch.cuda.memory_reserved() / 1024**3
        logger.info(f"💾 GPU Memory: {allocated:.2f}/{reserved:.2f} GB")

def clear_memory():
    """Clear GPU memory"""
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
        torch.cuda.reset_peak_memory_stats()
    gc.collect()
    logger.info("🧹 Memory cleared")

def image_to_base64(image):
    """Convert PIL Image to base64 string"""
    buffered = io.BytesIO()
    image.save(buffered, format="PNG")
    img_str = base64.b64encode(buffered.getvalue()).decode()
    return f"data:image/png;base64,{img_str}"

def base64_to_image(base64_str):
    """Convert base64 string to PIL Image"""
    if ',' in base64_str:
        base64_str = base64_str.split(',')[1]
    
    image_data = base64.b64decode(base64_str)
    image = Image.open(io.BytesIO(image_data))
    return image.convert('RGB')

def get_device():
    """Get appropriate device"""
    if torch.cuda.is_available():
        return torch.device('cuda')
    return torch.device('cpu')

# ============================================
# PIPELINE LOADING
# ============================================

def load_pipelines():
    """Load all necessary pipelines"""
    global pipelines
    
    device = get_device()
    logger.info(f"📦 Device: {device}")
    logger.info(f"📦 Loading model: {MODEL_ID}")
    
    try:
        # Determine dtype
        dtype = torch.float16 if (USE_FP16 and device.type == 'cuda') else torch.float32
        logger.info(f"📦 Data type: {dtype}")
        
        # Load txt2img pipeline
        logger.info("📦 Loading txt2img pipeline...")
        from diffusers import StableDiffusionPipeline
        
        pipelines['txt2img'] = StableDiffusionPipeline.from_pretrained(
            MODEL_ID,
            torch_dtype=dtype,
            safety_checker=None if DISABLE_SAFETY_CHECKER else None,
        )
        
        pipelines['txt2img'].to(device)
        
        # Apply optimizations
        if ENABLE_XFORMERS and device.type == 'cuda':
            try:
                pipelines['txt2img'].enable_xformers_memory_efficient_attention()
                logger.info("✅ xformers attention enabled")
            except Exception as e:
                logger.warning(f"⚠️ xformers not available: {e}")
        
        if ENABLE_ATTENTION_SLICING:
            pipelines['txt2img'].enable_attention_slicing()
            logger.info("✅ Attention slicing enabled")
        
        if ENABLE_VAE_TILING:
            pipelines['txt2img'].enable_vae_tiling()
            logger.info("✅ VAE tiling enabled")
        
        if ENABLE_MODEL_CPU_OFFLOAD:
            pipelines['txt2img'].enable_model_cpu_offload()
            logger.info("✅ Model CPU offload enabled")
        
        logger.info("✅ txt2img loaded")
        
        # Load img2img pipeline
        logger.info("📦 Loading img2img pipeline...")
        from diffusers import StableDiffusionImg2ImgPipeline
        
        pipelines['img2img'] = StableDiffusionImg2ImgPipeline.from_pretrained(
            MODEL_ID,
            torch_dtype=dtype,
            safety_checker=None if DISABLE_SAFETY_CHECKER else None,
        )
        
        pipelines['img2img'].to(device)
        
        if ENABLE_XFORMERS and device.type == 'cuda':
            try:
                pipelines['img2img'].enable_xformers_memory_efficient_attention()
            except:
                pass
        
        if ENABLE_ATTENTION_SLICING:
            pipelines['img2img'].enable_attention_slicing()
        
        if ENABLE_VAE_TILING:
            pipelines['img2img'].enable_vae_tiling()
        
        if ENABLE_MODEL_CPU_OFFLOAD:
            pipelines['img2img'].enable_model_cpu_offload()
        
        logger.info("✅ img2img loaded")
        
        # Load inpaint pipeline
        logger.info("📦 Loading inpaint pipeline...")
        from diffusers import StableDiffusionInpaintPipeline
        
        pipelines['inpaint'] = StableDiffusionInpaintPipeline.from_pretrained(
            MODEL_ID,
            torch_dtype=dtype,
            safety_checker=None if DISABLE_SAFETY_CHECKER else None,
        )
        
        pipelines['inpaint'].to(device)
        
        if ENABLE_XFORMERS and device.type == 'cuda':
            try:
                pipelines['inpaint'].enable_xformers_memory_efficient_attention()
            except:
                pass
        
        if ENABLE_ATTENTION_SLICING:
            pipelines['inpaint'].enable_attention_slicing()
        
        if ENABLE_VAE_TILING:
            pipelines['inpaint'].enable_vae_tiling()
        
        if ENABLE_MODEL_CPU_OFFLOAD:
            pipelines['inpaint'].enable_model_cpu_offload()
        
        logger.info("✅ inpaint loaded")
        
        log_memory()
        logger.info("✅ All pipelines loaded successfully!")
        return True
        
    except Exception as e:
        logger.error(f"❌ Error loading pipelines: {e}")
        return False

# ============================================
# API ENDPOINTS
# ============================================

@app.route('/api/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "message": "Backend server is running",
        "timestamp": datetime.now().isoformat(),
        "gpu_available": torch.cuda.is_available(),
        "device": str(get_device()),
        "pipelines_loaded": all(p is not None for p in pipelines.values())
    }), 200

@app.route('/api/system', methods=['GET'])
def system_info():
    """Get system information"""
    info = {
        "gpu_available": torch.cuda.is_available(),
        "device": str(get_device()),
        "cuda_version": torch.version.cuda if torch.cuda.is_available() else None,
        "torch_version": torch.__version__,
        "is_generating": generation_state['is_generating']
    }
    
    if torch.cuda.is_available():
        info["gpu_name"] = torch.cuda.get_device_name(0)
        info["gpu_memory_total"] = torch.cuda.get_device_properties(0).total_memory / 1024**3
        info["gpu_memory_allocated"] = torch.cuda.memory_allocated() / 1024**3
        info["gpu_memory_reserved"] = torch.cuda.memory_reserved() / 1024**3
    
    return jsonify(info), 200

@app.route('/api/txt2img', methods=['POST'])
def txt2img():
    """Text to image generation"""
    global pipelines, generation_state
    
    if generation_state['is_generating']:
        return jsonify({"error": "Generation already in progress"}), 429
    
    try:
        generation_state['is_generating'] = True
        data = request.json
        
        # Get parameters
        prompt = data.get('prompt', '')
        negative_prompt = data.get('negative_prompt', '')
        steps = int(data.get('steps', DEFAULT_STEPS))
        cfg_scale = float(data.get('cfg_scale', DEFAULT_CFG_SCALE))
        width = int(data.get('width', DEFAULT_WIDTH))
        height = int(data.get('height', DEFAULT_HEIGHT))
        seed = int(data.get('seed', DEFAULT_SEED))
        batch_size = min(int(data.get('batch_size', 1)), MAX_BATCH_SIZE)
        
        # Validate parameters
        if not prompt:
            generation_state['is_generating'] = False
            return jsonify({"error": "Prompt is required"}), 400
        
        # Make dimensions multiple of 8
        width = (width // 8) * 8
        height = (height // 8) * 8
        
        device = get_device()
        
        # Set seed
        if seed >= 0:
            generator = torch.Generator(device=device).manual_seed(seed)
        else:
            generator = None
        
        generation_state['current_prompt'] = prompt
        generation_state['start_time'] = datetime.now()
        
        logger.info(f"🎨 txt2img: {prompt[:50]}...")
        logger.info(f"⚙️ Steps: {steps}, CFG: {cfg_scale}, Size: {width}x{height}")
        log_memory()
        
        # Generate
        result = pipelines['txt2img'](
            prompt=prompt,
            negative_prompt=negative_prompt,
            num_inference_steps=steps,
            guidance_scale=cfg_scale,
            height=height,
            width=width,
            num_images_per_prompt=batch_size,
            generator=generator
        )
        
        # Convert to base64
        images = [image_to_base64(img) for img in result.images]
        
        # Clean up
        if CLEAR_CACHE_AFTER_GENERATION:
            clear_memory()
        
        duration = (datetime.now() - generation_state['start_time']).total_seconds()
        logger.info(f"✅ Generated in {duration:.2f}s")
        
        generation_state['is_generating'] = False
        return jsonify({
            "success": True,
            "images": images,
            "duration": duration
        }), 200
    
    except Exception as e:
        logger.error(f"❌ txt2img error: {e}")
        generation_state['is_generating'] = False
        return jsonify({"error": str(e)}), 500

@app.route('/api/img2img', methods=['POST'])
def img2img():
    """Image to image generation"""
    global pipelines, generation_state
    
    if generation_state['is_generating']:
        return jsonify({"error": "Generation already in progress"}), 429
    
    try:
        generation_state['is_generating'] = True
        data = request.json
        
        # Get parameters
        prompt = data.get('prompt', '')
        negative_prompt = data.get('negative_prompt', '')
        image_base64 = data.get('image', '')
        steps = int(data.get('steps', DEFAULT_STEPS))
        cfg_scale = float(data.get('cfg_scale', DEFAULT_CFG_SCALE))
        strength = float(data.get('strength', 0.8))
        seed = int(data.get('seed', DEFAULT_SEED))
        batch_size = min(int(data.get('batch_size', 1)), MAX_BATCH_SIZE)
        
        if not prompt or not image_base64:
            generation_state['is_generating'] = False
            return jsonify({"error": "Prompt and image are required"}), 400
        
        device = get_device()
        
        # Convert image
        image = base64_to_image(image_base64)
        
        # Set seed
        if seed >= 0:
            generator = torch.Generator(device=device).manual_seed(seed)
        else:
            generator = None
        
        generation_state['current_prompt'] = prompt
        generation_state['start_time'] = datetime.now()
        
        logger.info(f"🎨 img2img: {prompt[:50]}...")
        logger.info(f"⚙️ Strength: {strength}, Steps: {steps}")
        log_memory()
        
        # Generate
        result = pipelines['img2img'](
            prompt=prompt,
            negative_prompt=negative_prompt,
            image=image,
            num_inference_steps=steps,
            guidance_scale=cfg_scale,
            strength=strength,
            num_images_per_prompt=batch_size,
            generator=generator
        )
        
        images = [image_to_base64(img) for img in result.images]
        
        if CLEAR_CACHE_AFTER_GENERATION:
            clear_memory()
        
        duration = (datetime.now() - generation_state['start_time']).total_seconds()
        logger.info(f"✅ Generated in {duration:.2f}s")
        
        generation_state['is_generating'] = False
        return jsonify({
            "success": True,
            "images": images,
            "duration": duration
        }), 200
    
    except Exception as e:
        logger.error(f"❌ img2img error: {e}")
        generation_state['is_generating'] = False
        return jsonify({"error": str(e)}), 500

@app.route('/api/inpaint', methods=['POST'])
def inpaint():
    """Inpainting generation"""
    global pipelines, generation_state
    
    if generation_state['is_generating']:
        return jsonify({"error": "Generation already in progress"}), 429
    
    try:
        generation_state['is_generating'] = True
        data = request.json
        
        # Get parameters
        prompt = data.get('prompt', '')
        negative_prompt = data.get('negative_prompt', '')
        image_base64 = data.get('image', '')
        mask_base64 = data.get('mask', '')
        steps = int(data.get('steps', DEFAULT_STEPS))
        cfg_scale = float(data.get('cfg_scale', DEFAULT_CFG_SCALE))
        strength = float(data.get('strength', 0.8))
        seed = int(data.get('seed', DEFAULT_SEED))
        batch_size = min(int(data.get('batch_size', 1)), MAX_BATCH_SIZE)
        
        if not all([prompt, image_base64, mask_base64]):
            generation_state['is_generating'] = False
            return jsonify({"error": "Prompt, image, and mask are required"}), 400
        
        device = get_device()
        
        # Convert images
        image = base64_to_image(image_base64)
        mask = base64_to_image(mask_base64).convert('L')
        
        # Set seed
        if seed >= 0:
            generator = torch.Generator(device=device).manual_seed(seed)
        else:
            generator = None
        
        generation_state['current_prompt'] = prompt
        generation_state['start_time'] = datetime.now()
        
        logger.info(f"🎨 inpaint: {prompt[:50]}...")
        log_memory()
        
        # Generate
        result = pipelines['inpaint'](
            prompt=prompt,
            negative_prompt=negative_prompt,
            image=image,
            mask_image=mask,
            num_inference_steps=steps,
            guidance_scale=cfg_scale,
            strength=strength,
            num_images_per_prompt=batch_size,
            generator=generator
        )
        
        images = [image_to_base64(img) for img in result.images]
        
        if CLEAR_CACHE_AFTER_GENERATION:
            clear_memory()
        
        duration = (datetime.now() - generation_state['start_time']).total_seconds()
        logger.info(f"✅ Generated in {duration:.2f}s")
        
        generation_state['is_generating'] = False
        return jsonify({
            "success": True,
            "images": images,
            "duration": duration
        }), 200
    
    except Exception as e:
        logger.error(f"❌ inpaint error: {e}")
        generation_state['is_generating'] = False
        return jsonify({"error": str(e)}), 500

@app.route('/api/progress', methods=['GET'])
def progress():
    """Get current generation progress"""
    return jsonify({
        "is_generating": generation_state['is_generating'],
        "current_prompt": generation_state['current_prompt'],
        "elapsed": (datetime.now() - generation_state['start_time']).total_seconds() 
                   if generation_state['start_time'] else 0
    }), 200

@app.route('/api/interrupt', methods=['POST'])
def interrupt():
    """Stop current generation"""
    generation_state['is_generating'] = False
    clear_memory()
    logger.warning("⏹️ Generation interrupted")
    return jsonify({"success": True}), 200

@app.route('/api/memory', methods=['GET'])
def memory():
    """Get memory usage"""
    info = {"gpu": {}, "system": {}}
    
    if torch.cuda.is_available():
        info["gpu"] = {
            "allocated_gb": torch.cuda.memory_allocated() / 1024**3,
            "reserved_gb": torch.cuda.memory_reserved() / 1024**3,
            "total_gb": torch.cuda.get_device_properties(0).total_memory / 1024**3
        }
    
    return jsonify(info), 200

# ============================================
# MAIN EXECUTION
# ============================================

if __name__ == '__main__':
    logger.info("=" * 50)
    logger.info("🚀 Starting Stable Diffusion Backend Server")
    logger.info("=" * 50)
    
    # Load pipelines
    if not load_pipelines():
        logger.error("Failed to load pipelines")
        exit(1)
    
    # Start server
    logger.info(f"🌐 Flask server starting at {FLASK_HOST}:{FLASK_PORT}")
    app.run(host=FLASK_HOST, port=FLASK_PORT, debug=FLASK_DEBUG, use_reloader=False)
