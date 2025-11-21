#!/usr/bin/env bash
# Setup verification script - Проверка установки

echo "🔍 Проверка вашей установки..."
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

check_command() {
    if command -v $1 &> /dev/null; then
        echo -e "${GREEN}✓${NC} $1: установлен"
        return 0
    else
        echo -e "${RED}✗${NC} $1: НЕ установлен"
        return 1
    fi
}

echo "=== ТРЕБУЕМЫЕ КОМПОНЕНТЫ ==="
echo ""

# Check Python
echo "📦 Python:"
check_command "python" || check_command "python3"

# Check Git
echo ""
echo "📦 Git:"
check_command "git"

# Check cloudflared
echo ""
echo "📦 Cloudflare Tunnel:"
check_command "cloudflared"

echo ""
echo "=== ОПЦИОНАЛЬНЫЕ КОМПОНЕНТЫ ==="
echo ""

# Check curl
echo "📦 curl (для тестирования):"
check_command "curl"

# Check Node.js
echo ""
echo "📦 Node.js (опционально):"
check_command "node"

echo ""
echo "=== ЛОКАЛЬНЫЕ ФАЙЛЫ ==="
echo ""

check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $1"
        return 0
    else
        echo -e "${RED}✗${NC} $1: ОТСУТСТВУЕТ"
        return 1
    fi
}

check_file "index.html"
check_file "cloudflare-tunnel.js"
check_file "sd-api-client.js"
check_file "start-tunnel.sh"
check_file "start-tunnel.ps1"

echo ""
echo "=== ДОКУМЕНТАЦИЯ ==="
echo ""

check_file "README.md"
check_file "QUICKSTART.md"
check_file "CLOUDFLARE_SETUP.md"
check_file "GITHUB_DEPLOY.md"
check_file "API_EXAMPLES.md"
check_file "CHECKLISTS.md"
check_file "INSTALL.md"
check_file "INDEX.md"

echo ""
echo "=== БЫСТРАЯ ПРОВЕРКА СТАТУСА ==="
echo ""

# Check if Stable Diffusion is running
echo -n "Stable Diffusion (localhost:7860): "
if curl -s http://localhost:7860/config > /dev/null; then
    echo -e "${GREEN}✓ Работает${NC}"
else
    echo -e "${YELLOW}✗ Не запущена${NC} (это нормально, если вы еще не запустили)"
fi

# Check if tunnel is running
echo -n "Cloudflare Tunnel: "
if pgrep -x "cloudflared" > /dev/null; then
    echo -e "${GREEN}✓ Работает${NC}"
else
    echo -e "${YELLOW}✗ Не запущена${NC} (это нормально, если вы еще не запустили)"
fi

echo ""
echo "=== ГОТОВО ==="
echo ""
echo "Если все отмечено ✓, вы готовы к использованию!"
echo ""
echo "Следующие шаги:"
echo "1. Прочитайте QUICKSTART.md"
echo "2. Запустите Stable Diffusion: python launch.py --api --cors-allow-origins=*"
echo "3. Запустите туннель: ./start-tunnel.sh start 7860"
echo "4. Откройте GitHub Pages и введите URL туннеля в настройки"
echo ""
