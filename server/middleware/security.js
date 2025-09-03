// 🛡️ Security Middleware
const rateLimit = require('express-rate-limit');
const config = require('../config/app');

class SecurityMiddleware {
    static rateLimiter() {
        return rateLimit({
            windowMs: config.RATE_LIMIT.windowMs,
            max: config.RATE_LIMIT.max,
            message: {
                success: false,
                message: config.RATE_LIMIT.message
            },
            standardHeaders: true,
            legacyHeaders: false,
        });
    }
    
    static corsHandler() {
        return (req, res, next) => {
            const origin = req.headers.origin;
            const allowedOrigins = [
                'http://localhost:3000',
                'http://127.0.0.1:3000',
                config.CORS_OPTIONS.origin
            ];
            
            if (allowedOrigins.includes(origin)) {
                res.header('Access-Control-Allow-Origin', origin);
            }
            
            res.header('Access-Control-Allow-Credentials', 'true');
            res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
            res.header('Access-Control-Allow-Headers', 'Origin,X-Requested-With,Content-Type,Accept,Authorization');
            
            if (req.method === 'OPTIONS') {
                res.status(200).end();
                return;
            }
            
            next();
        };
    }
    
    static sanitizeInput() {
        return (req, res, next) => {
            // Sanitize request body
            if (req.body) {
                req.body = this.sanitizeObject(req.body);
            }
            
            // Sanitize query parameters
            if (req.query) {
                req.query = this.sanitizeObject(req.query);
            }
            
            next();
        };
    }
    
    static sanitizeObject(obj) {
        if (typeof obj !== 'object' || obj === null) {
            return obj;
        }
        
        const sanitized = {};
        for (const [key, value] of Object.entries(obj)) {
            if (typeof value === 'string') {
                // Basic XSS prevention
                sanitized[key] = value
                    .replace(/[<>]/g, '')
                    .replace(/javascript:/gi, '')
                    .replace(/on\w+=/gi, '')
                    .trim();
            } else if (typeof value === 'object') {
                sanitized[key] = this.sanitizeObject(value);
            } else {
                sanitized[key] = value;
            }
        }
        
        return sanitized;
    }
    
    static validateContentType() {
        return (req, res, next) => {
            if (req.method === 'POST' || req.method === 'PUT') {
                const contentType = req.get('Content-Type');
                if (!contentType || !contentType.includes('application/json')) {
                    return res.status(400).json({
                        success: false,
                        message: 'Content-Type must be application/json'
                    });
                }
            }
            next();
        };
    }
    
    static headerSecurity() {
        return (req, res, next) => {
            // Basic security headers
            res.header('X-Content-Type-Options', 'nosniff');
            res.header('X-Frame-Options', 'DENY');
            res.header('X-XSS-Protection', '1; mode=block');
            res.header('Referrer-Policy', 'strict-origin-when-cross-origin');
            
            // Remove powered by header
            res.removeHeader('X-Powered-By');
            
            next();
        };
    }
}

module.exports = SecurityMiddleware;
