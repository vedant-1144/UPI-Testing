// 🔧 Server Configuration
module.exports = {
    PORT: process.env.PORT || 3000,
    NODE_ENV: process.env.NODE_ENV || 'development',
    
    // Database settings
    DB_CONFIG: {
        user: process.env.DB_USER || 'postgres',
        host: process.env.DB_HOST || 'localhost',
        database: process.env.DB_NAME || 'upi_simulator',
        password: process.env.DB_PASSWORD || 'password',
        port: process.env.DB_PORT || 5432,
    },

    // CORS settings
    CORS_OPTIONS: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        credentials: true,
        optionsSuccessStatus: 200
    },
    
    // Rate limiting
    RATE_LIMIT: {
        windowMs: 5 * 60 * 1000, // 5 minutes
        max: 100, // limit each IP to 100 requests per windowMs
        message: 'Too many requests from this IP, please try again later.'
    },
    
    // Transaction limits
    TRANSACTION_LIMITS: {
        MIN_AMOUNT: 1,
        MAX_AMOUNT: 50000,
        DAILY_LIMIT: 100000
    },
    
    // Security settings
    SECURITY: {
        MAX_LOGIN_ATTEMPTS: 3,
        LOCKOUT_TIME: 30 * 60 * 1000, // 30 minutes
        PIN_LENGTH: { min: 4, max: 6 }
    },
    
    // Static file serving
    STATIC_PATH: process.env.STATIC_PATH || '../client',
    
    // Logging
    LOGGING: {
        LEVEL: process.env.LOG_LEVEL || 'info',
        ENABLE_REQUEST_LOGGING: process.env.ENABLE_REQUEST_LOGGING !== 'false'
    }
};
