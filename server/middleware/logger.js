// 📊 Logging Middleware
const chalk = require('chalk');

class Logger {
    static logRequest(req, res, next) {
        const start = Date.now();
        const method = req.method;
        const url = req.url;
        const userAgent = req.get('User-Agent') || 'Unknown';
        const ip = req.ip || req.connection.remoteAddress;
        
        // Log request start
        console.log(chalk.blue(`📡 ${method} ${url} - Started`));
        
        // Log request details in development
        if (process.env.NODE_ENV === 'development') {
            console.log(chalk.gray(`   📍 IP: ${ip}`));
            console.log(chalk.gray(`   🌐 User-Agent: ${userAgent.substring(0, 50)}...`));
            
            if (Object.keys(req.body).length > 0) {
                console.log(chalk.gray(`   📦 Body: ${JSON.stringify(req.body, null, 2)}`));
            }
        }
        
        // Capture response end
        const originalSend = res.send;
        res.send = function(body) {
            const duration = Date.now() - start;
            const statusCode = res.statusCode;
            
            // Choose color based on status code
            let statusColor = chalk.green;
            if (statusCode >= 400 && statusCode < 500) {
                statusColor = chalk.yellow;
            } else if (statusCode >= 500) {
                statusColor = chalk.red;
            }
            
            console.log(statusColor(`✅ ${method} ${url} - ${statusCode} (${duration}ms)`));
            
            // Log response body in development for errors
            if (process.env.NODE_ENV === 'development' && statusCode >= 400) {
                try {
                    const responseBody = JSON.parse(body);
                    console.log(chalk.red(`   ❌ Error: ${responseBody.message || 'Unknown error'}`));
                } catch (e) {
                    // Response body is not JSON
                }
            }
            
            originalSend.call(this, body);
        };
        
        next();
    }
    
    static logError(error, req, res, next) {
        console.error(chalk.red('💥 Unhandled Error:'));
        console.error(chalk.red(`   Route: ${req.method} ${req.url}`));
        console.error(chalk.red(`   Error: ${error.message}`));
        console.error(chalk.red(`   Stack: ${error.stack}`));
        
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            ...(process.env.NODE_ENV === 'development' && { error: error.message })
        });
    }
    
    static info(message) {
        console.log(chalk.blue(`ℹ️  ${message}`));
    }
    
    static success(message) {
        console.log(chalk.green(`✅ ${message}`));
    }
    
    static warning(message) {
        console.log(chalk.yellow(`⚠️  ${message}`));
    }
    
    static error(message) {
        console.log(chalk.red(`❌ ${message}`));
    }
}

module.exports = Logger;
