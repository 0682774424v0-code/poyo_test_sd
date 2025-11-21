"""
🎨 Google Colab Setup Script
Handles dependencies installation and environment setup for Colab
"""

import subprocess
import sys
import os

def install_dependencies():
    """Install all required packages"""
    print("📦 Installing Python packages...")
    packages = [
        'torch==2.0.1',
        'torchvision==0.15.2',
        'diffusers==0.21.4',
        'transformers==4.30.2',
        'accelerate==0.20.3',
        'safetensors==0.3.1',
        'flask==2.3.2',
        'flask-cors==4.0.0',
        'pillow==9.5.0',
        'numpy==1.24.3',
        'xformers==0.0.20',
        'peft==0.4.0',
        'requests==2.31.0',
    ]
    
    for package in packages:
        print(f"  Installing {package}...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-q", package])
    
    print("✅ All packages installed!")

def install_cloudflared():
    """Install cloudflared for tunnel"""
    print("\n🌐 Installing cloudflared...")
    
    # Download and install
    subprocess.run([
        "wget", "-q", 
        "https://github.com/cloudflare/wrangler/releases/download/wrangler-3.0.1/cloudflared-linux-amd64.deb",
        "-O", "/tmp/cloudflared.deb"
    ], check=True)
    
    subprocess.run(["dpkg", "-i", "/tmp/cloudflared.deb"], 
                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    
    print("✅ Cloudflared installed!")

def setup_environment():
    """Setup environment variables"""
    print("\n⚙️ Setting up environment...")
    
    # CUDA memory optimization
    os.environ['PYTORCH_CUDA_ALLOC_CONF'] = 'expandable_segments:True'
    os.environ['CUDA_LAUNCH_BLOCKING'] = '1'
    
    print("✅ Environment configured!")

def create_server_dirs():
    """Create necessary directories"""
    print("\n📁 Creating directories...")
    
    dirs = ['models', 'outputs']
    for d in dirs:
        os.makedirs(d, exist_ok=True)
        print(f"  ✓ {d}/")
    
    print("✅ Directories created!")

def main():
    """Run all setup steps"""
    print("=" * 50)
    print("🎨 Stable Diffusion Backend - Colab Setup")
    print("=" * 50)
    
    try:
        install_dependencies()
        install_cloudflared()
        setup_environment()
        create_server_dirs()
        
        print("\n" + "=" * 50)
        print("✅ Setup complete!")
        print("=" * 50)
        print("\nNext steps:")
        print("1. Run: python app.py")
        print("2. Get the cloudflared URL")
        print("3. Paste in frontend settings")
        print("4. Start generating!")
        
    except Exception as e:
        print(f"\n❌ Setup failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
