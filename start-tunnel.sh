#!/bin/bash

#
# Cloudflare Tunnel Manager для Stable Diffusion
# Запускає cloudflared туннель, зберігає URL та інформує GitHub Pages
#

set -euo pipefail

# Конфігурація
ACTION="${1:-start}"
PORT="${2:-7860}"
TUNNEL_NAME="${3:-sd-webui}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="$SCRIPT_DIR/tunnel-config.json"

# Кольори для виводу
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

function write_status() {
    local message="$1"
    local type="${2:-INFO}"
    
    case "$type" in
        INFO)
            echo -e "${BLUE}[INFO]${NC} $message"
            ;;
        SUCCESS)
            echo -e "${GREEN}[SUCCESS]${NC} $message"
            ;;
        ERROR)
            echo -e "${RED}[ERROR]${NC} $message"
            ;;
        WARNING)
            echo -e "${YELLOW}[WARNING]${NC} $message"
            ;;
    esac
}

function check_cloudflared() {
    if ! command -v cloudflared &> /dev/null; then
        write_status "cloudflared не встановлений!" "ERROR"
        write_status "На macOS: brew install cloudflare/cloudflare/cloudflared" "WARNING"
        write_status "На Linux: https://github.com/cloudflare/wrangler/releases" "WARNING"
        exit 1
    fi
    
    write_status "cloudflared знайдено ✓" "SUCCESS"
    cloudflared --version
}

function start_tunnel() {
    write_status "Перевіримо cloudflared..." "INFO"
    check_cloudflared
    
    write_status "Запускаємо туннель на порту $PORT..." "INFO"
    write_status "Стабільна дифузія повинна працювати на localhost:$PORT" "WARNING"
    write_status "Натисніть Ctrl+C для зупинення" "INFO"
    
    echo ""
    
    # Запустити туннель з виводом URL
    cloudflared tunnel --url "http://localhost:$PORT" 2>&1 | while IFS= read -r line; do
        echo "$line"
        
        # Пошук URL у виводі
        if [[ $line =~ https://[a-zA-Z0-9-]+\.trycloudflare\.com ]]; then
            url="${BASH_REMATCH[0]}"
            write_status "Туннель активний: $url" "SUCCESS"
            save_tunnel_url "$url"
        fi
    done
}

function save_tunnel_url() {
    local url="$1"
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    
    cat > "$CONFIG_FILE" << EOF
{
  "url": "$url",
  "timestamp": "$timestamp",
  "port": $PORT,
  "name": "$TUNNEL_NAME"
}
EOF
    
    write_status "URL збережено до: $CONFIG_FILE" "SUCCESS"
    write_status "Скопіюйте URL у GitHub Pages налаштування:" "INFO"
    echo ""
    echo "  $url"
    echo ""
}

function stop_tunnel() {
    write_status "Зупиняємо туннель..." "INFO"
    
    # Знайти процес cloudflared
    if pgrep -x cloudflared > /dev/null; then
        pkill -x cloudflared || true
        write_status "Туннель зупинено" "SUCCESS"
    else
        write_status "Туннель не запущений" "WARNING"
    fi
}

function show_status() {
    if [ -f "$CONFIG_FILE" ]; then
        write_status "Поточний туннель:" "INFO"
        cat "$CONFIG_FILE" | jq '.' 2>/dev/null || cat "$CONFIG_FILE"
    else
        write_status "Туннель не активний" "WARNING"
        write_status "Запустіть: $0 start" "INFO"
    fi
}

function show_help() {
    cat << EOF
Cloudflare Tunnel Manager для Stable Diffusion

Використання:
  $0 [command] [port] [name]

Команди:
  start       Запустити туннель (за замовчуванням)
  stop        Зупинити туннель
  status      Показати статус
  help        Показати цю довідку

Параметри:
  port        Порт Stable Diffusion (за замовчуванням: 7860)
  name        Назва туннелю (за замовчуванням: sd-webui)

Приклади:
  $0 start 7860
  $0 stop
  $0 status

EOF
}

# Основний цикл
case "${ACTION,,}" in
    start)
        start_tunnel
        ;;
    stop)
        stop_tunnel
        ;;
    status)
        show_status
        ;;
    help)
        show_help
        ;;
    *)
        write_status "Невідома команда: $ACTION" "ERROR"
        show_help
        exit 1
        ;;
esac
