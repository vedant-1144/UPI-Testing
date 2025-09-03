// 🔐 Authentication Module
class AuthManager {
    constructor(uiManager) {
        this.uiManager = uiManager;
        this.currentUser = null;
        this.loadStoredUser();
    }
    
    // 👤 Load user from localStorage
    loadStoredUser() {
        try {
            const storedUser = localStorage.getItem(CONFIG.STORAGE_KEYS.USER);
            if (storedUser) {
                this.currentUser = JSON.parse(storedUser);
                console.log('🔄 Loaded stored user:', this.currentUser.name);
                return true;
            }
        } catch (error) {
            console.error('Error loading stored user:', error);
            localStorage.removeItem(CONFIG.STORAGE_KEYS.USER);
        }
        return false;
    }
    
    // 💾 Save user to localStorage
    saveUser(user) {
        this.currentUser = user;
        localStorage.setItem(CONFIG.STORAGE_KEYS.USER, JSON.stringify(user));
    }
    
    // 🚪 Login
    async login(phone, pin) {
        try {
            console.log('🔑 Attempting login:', { phone });
            
            const result = await Utils.makeApiCall(CONFIG.API_BASE_URL + CONFIG.API_ENDPOINTS.AUTH.LOGIN, {
                method: 'POST',
                body: JSON.stringify({ phone, pin })
            });
            
            console.log('Login response:', result);
            
            if (result.success && result.data.success) {
                this.saveUser(result.data.user);
                this.uiManager.showToast('Login successful!', 'success');
                return { success: true, user: result.data.user };
            } else {
                const message = result.data.message || 'Login failed';
                this.uiManager.showToast(message, 'error');
                return { success: false, message };
            }
        } catch (error) {
            console.error('Login error:', error);
            this.uiManager.showToast('Login failed: Network error', 'error');
            return { success: false, message: 'Network error' };
        }
    }
    
    // 📝 Register
    async register(userData) {
        try {
            console.log('📝 Attempting registration:', { 
                name: userData.name, 
                email: userData.email, 
                phone: userData.phone 
            });
            
            const result = await Utils.makeApiCall(CONFIG.API_BASE_URL + CONFIG.API_ENDPOINTS.AUTH.REGISTER, {
                method: 'POST',
                body: JSON.stringify(userData)
            });
            
            console.log('Registration response:', result);
            
            if (result.success && result.data.success) {
                this.saveUser(result.data.user);
                this.uiManager.showToast('Account created successfully!', 'success');
                return { success: true, user: result.data.user };
            } else {
                const message = result.data.message || 'Registration failed';
                this.uiManager.showToast(message, 'error');
                return { success: false, message };
            }
        } catch (error) {
            console.error('Registration error:', error);
            this.uiManager.showToast('Registration failed: Network error', 'error');
            return { success: false, message: 'Network error' };
        }
    }
    
    // 🔄 Refresh balance
    async refreshBalance() {
        if (!this.currentUser) return;
        
        try {
            const result = await Utils.makeApiCall(
                `${CONFIG.API_BASE_URL}${CONFIG.API_ENDPOINTS.AUTH.REFRESH_BALANCE}/${this.currentUser.id}`
            );
            
            if (result.success && result.data.success && result.data.balance !== undefined) {
                this.currentUser.balance = result.data.balance;
                this.saveUser(this.currentUser);
                return result.data.balance;
            }
        } catch (error) {
            console.error('Failed to refresh balance:', error);
        }
        return null;
    }
    
    // 🚪 Logout
    logout() {
        this.currentUser = null;
        localStorage.removeItem(CONFIG.STORAGE_KEYS.USER);
        console.log('👋 User logged out');
        this.uiManager.showToast('Logged out successfully', 'info');
    }
    
    // ✅ Check if user is logged in
    isLoggedIn() {
        return this.currentUser !== null;
    }
    
    // 👤 Get current user
    getCurrentUser() {
        return this.currentUser;
    }
}

// Export for ES6 modules (if supported)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthManager;
}
