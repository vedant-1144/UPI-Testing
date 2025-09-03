// 📊 Logging Middleware

class Logger {
    static logRequest(req, res, next) {
        const start = Date.now();
        const method = req.method;
        const url = req.url;
        const userAgent = req.get('User-Agent') || 'Unknown';
        const ip = req.ip || req.connection.remoteAddress;
        
        // Log request start
        console.log(`\x1b[34m📡 ${method} ${url} - Started\x1b[0m`);
        
        // Log request details in development
        if (process.env.NODE_ENV === 'development') {
            console.log(`\x1b[90m   📍 IP: ${ip}\x1b[0m`);
            console.log(`\x1b[90m   🌐 User-Agent: ${userAgent.substring(0, 50)}...\x1b[0m`);
            
            if (Object.keys(req.body).length > 0) {
                console.log(`\x1b[90m   📦 Body: ${JSON.stringify(req.body, null, 2)}\x1b[0m`);
            }
        }
        
        // Capture response end
        const originalSend = res.send;
        res.send = function(body) {
            const duration = Date.now() - start;
            const statusCode = res.statusCode;
            
            // Choose color based on status code
            let statusColor = '\x1b[32m'; // green
            if (statusCode >= 400 && statusCode < 500) {
                statusColor = '\x1b[33m'; // yellow
            } else if (statusCode >= 500) {
                statusColor = '\x1b[31m'; // red
            }
            
            console.log(`${statusColor}✅ ${method} ${url} - ${statusCode} (${duration}ms)\x1b[0m`);
            
            // Log response body in development for errors
            if (process.env.NODE_ENV === 'development' && statusCode >= 400) {
                try {
                    const responseBody = JSON.parse(body);
                    console.log(`\x1b[31m   ❌ Error: ${responseBody.message || 'Unknown error'}\x1b[0m`);
                } catch (e) {
                    // Response body is not JSON
                }
            }
            
            originalSend.call(this, body);
        };
        
        next();
    }
    
    static logError(error, req, res, next) {
        console.error('\x1b[31m💥 Unhandled Error:\x1b[0m');
        console.error(`\x1b[31m   Route: ${req.method} ${req.url}\x1b[0m`);
        console.error(`\x1b[31m   Error: ${error.message}\x1b[0m`);
        console.error(`\x1b[31m   Stack: ${error.stack}\x1b[0m`);
        
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            ...(process.env.NODE_ENV === 'development' && { error: error.message })
        });
    }
    
    static info(message) {
        console.log(`\x1b[34mℹ️  ${message}\x1b[0m`);
    }
    
    static success(message) {
        console.log(`\x1b[32m✅ ${message}\x1b[0m`);
    }
    
    static warning(message) {
        console.log(`\x1b[33m⚠️  ${message}\x1b[0m`);
    }
    
    static error(message) {
        console.log(`\x1b[31m❌ ${message}\x1b[0m`);
    }
    
    static warn(message) {
        console.log(`\x1b[33m⚠️  ${message}\x1b[0m`);
    }
    
    // Middleware function
    static get middleware() {
        return this.logRequest;
    }
}

module.exports = Logger;
