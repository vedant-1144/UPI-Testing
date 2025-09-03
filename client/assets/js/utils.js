// 🛠️ Utility Functions
class Utils {
    
    // 📅 Date formatting
    static formatDate(dateString) {
        if (!dateString) return 'Unknown date';
        
        try {
            const date = new Date(dateString);
            const now = new Date();
            const diffTime = Math.abs(now - date);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays === 1) {
                return `Today at ${date.toLocaleTimeString('en-IN', { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    hour12: true 
                })}`;
            } else if (diffDays === 2) {
                return `Yesterday at ${date.toLocaleTimeString('en-IN', { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    hour12: true 
                })}`;
            } else if (diffDays <= 7) {
                return date.toLocaleDateString('en-IN', { 
                    weekday: 'short',
                    hour: '2-digit', 
                    minute: '2-digit',
                    hour12: true 
                });
            } else {
                return date.toLocaleDateString('en-IN', { 
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit', 
                    minute: '2-digit',
                    hour12: true 
                });
            }
        } catch (error) {
            console.error('Date formatting error:', error);
            return 'Invalid date';
        }
    }
    
    // 🔤 String utilities
    static capitalizeFirst(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    }
    
    // 💰 Currency formatting
    static formatCurrency(amount) {
        if (isNaN(amount)) return '₹0.00';
        return `₹${parseFloat(amount).toLocaleString('en-IN', { 
            minimumFractionDigits: 2,
            maximumFractionDigits: 2 
        })}`;
    }
    
    // 🔢 Generate reference ID
    static generateReferenceId() {
        const timestamp = Date.now().toString(36);
        const randomStr = Math.random().toString(36).substring(2, 8);
        return `PE${timestamp}${randomStr}`.toUpperCase();
    }
    
    // ✅ Input validation
    static validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    static validatePhone(phone) {
        const phoneRegex = /^[6-9]\d{9}$/;
        return phoneRegex.test(phone);
    }
    
    static validatePin(pin) {
        const pinRegex = /^\d{4,6}$/;
        return pinRegex.test(pin);
    }
    
    static validateAmount(amount) {
        const num = parseFloat(amount);
        return !isNaN(num) && num > 0 && num <= CONFIG.UI.MAX_TRANSACTION_AMOUNT;
    }
    
    // 🎨 DOM utilities
    static createElement(tag, className = '', innerHTML = '') {
        const element = document.createElement(tag);
        if (className) element.className = className;
        if (innerHTML) element.innerHTML = innerHTML;
        return element;
    }
    
    static toggleElementVisibility(elementId, show = true) {
        const element = document.getElementById(elementId);
        if (element) {
            element.style.display = show ? 'block' : 'none';
        }
    }
    
    // 🔐 Security utilities
    static sanitizeInput(input) {
        if (typeof input !== 'string') return input;
        return input.replace(/[<>]/g, '');
    }
    
    // 📱 Device detection
    static isMobileDevice() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }
    
    // 🌐 Network utilities
    static async makeApiCall(url, options = {}) {
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
            },
        };
        
        const finalOptions = { ...defaultOptions, ...options };
        
        try {
            const response = await fetch(url, finalOptions);
            const data = await response.json();
            
            return {
                success: response.ok,
                status: response.status,
                data: data
            };
        } catch (error) {
            console.error('API call failed:', error);
            return {
                success: false,
                status: 0,
                data: { message: 'Network error' }
            };
        }
    }
}

// Export for ES6 modules (if supported)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Utils;
}
