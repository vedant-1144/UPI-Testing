// 🛣️ API Routes
const express = require('express');
const router = express.Router();

// Import controllers
const AuthController = require('../controllers/AuthController');
const UserController = require('../controllers/UserController');
const TransactionController = require('../controllers/TransactionController');
const AdminController = require('../controllers/AdminController');

// Import models
const User = require('../models/User');
const Transaction = require('../models/Transaction');

// Import middleware
const Logger = require('../middleware/logger');
const Security = require('../middleware/security');

// Initialize models with database connection
let userModel, transactionModel;

function initializeRoutes(db) {
    // Initialize models
    userModel = new User(db);
    transactionModel = new Transaction(db);
    
    // Initialize controllers
    const authController = new AuthController(userModel);
    const userController = new UserController(userModel);
    const transactionController = new TransactionController(userModel, transactionModel);
    const adminController = new AdminController(userModel, transactionModel);
    
    // Apply middleware
    router.use(Logger.middleware);
    router.use(Security.rateLimiter());
    router.use(Security.headerSecurity());
    router.use(Security.sanitizeInput());
    
    // 🔐 Authentication routes
    router.post('/auth/register', (req, res) => authController.register(req, res));
    router.post('/auth/login', (req, res) => authController.login(req, res));
    
    // 👤 User routes
    router.get('/users', (req, res) => userController.getAllUsers(req, res));
    router.get('/users/:id', (req, res) => userController.getUserById(req, res));
    router.get('/users/phone/:phone', (req, res) => userController.findUserByPhone(req, res));
    router.get('/users/search', (req, res) => userController.searchUsers(req, res));
    router.put('/users/:id/balance', (req, res) => userController.updateUserBalance(req, res));
    
    // 💳 Transaction routes
    router.post('/transactions', (req, res) => transactionController.createTransaction(req, res));
    router.get('/transactions/user/:userId', (req, res) => transactionController.getUserTransactions(req, res));
    router.get('/transactions', (req, res) => transactionController.getAllTransactions(req, res));
    router.get('/transactions/stats', (req, res) => transactionController.getTransactionStats(req, res));
    
    // 👨‍💼 Admin routes
    router.post('/admin/unlock/:userId', (req, res) => adminController.unlockAccount(req, res));
    router.get('/admin/locked-accounts', (req, res) => adminController.getLockedAccounts(req, res));
    router.delete('/admin/users/clear', (req, res) => adminController.clearAllUsers(req, res));
    router.post('/admin/demo-users', (req, res) => adminController.createDemoUsers(req, res));
    router.get('/admin/stats', (req, res) => adminController.getSystemStats(req, res));
    router.get('/admin/health', (req, res) => adminController.healthCheck(req, res));
    router.post('/admin/reset-attempts/:userId', (req, res) => adminController.resetLoginAttempts(req, res));
    
    // 📋 API documentation endpoint
    router.get('/docs', (req, res) => {
        res.json({
            success: true,
            message: 'PayEase UPI Payment Simulator API',
            version: '2.0.0',
            endpoints: {
                authentication: {
                    'POST /api/auth/register': 'Register new user',
                    'POST /api/auth/login': 'User login'
                },
                users: {
                    'GET /api/users': 'Get all users',
                    'GET /api/users/:id': 'Get user by ID',
                    'GET /api/users/phone/:phone': 'Find user by phone',
                    'GET /api/users/search?query=': 'Search users',
                    'PUT /api/users/:id/balance': 'Update user balance'
                },
                transactions: {
                    'POST /api/transactions': 'Create transaction',
                    'GET /api/transactions/user/:userId': 'Get user transactions',
                    'GET /api/transactions': 'Get all transactions',
                    'GET /api/transactions/stats': 'Get transaction statistics'
                },
                admin: {
                    'POST /api/admin/unlock/:userId': 'Unlock user account',
                    'GET /api/admin/locked-accounts': 'Get locked accounts',
                    'DELETE /api/admin/users/clear': 'Clear all users',
                    'POST /api/admin/demo-users': 'Create demo users',
                    'GET /api/admin/stats': 'Get system statistics',
                    'GET /api/admin/health': 'Health check',
                    'POST /api/admin/reset-attempts/:userId': 'Reset login attempts'
                }
            }
        });
    });
    
    // Handle undefined routes
    router.all('*', (req, res) => {
        res.status(404).json({
            success: false,
            message: `Route ${req.method} ${req.path} not found`,
            availableRoutes: '/api/docs'
        });
    });
    
    return router;
}

module.exports = initializeRoutes;
