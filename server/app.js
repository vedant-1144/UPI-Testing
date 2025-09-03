// 🚀 PayEase UPI Payment Simulator Server
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Import configuration and database
const config = require('./config/app');
const database = require('./config/database');

// Import routes
const initializeRoutes = require('./routes/api');

// Import utilities
const Logger = require('./middleware/logger');

class PayEaseServer {
    constructor() {
        this.app = express();
        this.db = null;
        this.server = null;
    }
    
    // 🏗️ Initialize server
    async initialize() {
        try {
            Logger.info('🚀 Starting PayEase Server...');
            
            // Initialize database
            await this.initializeDatabase();
            
            // Setup middleware
            this.setupMiddleware();
            
            // Setup routes
            this.setupRoutes();
            
            // Setup static files
            this.setupStaticFiles();
            
            // Setup error handling
            this.setupErrorHandling();
            
            Logger.success('✅ Server initialized successfully');
            
        } catch (error) {
            Logger.error(`Failed to initialize server: ${error.message}`);
            process.exit(1);
        }
    }
    
    // 🗄️ Initialize database
    async initializeDatabase() {
        try {
            Logger.info('📦 Connecting to database...');
            this.db = await database.initialize();
            Logger.success('✅ Database connected and tables created');
        } catch (error) {
            Logger.error(`Database initialization failed: ${error.message}`);
            throw error;
        }
    }
    
    // ⚙️ Setup middleware
    setupMiddleware() {
        // CORS configuration
        this.app.use(cors({
            origin: config.CORS_OPTIONS.origin,
            credentials: config.CORS_OPTIONS.credentials,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization']
        }));
        
        // Body parsing
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
        
        // Request logging
        this.app.use((req, res, next) => {
            const timestamp = new Date().toISOString();
            Logger.info(`${timestamp} | ${req.method} ${req.path} | IP: ${req.ip}`);
            next();
        });
        
        Logger.info('⚙️ Middleware configured');
    }
    
    // 🛣️ Setup routes
    setupRoutes() {
        // API routes
        this.app.use('/api', initializeRoutes(this.db));
        
        // Root endpoint
        this.app.get('/', (req, res) => {
            res.json({
                success: true,
                message: '💳 PayEase UPI Payment Simulator API',
                version: '2.0.0',
                status: 'active',
                endpoints: {
                    api: '/api/docs',
                    health: '/api/admin/health',
                    demo: '/api/admin/demo-users'
                },
                timestamp: new Date().toISOString()
            });
        });
        
        Logger.info('🛣️ Routes configured');
    }
    
    // 📁 Setup static files
    setupStaticFiles() {
        // Serve client files
        const clientPath = path.join(__dirname, '../client');
        this.app.use('/client', express.static(clientPath));
        
        // Serve assets directly for proper relative path resolution
        this.app.use('/assets', express.static(path.join(clientPath, 'assets')));
        
        // Serve frontend files (legacy)
        const frontendPath = path.join(__dirname, '../frontend');
        this.app.use('/frontend', express.static(frontendPath));
        
        // Default to client/pages/index.html for web interface
        this.app.get('/app', (req, res) => {
            res.sendFile(path.join(clientPath, 'pages', 'index.html'));
        });
        
        this.app.get('/admin', (req, res) => {
            res.sendFile(path.join(clientPath, 'pages', 'admin.html'));
        });
        
        Logger.info('📁 Static files configured');
    }
    
    // 🚨 Setup error handling
    setupErrorHandling() {
        // Handle 404
        this.app.use('*', (req, res) => {
            res.status(404).json({
                success: false,
                message: `Route ${req.method} ${req.originalUrl} not found`,
                availableEndpoints: {
                    api: '/api/docs',
                    app: '/app',
                    admin: '/admin'
                }
            });
        });
        
        // Global error handler
        this.app.use((error, req, res, next) => {
            Logger.error(`Unhandled error: ${error.message}`);
            
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                ...(config.ENV === 'development' && { error: error.message })
            });
        });
        
        // Handle uncaught exceptions
        process.on('uncaughtException', (error) => {
            Logger.error(`Uncaught Exception: ${error.message}`);
            this.gracefulShutdown(1);
        });
        
        // Handle unhandled promise rejections
        process.on('unhandledRejection', (reason, promise) => {
            Logger.error(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
            this.gracefulShutdown(1);
        });
        
        // Handle SIGTERM
        process.on('SIGTERM', () => {
            Logger.info('SIGTERM received');
            this.gracefulShutdown(0);
        });
        
        // Handle SIGINT (Ctrl+C)
        process.on('SIGINT', () => {
            Logger.info('SIGINT received');
            this.gracefulShutdown(0);
        });
        
        Logger.info('🚨 Error handling configured');
    }
    
    // 🔥 Start server
    async start() {
        try {
            await this.initialize();
            
            this.server = this.app.listen(config.PORT, () => {
                Logger.success(`
╔══════════════════════════════════════════════════════════════╗
║                    💳 PayEase Server Ready                   ║
╠══════════════════════════════════════════════════════════════╣
║  🌐 Server URL: http://localhost:${config.PORT}                           ║
║  📱 Web App: http://localhost:${config.PORT}/app                        ║
║  👨‍💼 Admin Panel: http://localhost:${config.PORT}/admin                   ║
║  📋 API Docs: http://localhost:${config.PORT}/api/docs                  ║
║  🏥 Health Check: http://localhost:${config.PORT}/api/admin/health      ║
╠══════════════════════════════════════════════════════════════╣
║  Environment: ${config.NODE_ENV || 'development'}     | Database: PostgreSQL        ║
║  Version: 2.0.0     | Status: Active                       ║
╚══════════════════════════════════════════════════════════════╝
                `);
            });
            
        } catch (error) {
            Logger.error(`Failed to start server: ${error.message}`);
            process.exit(1);
        }
    }
    
    // 🛑 Graceful shutdown
    async gracefulShutdown(exitCode) {
        Logger.info('🛑 Graceful shutdown initiated...');
        
        if (this.server) {
            this.server.close(() => {
                Logger.info('🔌 HTTP server closed');
            });
        }
        
        if (this.db) {
            try {
                await this.db.end();
                Logger.info('📦 Database connection closed');
            } catch (error) {
                Logger.error(`Error closing database: ${error.message}`);
            }
        }
        
        Logger.info('👋 Shutdown complete');
        process.exit(exitCode);
    }
}

// 🚀 Start the server
if (require.main === module) {
    const server = new PayEaseServer();
    server.start();
}

module.exports = PayEaseServer;
