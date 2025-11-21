#!/usr/bin/env powershell

<#
.SYNOPSIS
    Cloudflare Tunnel Manager для Stable Diffusion
.DESCRIPTION
    Запускає cloudflared туннель, зберігає URL та відправляє на GitHub Pages
.NOTES
    Вимоги: cloudflared встановлений
#>

param(
    [string]$Action = "start",
    [string]$Port = "7860",
    [string]$TunnelName = "sd-webui"
)

function Write-Status {
    param([string]$Message, [string]$Type = "INFO")
    $color = @{
        "INFO"    = "Cyan"
        "SUCCESS" = "Green"
        "ERROR"   = "Red"
        "WARNING" = "Yellow"
    }
    Write-Host "[$Type] $Message" -ForegroundColor $color[$Type]
}

function Get-CloudflaredVersion {
    try {
        $version = & cloudflared --version 2>$null | Select-Object -First 1
        if ($version) {
            return $true
        }
        return $false
    }
    catch {
        return $false
    }
}

function Start-Tunnel {
    Write-Status "Перевіримо cloudflared..." "INFO"
    
    if (-not (Get-CloudflaredVersion)) {
        Write-Status "cloudflared не встановлений!" "ERROR"
        Write-Status "Завантажте з: https://github.com/cloudflare/wrangler/releases" "WARNING"
        exit 1
    }

    Write-Status "cloudflared знайдено ✓" "SUCCESS"
    Write-Status "Запускаємо туннель на порту $Port..." "INFO"

    # Запустити туннель
    try {
        & cloudflared tunnel --url "http://localhost:$Port" 2>&1 | ForEach-Object {
            Write-Host $_
            
            # Дошукаємось URL
            if ($_ -match "https://.*\.trycloudflare\.com") {
                $url = [regex]::Match($_, "https://[^\s]+\.trycloudflare\.com").Value
                Write-Status "Туннель активний: $url" "SUCCESS"
                
                # Зберегти URL
                Save-TunnelUrl $url
            }
        }
    }
    catch {
        Write-Status "Помилка при запуску туннелю: $_" "ERROR"
        exit 1
    }
}

function Save-TunnelUrl {
    param([string]$Url)
    
    $configPath = "$PSScriptRoot\tunnel-config.json"
    
    $config = @{
        url = $Url
        timestamp = (Get-Date -Format "o")
        port = $Port
    } | ConvertTo-Json

    try {
        Set-Content -Path $configPath -Value $config -Encoding UTF8
        Write-Status "URL збережено: $configPath" "SUCCESS"
    }
    catch {
        Write-Status "Не вдалося зберегти URL: $_" "ERROR"
    }
}

function Stop-Tunnel {
    Write-Status "Зупиняємо туннель..." "INFO"
    Get-Process cloudflared -ErrorAction SilentlyContinue | Stop-Process -Force
    Write-Status "Туннель зупинено" "SUCCESS"
}

function Show-Status {
    $configPath = "$PSScriptRoot\tunnel-config.json"
    
    if (Test-Path $configPath) {
        $config = Get-Content $configPath | ConvertFrom-Json
        Write-Status "Поточний туннель:" "INFO"
        Write-Host "  URL: $($config.url)"
        Write-Host "  Час: $($config.timestamp)"
    }
    else {
        Write-Status "Туннель не активний" "WARNING"
    }
}

# Main
switch ($Action.ToLower()) {
    "start" {
        Start-Tunnel
    }
    "stop" {
        Stop-Tunnel
    }
    "status" {
        Show-Status
    }
    default {
        Write-Status "Невідома команда: $Action" "ERROR"
        Write-Host "Доступні команди: start, stop, status"
        exit 1
    }
}
