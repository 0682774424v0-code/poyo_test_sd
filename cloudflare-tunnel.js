/**
 * Cloudflare Tunnel Manager for Stable Diffusion WebUI
 * Управління туннелем cloudflared з GitHub Pages
 */

class CloudflareTunnelManager {
    constructor() {
        this.tunnelUrl = null;
        this.statusElement = null;
        this.statusIndicator = null;
        this.statusText = null;
        this.apiUrl = null;
        
        this.loadSavedTunnelUrl();
        this.init();
    }

    init() {
        // Bind UI elements
        this.updateElements();
        this.setupEventListeners();
        this.checkConnectionStatus();
    }

    updateElements() {
        this.statusElement = document.getElementById('sd-connection-status');
        this.statusIndicator = document.getElementById('sd-status-indicator');
        this.statusText = document.getElementById('sd-status-text');
        this.apiUrlInput = document.getElementById('sd-api-url');
        this.testBtn = document.getElementById('sd-test-connection');
    }

    setupEventListeners() {
        if (this.testBtn) {
            this.testBtn.removeEventListener('click', this.testConnection.bind(this));
            this.testBtn.addEventListener('click', this.testConnection.bind(this));
        }

        if (this.apiUrlInput) {
            this.apiUrlInput.addEventListener('blur', () => this.saveTunnelUrl());
            this.apiUrlInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.saveTunnelUrl();
                    this.testConnection();
                }
            });
        }
    }

    loadSavedTunnelUrl() {
        try {
            const saved = localStorage.getItem('sd_tunnel_url');
            if (saved) {
                this.tunnelUrl = saved;
                this.apiUrl = saved;
                if (this.apiUrlInput) this.apiUrlInput.value = saved;
            }
        } catch (e) {
            console.warn('Could not load saved tunnel URL:', e);
        }
    }

    saveTunnelUrl() {
        const url = this.apiUrlInput?.value?.trim();
        if (!url) {
            this.showNotification('Please enter a tunnel URL', 'error');
            return false;
        }

        // Validate URL format
        try {
            new URL(url);
        } catch (e) {
            this.showNotification('Invalid URL format', 'error');
            return false;
        }

        try {
            localStorage.setItem('sd_tunnel_url', url);
            this.tunnelUrl = url;
            this.apiUrl = url;
            this.showNotification('Tunnel URL saved!', 'success');
            return true;
        } catch (e) {
            this.showNotification('Failed to save URL', 'error');
            return false;
        }
    }

    async testConnection() {
        const url = this.apiUrlInput?.value?.trim();
        if (!url) {
            this.showNotification('Please enter a tunnel URL first', 'error');
            return;
        }

        this.updateStatus('loading', 'Testing...');
        
        try {
            const response = await fetch(`${url}/config`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                },
                timeout: 5000
            });

            if (response.ok) {
                this.updateStatus('connected', 'Connected ✓');
                this.showNotification('Connection successful!', 'success');
                this.saveTunnelUrl();
                return true;
            } else {
                this.updateStatus('error', 'Connection failed');
                this.showNotification(`Server responded with ${response.status}`, 'error');
                return false;
            }
        } catch (e) {
            this.updateStatus('error', 'Connection failed');
            this.showNotification(`Connection error: ${e.message}`, 'error');
            return false;
        }
    }

    async checkConnectionStatus() {
        if (!this.tunnelUrl) return;

        try {
            const response = await fetch(`${this.tunnelUrl}/config`, {
                method: 'GET',
                timeout: 3000
            });

            if (response.ok) {
                this.updateStatus('connected', 'Connected ✓');
            } else {
                this.updateStatus('disconnected', 'Disconnected');
            }
        } catch (e) {
            this.updateStatus('disconnected', 'Offline');
        }
    }

    updateStatus(status, text) {
        if (!this.statusIndicator || !this.statusText) return;

        const statusColors = {
            'connected': '#43b581',    // Discord green
            'disconnected': '#faa61a', // Discord yellow
            'error': '#f04747',        // Discord red
            'loading': '#5865f2'       // Discord blue
        };

        this.statusIndicator.style.backgroundColor = statusColors[status] || '#888';
        this.statusText.textContent = text;
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `discord-notification ${type}`;
        notification.textContent = message;
        notification.style.position = 'fixed';
        notification.style.right = '16px';
        notification.style.bottom = '16px';
        notification.style.zIndex = '99999';
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    getTunnelUrl() {
        return this.tunnelUrl;
    }

    getApiUrl() {
        return this.apiUrl;
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window._tunnelManager = new CloudflareTunnelManager();
    });
} else {
    window._tunnelManager = new CloudflareTunnelManager();
}
