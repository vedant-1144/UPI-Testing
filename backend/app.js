const express = require('express');
const cors = require('cors');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Database connection
const pool = new Pool({
    user: process.env.PG_USER,
    host: process.env.PG_HOST,
    database: process.env.PG_DATABASE,
    password: process.env.PG_PASSWORD,
    port: process.env.PG_PORT,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

// Disable Express default logging and suppress deprecation warnings
process.env.NODE_NO_WARNINGS = '1';

// Custom minimal logging middleware (for debugging API calls)
app.use((req, res, next) => {
    // Log all API calls for debugging
    if (req.path.startsWith('/api/')) {
        const start = Date.now();
        console.log(`📡 ${req.method} ${req.path} - Started`);
        
        res.on('finish', () => {
            const duration = Date.now() - start;
            if (res.statusCode >= 400) {
                console.log(`❌ ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
            } else {
                console.log(`✅ ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
            }
        });
    }
    next();
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend'), {
    // Disable etag to prevent some warnings
    etag: false,
    // Disable directory listing
    index: ['index.html'],
    // Set cache control
    maxAge: '1d',
    // Disable logging for static files
    silent: true
}));

// Initialize database
async function initializeDatabase() {
    try {
        await createTables();
        console.log('✅ Database ready');
    } catch (error) {
        console.error('❌ Database error:', error.message);
    }
}

async function createTables() {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');

        // Create users table (don't drop if exists to preserve data)
        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                phone VARCHAR(15) UNIQUE NOT NULL,
                pin VARCHAR(6) NOT NULL,
                balance DECIMAL(12,2) DEFAULT 0.00,
                is_locked BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create transactions table (don't drop if exists to preserve data)
        await client.query(`
            CREATE TABLE IF NOT EXISTS transactions (
                id SERIAL PRIMARY KEY,
                reference_id VARCHAR(50) UNIQUE NOT NULL,
                from_user_id INTEGER REFERENCES users(id),
                to_upi_id VARCHAR(255) NOT NULL,
                amount DECIMAL(12,2) NOT NULL,
                description TEXT,
                status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
                transaction_type VARCHAR(20) DEFAULT 'DEBIT',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create indexes for better performance
        await client.query('CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone)');
        await client.query('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');
        await client.query('CREATE INDEX IF NOT EXISTS idx_transactions_from_user ON transactions(from_user_id)');
        await client.query('CREATE INDEX IF NOT EXISTS idx_transactions_ref ON transactions(reference_id)');
        await client.query('CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status)');

        await client.query('COMMIT');
        console.log('✅ Database tables verified/created');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Database setup failed:', error.message);
        throw error;
    } finally {
        client.release();
    }
}

// Initialize database on startup
initializeDatabase();

// Helper function to generate reference ID
function generateReferenceId() {
    return 'REF' + Date.now() + Math.floor(Math.random() * 1000);
}

// Routes

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'PayEase API is running', timestamp: new Date().toISOString() });
});

// Database health check and testing endpoint
app.get('/api/db-test', async (req, res) => {
    try {
        console.log('🔍 Testing database connection...');
        
        // Test basic connection
        const connectionTest = await pool.query('SELECT NOW() as current_time, version() as pg_version');
        console.log('✅ Database connection successful');
        
        // Test if tables exist
        const tablesTest = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('users', 'transactions')
        `);
        console.log('📋 Available tables:', tablesTest.rows);
        
        // Count existing users
        const userCount = await pool.query('SELECT COUNT(*) as count FROM users');
        console.log('👥 Current user count:', userCount.rows[0].count);
        
        // List existing users (first 5)
        const users = await pool.query('SELECT id, name, phone, balance FROM users LIMIT 5');
        console.log('👤 Sample users:', users.rows);
        
        res.json({
            success: true,
            database: {
                connection: 'OK',
                currentTime: connectionTest.rows[0].current_time,
                version: connectionTest.rows[0].pg_version,
                tables: tablesTest.rows.map(t => t.table_name),
                userCount: parseInt(userCount.rows[0].count),
                sampleUsers: users.rows
            }
        });
        
    } catch (error) {
        console.error('❌ Database test failed:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            message: 'Database test failed'
        });
    }
});

// User Authentication
app.post('/api/auth/login', async (req, res) => {
    try {
        console.log('🔐 Login attempt:', { phone: req.body.phone, hasPin: !!req.body.pin });
        
        const { phone, pin } = req.body;

        if (!phone || !pin) {
            console.log('❌ Missing phone or PIN');
            return res.status(400).json({ 
                success: false, 
                message: 'Phone number and PIN are required' 
            });
        }

        console.log('🔍 Searching for user with phone:', phone, 'and PIN:', pin);

        const result = await pool.query(
            'SELECT id, name, email, phone, balance, is_locked FROM users WHERE phone = $1 AND pin = $2',
            [phone, pin]
        );

        console.log('🔍 Database query result:', result.rows.length, 'users found');

        if (result.rows.length === 0) {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid phone number or PIN' 
            });
        }

        const user = result.rows[0];
        console.log('✅ User found:', { id: user.id, name: user.name, phone: user.phone });

        if (user.is_locked) {
            return res.status(423).json({ 
                success: false, 
                message: 'Account is locked. Please contact support.' 
            });
        }

        res.json({
            success: true,
            message: 'Login successful',
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                balance: parseFloat(user.balance)
            }
        });

    } catch (error) {
        console.error('❌ Login error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error: ' + error.message 
        });
    }
});

// User Registration
app.post('/api/auth/register', async (req, res) => {
    try {
        console.log('📝 Registration attempt:', { 
            name: req.body.name, 
            email: req.body.email, 
            phone: req.body.phone,
            hasPin: !!req.body.pin 
        });

        const { name, email, phone, pin } = req.body;

        if (!name || !email || !phone || !pin) {
            console.log('❌ Missing required fields');
            return res.status(400).json({ 
                success: false, 
                message: 'All fields are required' 
            });
        }

        // Validate PIN (should be 4-6 digits)
        if (!/^\d{4,6}$/.test(pin)) {
            console.log('❌ Invalid PIN format');
            return res.status(400).json({ 
                success: false, 
                message: 'PIN must be 4-6 digits' 
            });
        }

        // Test database connection first
        await pool.query('SELECT 1');
        console.log('✅ Database connection verified');

        // Check if user already exists
        const existingUser = await pool.query(
            'SELECT id FROM users WHERE phone = $1 OR email = $2',
            [phone, email]
        );

        if (existingUser.rows.length > 0) {
            console.log('❌ User already exists');
            return res.status(409).json({ 
                success: false, 
                message: 'User with this phone number or email already exists' 
            });
        }

        console.log('💾 Inserting new user into database...');

        // Create new user with default balance of 5000
        const result = await pool.query(
            'INSERT INTO users (name, email, phone, pin, balance) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, phone, balance',
            [name, email, phone, pin, 5000.00]
        );

        const newUser = result.rows[0];
        console.log('✅ User created successfully:', { id: newUser.id, name: newUser.name });

        res.status(201).json({
            success: true,
            message: 'Account created successfully',
            user: {
                id: newUser.id,
                name: newUser.name,
                email: newUser.email,
                phone: newUser.phone,
                balance: parseFloat(newUser.balance)
            }
        });

    } catch (error) {
        console.error('❌ Registration error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error: ' + error.message 
        });
    }
});

// Get user balance
app.get('/api/users/:userId/balance', async (req, res) => {
    try {
        const { userId } = req.params;

        const result = await pool.query(
            'SELECT balance FROM users WHERE id = $1',
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }

        res.json({
            success: true,
            balance: parseFloat(result.rows[0].balance)
        });

    } catch (error) {
        console.error('Balance fetch error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
});

// Update user balance
app.put('/api/users/:userId/balance', async (req, res) => {
    try {
        console.log('💰 Balance update request:', { userId: req.params.userId, body: req.body });
        
        const { userId } = req.params;
        const { amount, type, pin, description } = req.body;

        if (!amount || !type || !pin) {
            return res.status(400).json({ 
                success: false, 
                message: 'Amount, type (add/subtract), and PIN are required' 
            });
        }

        const updateAmount = parseFloat(amount);
        if (isNaN(updateAmount) || updateAmount <= 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid amount' 
            });
        }

        // Verify PIN and get current balance
        const userResult = await pool.query(
            'SELECT id, name, balance, is_locked FROM users WHERE id = $1 AND pin = $2',
            [userId, pin]
        );

        if (userResult.rows.length === 0) {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid PIN or user not found' 
            });
        }

        const user = userResult.rows[0];
        
        if (user.is_locked) {
            return res.status(423).json({ 
                success: false, 
                message: 'Account is locked' 
            });
        }

        const currentBalance = parseFloat(user.balance);

        // Calculate new balance
        let newBalance;
        if (type === 'add') {
            newBalance = currentBalance + updateAmount;
        } else if (type === 'subtract') {
            if (currentBalance < updateAmount) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Insufficient balance' 
                });
            }
            newBalance = currentBalance - updateAmount;
        } else {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid type. Use "add" or "subtract"' 
            });
        }

        // Update balance in database
        const updateResult = await pool.query(
            'UPDATE users SET balance = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING balance',
            [newBalance, userId]
        );

        console.log('✅ Balance updated successfully:', { 
            userId, 
            oldBalance: currentBalance, 
            newBalance: parseFloat(updateResult.rows[0].balance) 
        });

        res.json({
            success: true,
            message: `Balance ${type === 'add' ? 'added' : 'deducted'} successfully`,
            balance: {
                previous: currentBalance,
                current: parseFloat(updateResult.rows[0].balance),
                change: type === 'add' ? updateAmount : -updateAmount
            }
        });

    } catch (error) {
        console.error('❌ Balance update error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error: ' + error.message 
        });
    }
});

// Create transaction
app.post('/api/transactions', async (req, res) => {
    try {
        console.log('💸 Transaction request:', { 
            fromUserId: req.body.fromUserId, 
            toUpiId: req.body.toUpiId, 
            amount: req.body.amount 
        });

        const { fromUserId, toUpiId, amount, description, pin } = req.body;

        if (!fromUserId || !toUpiId || !amount || !pin) {
            return res.status(400).json({ 
                success: false, 
                message: 'All required fields must be provided' 
            });
        }

        // Validate amount
        const transactionAmount = parseFloat(amount);
        if (isNaN(transactionAmount) || transactionAmount <= 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid amount' 
            });
        }

        if (transactionAmount > 50000) {
            return res.status(400).json({ 
                success: false, 
                message: 'Transaction limit exceeded (₹50,000 max)' 
            });
        }

        // Start database transaction
        const client = await pool.connect();
        
        try {
            await client.query('BEGIN');

            // Verify sender PIN and get sender details
            const senderResult = await client.query(
                'SELECT id, name, phone, balance, is_locked FROM users WHERE id = $1 AND pin = $2',
                [fromUserId, pin]
            );

            if (senderResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(401).json({ 
                    success: false, 
                    message: 'Invalid PIN' 
                });
            }

            const sender = senderResult.rows[0];
            
            if (sender.is_locked) {
                await client.query('ROLLBACK');
                return res.status(423).json({ 
                    success: false, 
                    message: 'Sender account is locked' 
                });
            }

            const senderBalance = parseFloat(sender.balance);

            // Check sufficient balance
            if (senderBalance < transactionAmount) {
                await client.query('ROLLBACK');
                return res.status(400).json({ 
                    success: false, 
                    message: 'Insufficient balance' 
                });
            }

            // Find recipient by phone or email (extract from UPI ID)
            const cleanUpiId = toUpiId.replace('@paytm', '').replace('@phonepe', '').replace('@gpay', '').replace('@upi', '');
            const recipientResult = await client.query(
                'SELECT id, name, phone, balance, is_locked FROM users WHERE phone = $1 OR email = $1',
                [cleanUpiId]
            );

            let recipient = null;
            let recipientBalance = 0;
            let transactionStatus = 'SUCCESS';

            if (recipientResult.rows.length > 0) {
                recipient = recipientResult.rows[0];
                recipientBalance = parseFloat(recipient.balance);
                
                if (recipient.is_locked) {
                    await client.query('ROLLBACK');
                    return res.status(423).json({ 
                        success: false, 
                        message: 'Recipient account is locked' 
                    });
                }
            } else {
                // If recipient not found, still process as external transfer
                transactionStatus = 'SUCCESS'; // Could be PENDING for external transfers
            }

            // Generate reference ID
            const referenceId = generateReferenceId();

            // Update sender balance (deduct amount)
            const newSenderBalance = senderBalance - transactionAmount;
            await client.query(
                'UPDATE users SET balance = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
                [newSenderBalance, fromUserId]
            );

            console.log('💰 Sender balance updated:', { 
                senderId: fromUserId, 
                oldBalance: senderBalance, 
                newBalance: newSenderBalance 
            });

            // Update recipient balance if they exist in our system
            let newRecipientBalance = recipientBalance;
            if (recipient) {
                newRecipientBalance = recipientBalance + transactionAmount;
                await client.query(
                    'UPDATE users SET balance = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
                    [newRecipientBalance, recipient.id]
                );

                console.log('💰 Recipient balance updated:', { 
                    recipientId: recipient.id, 
                    oldBalance: recipientBalance, 
                    newBalance: newRecipientBalance 
                });

                // Insert credit transaction for recipient
                await client.query(
                    'INSERT INTO transactions (reference_id, from_user_id, to_upi_id, amount, description, status, transaction_type) VALUES ($1, $2, $3, $4, $5, $6, $7)',
                    [referenceId + '_CREDIT', recipient.id, sender.phone, transactionAmount, description || 'Money received', transactionStatus, 'CREDIT']
                );
            }

            // Insert debit transaction for sender
            const transactionResult = await client.query(
                'INSERT INTO transactions (reference_id, from_user_id, to_upi_id, amount, description, status, transaction_type) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
                [referenceId, fromUserId, toUpiId, transactionAmount, description || '', transactionStatus, 'DEBIT']
            );

            await client.query('COMMIT');

            const transaction = transactionResult.rows[0];
            
            console.log('✅ Transaction completed:', { 
                referenceId, 
                senderNewBalance: newSenderBalance,
                recipientNewBalance: recipient ? newRecipientBalance : 'External'
            });

            res.json({
                success: true,
                message: 'Transaction completed successfully',
                transaction: {
                    id: transaction.id,
                    referenceId: transaction.reference_id,
                    amount: parseFloat(transaction.amount),
                    toUpiId: transaction.to_upi_id,
                    description: transaction.description,
                    status: transaction.status,
                    timestamp: transaction.created_at
                },
                balances: {
                    sender: {
                        previous: senderBalance,
                        current: newSenderBalance
                    },
                    recipient: recipient ? {
                        previous: recipientBalance,
                        current: newRecipientBalance
                    } : null
                }
            });

        } catch (transactionError) {
            await client.query('ROLLBACK');
            throw transactionError;
        } finally {
            client.release();
        }

    } catch (error) {
        console.error('❌ Transaction error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Transaction failed. Please try again.' 
        });
    }
});

// Get current user balance (alternative endpoint)
app.get('/api/user/balance', async (req, res) => {
    try {
        const { userId } = req.query;

        if (!userId) {
            return res.status(400).json({ 
                success: false, 
                message: 'User ID is required' 
            });
        }

        const result = await pool.query(
            'SELECT id, name, balance FROM users WHERE id = $1',
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }

        const user = result.rows[0];

        res.json({
            success: true,
            balance: parseFloat(user.balance),
            user: {
                id: user.id,
                name: user.name,
                balance: parseFloat(user.balance)
            }
        });

    } catch (error) {
        console.error('Current user balance fetch error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
});

// Get user transactions
app.get('/api/transactions/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const limit = parseInt(req.query.limit) || 10;
        const offset = parseInt(req.query.offset) || 0;

        // Get both sent and received transactions
        const result = await pool.query(
            `SELECT t.*, 
                    CASE 
                        WHEN t.from_user_id = $1 THEN 'sent'
                        ELSE 'received'
                    END as transaction_direction,
                    u_from.name as from_name,
                    u_from.phone as from_phone
             FROM transactions t 
             LEFT JOIN users u_from ON t.from_user_id = u_from.id
             WHERE t.from_user_id = $1 OR t.to_upi_id IN (
                 SELECT phone FROM users WHERE id = $1
                 UNION 
                 SELECT email FROM users WHERE id = $1
             )
             ORDER BY t.created_at DESC 
             LIMIT $2 OFFSET $3`,
            [userId, limit, offset]
        );

        const transactions = result.rows.map(t => ({
            id: t.id,
            referenceId: t.reference_id,
            amount: parseFloat(t.amount),
            direction: t.transaction_direction,
            fromUserId: t.from_user_id,
            fromName: t.from_name,
            fromPhone: t.from_phone,
            toUpiId: t.to_upi_id,
            description: t.description,
            status: t.status,
            type: t.transaction_type,
            timestamp: t.created_at
        }));

        res.json({
            success: true,
            transactions,
            hasMore: result.rows.length === limit
        });

    } catch (error) {
        console.error('Transactions fetch error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch transactions' 
        });
    }
});

// Get all transactions (admin endpoint)
app.get('/api/transactions', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20;
        const offset = parseInt(req.query.offset) || 0;

        const result = await pool.query(
            `SELECT t.*, u.name as sender_name, u.phone as sender_phone 
             FROM transactions t 
             JOIN users u ON t.from_user_id = u.id 
             ORDER BY t.created_at DESC 
             LIMIT $1 OFFSET $2`,
            [limit, offset]
        );

        const transactions = result.rows.map(t => ({
            id: t.id,
            referenceId: t.reference_id,
            amount: parseFloat(t.amount),
            fromUser: {
                name: t.sender_name,
                phone: t.sender_phone
            },
            toUpiId: t.to_upi_id,
            description: t.description,
            status: t.status,
            type: t.transaction_type,
            timestamp: t.created_at
        }));

        res.json({
            success: true,
            transactions,
            hasMore: result.rows.length === limit
        });

    } catch (error) {
        console.error('All transactions fetch error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch transactions' 
        });
    }
});

// Create demo users (development endpoint)
app.post('/api/create-demo-users', async (req, res) => {
    try {
        console.log('🎭 Creating demo users...');

        // Test database connection first
        await pool.query('SELECT 1');
        console.log('✅ Database connection verified for demo users');

        // Check if demo users already exist
        const existingUsers = await pool.query(
            'SELECT COUNT(*) FROM users WHERE phone IN ($1, $2)',
            ['9876543210', '9876543211']
        );

        if (parseInt(existingUsers.rows[0].count) > 0) {
            console.log('ℹ️ Demo users already exist');
            return res.json({ 
                success: true, 
                message: 'Demo users already exist' 
            });
        }

        console.log('💾 Inserting demo users into database...');

        // Create demo users with correct credentials that match the frontend expectations
        const result = await pool.query(`
            INSERT INTO users (name, email, phone, pin, balance) VALUES 
            ('Admin1', 'admin@eg.com', '9876543210', '1234', 10000.00),
            ('Admin2', 'admin2@eg.com', '9876543211', '1234', 15000.00)
            RETURNING id, name, phone, pin, balance
        `);

        console.log('✅ Demo users created successfully:', result.rows);

        res.json({ 
            success: true, 
            message: 'Demo users created successfully',
            users: result.rows.map(user => ({
                id: user.id,
                name: user.name, 
                phone: user.phone, 
                pin: user.pin, 
                balance: parseFloat(user.balance)
            }))
        });

    } catch (error) {
        console.error('❌ Demo users creation error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to create demo users: ' + error.message 
        });
    }
});

// Clear all users (development endpoint - for testing)
app.post('/api/clear-users', async (req, res) => {
    try {
        console.log('🗑️ Clearing all users...');
        
        // Clear transactions first (due to foreign key constraint)
        await pool.query('DELETE FROM transactions');
        // Clear users
        await pool.query('DELETE FROM users');
        
        console.log('✅ All users cleared');
        
        res.json({ 
            success: true, 
            message: 'All users and transactions cleared successfully' 
        });

    } catch (error) {
        console.error('❌ Clear users error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to clear users: ' + error.message 
        });
    }
});

// Serve frontend
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ 
        success: false, 
        message: 'Internal server error' 
    });
});

// Start server
app.listen(PORT, () => {
    console.clear(); // Clear console for clean start
    console.log('🚀 PayEase Server Started Successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`🌐 Frontend URL: http://localhost:${PORT}`);
    console.log(`🔧 API Health: http://localhost:${PORT}/api/health`);
    console.log(`🧪 DB Test: http://localhost:${PORT}/api/db-test`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('💳 Demo Login Accounts (Create via /api/create-demo-users):');
    console.log('   👤 Admin1 - 📱 9876543210 | 🔐 1234 | 💰 ₹10,000');
    console.log('   👤 Admin2 - 📱 9876543211 | 🔐 1234 | 💰 ₹15,000');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🛠️ Development Endpoints:');
    console.log('   POST /api/create-demo-users - Create demo accounts');
    console.log('   POST /api/clear-users - Clear all users (testing)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✨ API logging enabled for debugging');
    console.log('🎯 Ready for transactions!');
});

module.exports = app;
