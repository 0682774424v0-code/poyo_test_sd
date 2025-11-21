# ⚙️ Server Configuration

import os
from pathlib import Path

# ============================================
# BASIC SETTINGS
# ============================================

# Flask server settings
FLASK_HOST = "127.0.0.1"
FLASK_PORT = 5000
FLASK_DEBUG = False

# Model settings
MODEL_ID = "runwayml/stable-diffusion-v1-5"  # Change to your model
USE_SAFETENSORS = True
ENABLE_XFORMERS = True  # Memory optimization
ENABLE_ATTENTION_SLICING = True  # For low VRAM
ENABLE_VAE_TILING = True  # Tile VAE to reduce memory

# ============================================
# MEMORY OPTIMIZATION (Critical for Google Colab!)
# ============================================

# Use float16 instead of float32 (saves 2x memory)
USE_FP16 = True

# Disable safety checker (frees ~1.5GB)
DISABLE_SAFETY_CHECKER = True

# Enable memory-efficient attention
USE_MEMORY_EFFICIENT_ATTENTION = True

# Offload to CPU when not in use
ENABLE_SEQUENTIAL_CPU_OFFLOAD = False  # Set True for very low VRAM
ENABLE_MODEL_CPU_OFFLOAD = True  # Better than sequential

# Clear cache between generations
CLEAR_CACHE_AFTER_GENERATION = True

# ============================================
# GENERATION DEFAULTS
# ============================================

DEFAULT_STEPS = 20
DEFAULT_CFG_SCALE = 7.5
DEFAULT_WIDTH = 512
DEFAULT_HEIGHT = 512
DEFAULT_BATCH_SIZE = 1
MAX_BATCH_SIZE = 4

# Seed (-1 = random)
DEFAULT_SEED = -1

# ============================================
# PERFORMANCE SETTINGS
# ============================================

# Maximum concurrent generations
MAX_CONCURRENT_GENERATIONS = 1

# Timeout for generation (seconds)
GENERATION_TIMEOUT = 600

# Enable progress callback
ENABLE_PROGRESS_CALLBACK = True

# ============================================
# PATHS
# ============================================

BASE_DIR = Path(__file__).parent.parent
MODELS_DIR = BASE_DIR / "models"
OUTPUT_DIR = BASE_DIR / "outputs"

# Create directories if they don't exist
MODELS_DIR.mkdir(exist_ok=True)
OUTPUT_DIR.mkdir(exist_ok=True)

# ============================================
# DEVICE SETTINGS
# ============================================

DEVICE = "cuda"  # or "cpu"
