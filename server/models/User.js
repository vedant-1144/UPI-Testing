// 👤 User Model
class UserModel {
    constructor(db) {
        this.db = db;
    }
    
    // 🏥 Check database connection
    async checkConnection() {
        try {
            const result = await this.db.query('SELECT 1 as connected');
            return result.rows.length > 0;
        } catch (error) {
            console.error('Database connection check failed:', error);
            return false;
        }
    }
    
    // 🔍 Find user by phone
    async findByPhone(phone) {
        try {
            const result = await this.db.query(
                'SELECT * FROM users WHERE phone = $1',
                [phone]
            );
            return result.rows[0] || null;
        } catch (error) {
            throw new Error(`Error finding user by phone: ${error.message}`);
        }
    }
    
    // 🔍 Find user by email
    async findByEmail(email) {
        try {
            const result = await this.db.query(
                'SELECT * FROM users WHERE email = $1',
                [email]
            );
            return result.rows[0] || null;
        } catch (error) {
            throw new Error(`Error finding user by email: ${error.message}`);
        }
    }
    
    // 🔍 Find user by ID
    async findById(id) {
        try {
            const result = await this.db.query(
                'SELECT * FROM users WHERE id = $1',
                [id]
            );
            return result.rows[0] || null;
        } catch (error) {
            throw new Error(`Error finding user by ID: ${error.message}`);
        }
    }
    
    // 📝 Create new user
    async create(userData) {
        try {
            const result = await this.db.query(
                `INSERT INTO users (name, email, phone, pin, balance) 
                 VALUES ($1, $2, $3, $4, $5) 
                 RETURNING *`,
                [userData.name, userData.email, userData.phone, userData.pin, userData.balance || 0]
            );
            return result.rows[0];
        } catch (error) {
            throw new Error(`Error creating user: ${error.message}`);
        }
    }
    
    // 💰 Update user balance
    async updateBalance(userId, newBalance) {
        try {
            const result = await this.db.query(
                'UPDATE users SET balance = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
                [newBalance, userId]
            );
            return result.rows[0];
        } catch (error) {
            throw new Error(`Error updating user balance: ${error.message}`);
        }
    }
    
    // 🔒 Update login attempts
    async updateLoginAttempts(userId, attempts, lockUntil = null) {
        try {
            const result = await this.db.query(
                `UPDATE users SET 
                 failed_login_attempts = $1, 
                 last_failed_login = CURRENT_TIMESTAMP,
                 locked_at = $2,
                 is_locked = $3
                 WHERE id = $4 RETURNING *`,
                [attempts, lockUntil, lockUntil !== null, userId]
            );
            return result.rows[0];
        } catch (error) {
            throw new Error(`Error updating login attempts: ${error.message}`);
        }
    }
    
    // 🔓 Unlock user account
    async unlockAccount(userId) {
        try {
            const result = await this.db.query(
                `UPDATE users SET 
                 failed_login_attempts = 0, 
                 is_locked = FALSE,
                 locked_at = NULL
                 WHERE id = $1 RETURNING *`,
                [userId]
            );
            return result.rows[0];
        } catch (error) {
            throw new Error(`Error unlocking user account: ${error.message}`);
        }
    }
    
    // 📋 Get all users (excluding specified user)
    async getAll(excludeUserId = null) {
        try {
            let query = 'SELECT id, name, phone, email, balance, is_locked FROM users';
            let params = [];
            
            if (excludeUserId) {
                query += ' WHERE id != $1';
                params.push(excludeUserId);
            }
            
            query += ' ORDER BY name ASC';
            
            const result = await this.db.query(query, params);
            return result.rows;
        } catch (error) {
            throw new Error(`Error getting all users: ${error.message}`);
        }
    }
    
    // 🔒 Get locked accounts
    async getLockedAccounts() {
        try {
            const result = await this.db.query(
                'SELECT id, name, phone, email, locked_at, failed_login_attempts FROM users WHERE is_locked = TRUE ORDER BY locked_at DESC'
            );
            return result.rows;
        } catch (error) {
            throw new Error(`Error getting locked accounts: ${error.message}`);
        }
    }
    
    // � Create demo users
    async createDemoUsers() {
        const bcrypt = require('bcrypt');
        const saltRounds = 10;
        
        const demoUsers = [
            {
                name: 'Alice Johnson',
                email: 'alice@example.com',
                phone: '9876543210',
                pin: '1234',
                balance: 10000.00
            },
            {
                name: 'Bob Smith',
                email: 'bob@example.com',
                phone: '9876543211',
                pin: '1234',
                balance: 15000.00
            },
            {
                name: 'Charlie Brown',
                email: 'charlie@example.com',
                phone: '9876543212',
                pin: '1234',
                balance: 8500.00
            }
        ];
        
        const createdUsers = [];
        
        for (const userData of demoUsers) {
            try {
                // Check if user already exists
                const existingUser = await this.findByPhone(userData.phone);
                if (existingUser) {
                    console.log(`Demo user ${userData.name} already exists`);
                    createdUsers.push({
                        ...existingUser,
                        pin: undefined // Don't return PIN
                    });
                    continue;
                }
                
                // Hash the PIN
                const hashedPin = await bcrypt.hash(userData.pin, saltRounds);
                const upiId = `${userData.phone}@payease`;
                
                const result = await this.db.query(`
                    INSERT INTO users (name, email, phone, pin, balance, upi_id)
                    VALUES ($1, $2, $3, $4, $5, $6)
                    RETURNING id, name, email, phone, balance, upi_id, created_at
                `, [userData.name, userData.email, userData.phone, hashedPin, userData.balance, upiId]);
                
                createdUsers.push(result.rows[0]);
                console.log(`✅ Demo user created: ${userData.name} (${userData.phone})`);
                
            } catch (error) {
                console.error(`❌ Error creating demo user ${userData.name}: ${error.message}`);
            }
        }
        
        return createdUsers;
    }
    
    // 🗑️ Clear all users (development only)
    async clearAll() {
        try {
            await this.db.query('DELETE FROM users');
            return true;
        } catch (error) {
            throw new Error(`Error clearing all users: ${error.message}`);
        }
    }
    
    // �🗑️ Delete all users (development only)
    async deleteAll() {
        try {
            await this.db.query('DELETE FROM users');
            return true;
        } catch (error) {
            throw new Error(`Error deleting all users: ${error.message}`);
        }
    }
}

module.exports = UserModel;
