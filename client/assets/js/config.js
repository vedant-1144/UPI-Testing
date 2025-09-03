// 🔧 Application Configuration
const CONFIG = {
    API_BASE_URL: 'http://localhost:3000',
    API_ENDPOINTS: {
        AUTH: {
            LOGIN: '/api/auth/login',
            REGISTER: '/api/auth/register',
            REFRESH_BALANCE: '/api/auth/refresh-balance'
        },
        TRANSACTIONS: {
            CREATE: '/api/transactions',
            GET_BY_USER: '/api/transactions',
            GET_ALL: '/api/transactions/all'
        },
        USERS: {
            GET_ALL: '/api/users',
            CREATE_DEMO: '/api/create-demo-users',
            CLEAR_ALL: '/api/clear-users'
        },
        ADMIN: {
            LOCKED_ACCOUNTS: '/api/admin/locked-accounts',
            UNLOCK_ACCOUNT: '/api/admin/unlock-account'
        },
        HEALTH: {
            DB_TEST: '/api/db-test',
            HEALTH: '/api/health'
        }
    },
    UI: {
        TOAST_DURATION: 5000,
        ANIMATION_DELAY: 300,
        MAX_TRANSACTION_AMOUNT: 50000,
        MIN_TRANSACTION_AMOUNT: 1
    },
    STORAGE_KEYS: {
        USER: 'payease_user',
        THEME: 'payease_theme'
    }
};

// Export for ES6 modules (if supported)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}
