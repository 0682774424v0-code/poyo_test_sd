#!/usr/bin/env python3
"""
Fix cloudflared PATH issue - locate and use it correctly
"""

import subprocess
import os
import sys

print("\n" + "="*60)
print("🔧 FIXING CLOUDFLARED PATH ISSUE")
print("="*60)

# Try to find cloudflared
print("\n📍 Searching for cloudflared installation...")

locations_to_try = [
    "/usr/bin/cloudflared",
    "/usr/local/bin/cloudflared",
    "/snap/bin/cloudflared",
    "/opt/cloudflare/cloudflared",
]

found_path = None

for path in locations_to_try:
    if os.path.exists(path):
        print(f"   ✅ Found at: {path}")
        found_path = path
        break

if not found_path:
    print("   ❌ Not found in common locations")
    print("\n   Trying to find via 'which' command...")
    result = subprocess.run("which cloudflared", shell=True, capture_output=True, text=True)
    if result.returncode == 0:
        found_path = result.stdout.strip()
        print(f"   ✅ Found at: {found_path}")
    else:
        print("   ❌ Not found in PATH")
        print("\n   Trying to find via 'find' command...")
        result = subprocess.run("find /usr -name cloudflared 2>/dev/null | head -1", shell=True, capture_output=True, text=True)
        if result.stdout.strip():
            found_path = result.stdout.strip()
            print(f"   ✅ Found at: {found_path}")

if found_path:
    print(f"\n✅ SOLUTION: Use this path in your code:")
    print(f"   {found_path}")
    print(f"\nYou can now use:")
    print(f'   subprocess.Popen(["{found_path}", "tunnel", "--url", "http://localhost:7860"])')
else:
    print("\n⚠️ cloudflared not found anywhere!")
    print("   Trying to reinstall...")
    
    # Try to reinstall
    print("\n   Attempting fresh installation...")
    cmds = [
        "sudo apt-get update",
        "sudo apt-get install -y cloudflare-warp",
        "sudo apt-get install -y cloudflared",
    ]
    
    for cmd in cmds:
        print(f"   Running: {cmd[:40]}...")
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=60)
        if result.returncode == 0:
            print(f"   ✅ Success with: {cmd}")
            
            # Find again
            result = subprocess.run("which cloudflared", shell=True, capture_output=True, text=True)
            if result.returncode == 0:
                found_path = result.stdout.strip()
                print(f"   ✅ Now at: {found_path}")
                break

print("\n" + "="*60)
if found_path:
    print("✅ CLOUDFLARED PATH FOUND!")
    print(f"   Path: {found_path}")
    print("\n   Use this in cell [4]:")
    print(f'   tunnel_process = subprocess.Popen(["{found_path}", "tunnel", "--url", "http://localhost:7860"])')
else:
    print("⚠️ CLOUDFLARED INSTALLATION ISSUE")
    print("   Try one of these:")
    print("   1. Manually reinstall: sudo apt-get install cloudflared")
    print("   2. Download binary: visit https://github.com/cloudflare/cloudflared/releases")
    print("   3. Create symlink if found elsewhere")
print("="*60)
