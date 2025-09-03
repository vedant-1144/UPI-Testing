// 👨‍💼 Admin Controller
const Logger = require('../middleware/logger');

class AdminController {
    constructor(userModel, transactionModel) {
        this.userModel = userModel;
        this.transactionModel = transactionModel;
    }
    
    // 🔓 Unlock user account
    async unlockAccount(req, res) {
        try {
            const { userId } = req.params;
            
            const user = await this.userModel.findById(userId);
            
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }
            
            if (!user.is_locked) {
                return res.status(400).json({
                    success: false,
                    message: 'Account is not locked'
                });
            }
            
            await this.userModel.unlockAccount(userId);
            
            Logger.info(`Account unlocked for user: ${user.name} (${user.phone})`);
            
            res.json({
                success: true,
                message: 'Account unlocked successfully'
            });
            
        } catch (error) {
            Logger.error(`Unlock account error: ${error.message}`);
            res.status(500).json({
                success: false,
                message: 'Failed to unlock account'
            });
        }
    }
    
    // 🔒 Get locked accounts
    async getLockedAccounts(req, res) {
        try {
            const lockedUsers = await this.userModel.getLockedAccounts();
            
            // Remove sensitive data from response
            const safeUsers = lockedUsers.map(user => ({
                id: user.id,
                name: user.name,
                phone: user.phone,
                email: user.email,
                balance: user.balance,
                upi_id: user.upi_id,
                failed_login_attempts: user.failed_login_attempts,
                last_failed_login: user.last_failed_login,
                created_at: user.created_at
            }));
            
            res.json({
                success: true,
                lockedAccounts: safeUsers
            });
            
        } catch (error) {
            Logger.error(`Get locked accounts error: ${error.message}`);
            res.status(500).json({
                success: false,
                message: 'Failed to get locked accounts'
            });
        }
    }
    
    // 🗑️ Clear all users
    async clearAllUsers(req, res) {
        try {
            await this.userModel.clearAll();
            
            Logger.warn('All users cleared from database');
            
            res.json({
                success: true,
                message: 'All users cleared successfully'
            });
            
        } catch (error) {
            Logger.error(`Clear all users error: ${error.message}`);
            res.status(500).json({
                success: false,
                message: 'Failed to clear users'
            });
        }
    }
    
    // 👥 Create demo users
    async createDemoUsers(req, res) {
        try {
            const demoUsers = await this.userModel.createDemoUsers();
            
            Logger.success(`Demo users created: ${demoUsers.length} users`);
            
            res.json({
                success: true,
                message: 'Demo users created successfully',
                users: demoUsers
            });
            
        } catch (error) {
            Logger.error(`Create demo users error: ${error.message}`);
            res.status(500).json({
                success: false,
                message: 'Failed to create demo users'
            });
        }
    }
    
    // 📊 Get system statistics
    async getSystemStats(req, res) {
        try {
            const userStats = await this.userModel.getStats();
            const transactionStats = await this.transactionModel.getStats();
            
            res.json({
                success: true,
                stats: {
                    users: {
                        total: parseInt(userStats.total_users),
                        active: parseInt(userStats.active_users),
                        locked: parseInt(userStats.locked_users),
                        total_balance: parseFloat(userStats.total_balance) || 0
                    },
                    transactions: {
                        total: parseInt(transactionStats.total_transactions),
                        successful: parseInt(transactionStats.successful_transactions),
                        failed: parseInt(transactionStats.failed_transactions),
                        total_amount: parseFloat(transactionStats.total_amount) || 0,
                        average_amount: parseFloat(transactionStats.average_amount) || 0
                    }
                }
            });
            
        } catch (error) {
            Logger.error(`Get system stats error: ${error.message}`);
            res.status(500).json({
                success: false,
                message: 'Failed to get system statistics'
            });
        }
    }
    
    // 🏥 Health check
    async healthCheck(req, res) {
        try {
            // Check database connection
            const dbStatus = await this.userModel.checkConnection();
            
            res.json({
                success: true,
                status: 'healthy',
                database: dbStatus ? 'connected' : 'disconnected',
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            Logger.error(`Health check error: ${error.message}`);
            res.status(500).json({
                success: false,
                status: 'unhealthy',
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }
    
    // 🔄 Reset user PIN attempts
    async resetLoginAttempts(req, res) {
        try {
            const { userId } = req.params;
            
            const user = await this.userModel.findById(userId);
            
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }
            
            await this.userModel.resetFailedAttempts(userId);
            
            Logger.info(`Login attempts reset for user: ${user.name} (${user.phone})`);
            
            res.json({
                success: true,
                message: 'Login attempts reset successfully'
            });
            
        } catch (error) {
            Logger.error(`Reset login attempts error: ${error.message}`);
            res.status(500).json({
                success: false,
                message: 'Failed to reset login attempts'
            });
        }
    }
}

module.exports = AdminController;
