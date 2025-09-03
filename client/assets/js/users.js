// 👥 User Manager
class UserManager {
    constructor(authManager, uiManager) {
        this.authManager = authManager;
        this.uiManager = uiManager;
    }
    
    // 📋 Get all users (excluding current user)
    async getUsers(excludeCurrentUser = true) {
        try {
            const currentUser = this.authManager.getCurrentUser();
            let url = CONFIG.API_BASE_URL + CONFIG.API_ENDPOINTS.USERS.GET_ALL;
            
            if (excludeCurrentUser && currentUser) {
                url += `?excludeUserId=${currentUser.id}`;
            }
            
            console.log('📡 Fetching users from:', url);
            
            const result = await Utils.makeApiCall(url);
            
            console.log('Users API response:', result);
            
            if (result.success && result.data.success) {
                return { 
                    success: true, 
                    users: result.data.users || [] 
                };
            } else {
                return { 
                    success: false, 
                    message: result.data.message || 'Failed to load users' 
                };
            }
        } catch (error) {
            console.error('Failed to load users:', error);
            return { 
                success: false, 
                message: 'Network error' 
            };
        }
    }
    
    // 🎭 Create demo users
    async createDemoUsers() {
        try {
            console.log('🎭 Creating demo users...');
            
            const result = await Utils.makeApiCall(CONFIG.API_BASE_URL + CONFIG.API_ENDPOINTS.USERS.CREATE_DEMO, {
                method: 'POST'
            });
            
            if (result.success && result.data.success) {
                this.uiManager.showToast('Demo users created successfully!', 'success');
                return { success: true, users: result.data.users };
            } else {
                const message = result.data.message || 'Failed to create demo users';
                this.uiManager.showToast(message, 'error');
                return { success: false, message };
            }
        } catch (error) {
            console.error('Failed to create demo users:', error);
            this.uiManager.showToast('Failed to create demo users: Network error', 'error');
            return { success: false, message: 'Network error' };
        }
    }
    
    // 🗑️ Clear all users (development)
    async clearAllUsers() {
        try {
            console.log('🗑️ Clearing all users...');
            
            const result = await Utils.makeApiCall(CONFIG.API_BASE_URL + CONFIG.API_ENDPOINTS.USERS.CLEAR_ALL, {
                method: 'POST'
            });
            
            if (result.success && result.data.success) {
                this.uiManager.showToast('All users cleared successfully!', 'success');
                // Logout current user as they might have been deleted
                this.authManager.logout();
                return { success: true };
            } else {
                const message = result.data.message || 'Failed to clear users';
                this.uiManager.showToast(message, 'error');
                return { success: false, message };
            }
        } catch (error) {
            console.error('Failed to clear users:', error);
            this.uiManager.showToast('Failed to clear users: Network error', 'error');
            return { success: false, message: 'Network error' };
        }
    }
    
    // 🔍 Find user by phone or UPI ID
    findUserByIdentifier(users, identifier) {
        return users.find(user => 
            user.phone === identifier || 
            user.email === identifier ||
            `${user.phone}@payease` === identifier
        );
    }
    
    // 🏷️ Format user for display
    formatUserForDisplay(user) {
        return {
            ...user,
            displayName: user.name,
            displayPhone: user.phone,
            displayEmail: user.email,
            upiId: `${user.phone}@payease`,
            formattedBalance: Utils.formatCurrency(user.balance || 0),
            initials: this.getUserInitials(user.name),
            statusIcon: user.is_locked ? 'fa-lock' : 'fa-check-circle',
            statusClass: user.is_locked ? 'text-danger' : 'text-success'
        };
    }
    
    // 🔤 Get user initials
    getUserInitials(name) {
        if (!name) return '??';
        const words = name.trim().split(' ');
        if (words.length === 1) {
            return words[0].substring(0, 2).toUpperCase();
        }
        return (words[0][0] + words[words.length - 1][0]).toUpperCase();
    }
    
    // ✅ Validate user data
    validateUserData(userData) {
        const errors = [];
        
        if (!userData.name || userData.name.trim().length < 2) {
            errors.push('Name must be at least 2 characters');
        }
        
        if (!userData.email || !Utils.validateEmail(userData.email)) {
            errors.push('Valid email is required');
        }
        
        if (!userData.phone || !Utils.validatePhone(userData.phone)) {
            errors.push('Valid 10-digit phone number is required');
        }
        
        if (!userData.pin || !Utils.validatePin(userData.pin)) {
            errors.push('PIN must be 4-6 digits');
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }
}

// Export for ES6 modules (if supported)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UserManager;
}
