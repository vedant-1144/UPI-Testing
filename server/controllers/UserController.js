// 👤 User Controller
const Logger = require('../middleware/logger');

class UserController {
    constructor(userModel) {
        this.userModel = userModel;
    }
    
    // 📋 Get all users
    async getAllUsers(req, res) {
        try {
            const users = await this.userModel.getAll();
            
            // Remove sensitive data from response
            const safeUsers = users.map(user => ({
                id: user.id,
                name: user.name,
                phone: user.phone,
                email: user.email,
                balance: user.balance,
                upi_id: user.upi_id,
                is_locked: user.is_locked,
                failed_login_attempts: user.failed_login_attempts,
                last_login: user.last_login,
                created_at: user.created_at
            }));
            
            res.json({
                success: true,
                users: safeUsers
            });
            
        } catch (error) {
            Logger.error(`Get all users error: ${error.message}`);
            res.status(500).json({
                success: false,
                message: 'Failed to get users'
            });
        }
    }
    
    // 👤 Get user by ID
    async getUserById(req, res) {
        try {
            const { id } = req.params;
            
            const user = await this.userModel.findById(id);
            
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }
            
            // Remove sensitive data from response
            const safeUser = {
                id: user.id,
                name: user.name,
                phone: user.phone,
                email: user.email,
                balance: user.balance,
                upi_id: user.upi_id,
                is_locked: user.is_locked,
                failed_login_attempts: user.failed_login_attempts,
                last_login: user.last_login,
                created_at: user.created_at
            };
            
            res.json({
                success: true,
                user: safeUser
            });
            
        } catch (error) {
            Logger.error(`Get user by ID error: ${error.message}`);
            res.status(500).json({
                success: false,
                message: 'Failed to get user'
            });
        }
    }
    
    // 💰 Update user balance
    async updateUserBalance(req, res) {
        try {
            const { id } = req.params;
            const { balance } = req.body;
            
            if (typeof balance !== 'number' || balance < 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid balance amount'
                });
            }
            
            const user = await this.userModel.findById(id);
            
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }
            
            await this.userModel.updateBalance(id, balance);
            
            Logger.info(`Balance updated for user ${user.name}: ₹${balance}`);
            
            res.json({
                success: true,
                message: 'Balance updated successfully',
                balance: balance
            });
            
        } catch (error) {
            Logger.error(`Update balance error: ${error.message}`);
            res.status(500).json({
                success: false,
                message: 'Failed to update balance'
            });
        }
    }
    
    // 📞 Find user by phone
    async findUserByPhone(req, res) {
        try {
            const { phone } = req.params;
            
            const user = await this.userModel.findByPhone(phone);
            
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }
            
            // Return minimal user info for UPI lookup
            const minimalUser = {
                id: user.id,
                name: user.name,
                phone: user.phone,
                upi_id: user.upi_id
            };
            
            res.json({
                success: true,
                user: minimalUser
            });
            
        } catch (error) {
            Logger.error(`Find user by phone error: ${error.message}`);
            res.status(500).json({
                success: false,
                message: 'Failed to find user'
            });
        }
    }
    
    // 🔍 Search users
    async searchUsers(req, res) {
        try {
            const { query } = req.query;
            
            if (!query || query.length < 2) {
                return res.status(400).json({
                    success: false,
                    message: 'Search query must be at least 2 characters'
                });
            }
            
            const users = await this.userModel.search(query);
            
            // Return minimal user info for search results
            const searchResults = users.map(user => ({
                id: user.id,
                name: user.name,
                phone: user.phone,
                upi_id: user.upi_id,
                is_locked: user.is_locked
            }));
            
            res.json({
                success: true,
                users: searchResults
            });
            
        } catch (error) {
            Logger.error(`Search users error: ${error.message}`);
            res.status(500).json({
                success: false,
                message: 'Failed to search users'
            });
        }
    }
}

module.exports = UserController;
