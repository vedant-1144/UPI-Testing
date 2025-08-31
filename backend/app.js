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

// Custom minimal logging middleware (only for API errors)
app.use((req, res, next) => {
    // Only log API calls, not static file requests
    if (req.path.startsWith('/api/')) {
        const start = Date.now();
        res.on('finish', () => {
            if (res.statusCode >= 400) {
                const duration = Date.now() - start;
                console.log(`❌ ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
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

        // Drop existing tables if they exist to recreate with correct schema
        await client.query('DROP TABLE IF EXISTS transactions CASCADE');
        await client.query('DROP TABLE IF EXISTS users CASCADE');
        
        // Users table with simple integer IDs
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

        // Transactions table
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
        // Remove verbose table creation message
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

// User Authentication
app.post('/api/auth/login', async (req, res) => {
    try {
        const { phone, pin } = req.body;

        if (!phone || !pin) {
            return res.status(400).json({ 
                success: false, 
                message: 'Phone number and PIN are required' 
            });
        }

        const result = await pool.query(
            'SELECT id, name, email, phone, balance, is_locked FROM users WHERE phone = $1 AND pin = $2',
            [phone, pin]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid phone number or PIN' 
            });
        }

        const user = result.rows[0];

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
        console.error('Login error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
});

// User Registration
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, phone, pin } = req.body;

        if (!name || !email || !phone || !pin) {
            return res.status(400).json({ 
                success: false, 
                message: 'All fields are required' 
            });
        }

        // Validate PIN (should be 4-6 digits)
        if (!/^\d{4,6}$/.test(pin)) {
            return res.status(400).json({ 
                success: false, 
                message: 'PIN must be 4-6 digits' 
            });
        }

        // Check if user already exists
        const existingUser = await pool.query(
            'SELECT id FROM users WHERE phone = $1 OR email = $2',
            [phone, email]
        );

        if (existingUser.rows.length > 0) {
            return res.status(409).json({ 
                success: false, 
                message: 'User with this phone number or email already exists' 
            });
        }

        // Create new user with default balance of 5000
        const result = await pool.query(
            'INSERT INTO users (name, email, phone, pin, balance) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, phone, balance',
            [name, email, phone, pin, 5000.00]
        );

        const newUser = result.rows[0];
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
        console.error('Registration error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
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

// Create transaction
app.post('/api/transactions', async (req, res) => {
    try {
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

        // Verify PIN
        const pinResult = await pool.query(
            'SELECT id, balance, is_locked FROM users WHERE id = $1 AND pin = $2',
            [fromUserId, pin]
        );

        if (pinResult.rows.length === 0) {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid PIN' 
            });
        }

        const user = pinResult.rows[0];
        
        if (user.is_locked) {
            return res.status(423).json({ 
                success: false, 
                message: 'Account is locked' 
            });
        }

        const currentBalance = parseFloat(user.balance);

        // Check sufficient balance
        if (currentBalance < transactionAmount) {
            return res.status(400).json({ 
                success: false, 
                message: 'Insufficient balance' 
            });
        }

        // Generate reference ID
        const referenceId = generateReferenceId();

        // Start transaction
        await pool.query('BEGIN');

        try {
            // Deduct from sender
            await pool.query(
                'UPDATE users SET balance = balance - $1 WHERE id = $2',
                [transactionAmount, fromUserId]
            );

            // Check if recipient exists and credit them
            const recipientResult = await pool.query(
                'SELECT id FROM users WHERE phone = $1 OR email = $1',
                [toUpiId.replace('@paytm', '').replace('@phonepe', '').replace('@gpay', '')]
            );

            let transactionStatus = 'SUCCESS';
            if (recipientResult.rows.length > 0) {
                await pool.query(
                    'UPDATE users SET balance = balance + $1 WHERE id = $2',
                    [transactionAmount, recipientResult.rows[0].id]
                );
            }

            // Insert transaction record
            const transactionResult = await pool.query(
                'INSERT INTO transactions (reference_id, from_user_id, to_upi_id, amount, description, status, transaction_type) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
                [referenceId, fromUserId, toUpiId, transactionAmount, description || '', transactionStatus, 'DEBIT']
            );

            await pool.query('COMMIT');

            const transaction = transactionResult.rows[0];
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
                newBalance: currentBalance - transactionAmount
            });

        } catch (transactionError) {
            await pool.query('ROLLBACK');
            throw transactionError;
        }

    } catch (error) {
        console.error('Transaction error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Transaction failed. Please try again.' 
        });
    }
});

// Get user transactions
app.get('/api/transactions/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const limit = parseInt(req.query.limit) || 10;
        const offset = parseInt(req.query.offset) || 0;

        const result = await pool.query(
            'SELECT * FROM transactions WHERE from_user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
            [userId, limit, offset]
        );

        const transactions = result.rows.map(t => ({
            id: t.id,
            referenceId: t.reference_id,
            amount: parseFloat(t.amount),
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
        // Check if demo users already exist
        const existingUsers = await pool.query(
            'SELECT COUNT(*) FROM users WHERE phone IN ($1, $2)',
            ['9876543210', '9876543211']
        );

        if (parseInt(existingUsers.rows[0].count) > 0) {
            return res.json({ 
                success: true, 
                message: 'Demo users already exist' 
            });
        }

        // Create demo users
        await pool.query(`
            INSERT INTO users (name, email, phone, pin, balance) VALUES 
            ('John Doe', 'john@example.com', '9876543210', '1234', 10000.00),
            ('Jane Smith', 'jane@example.com', '9876543211', '1234', 15000.00)
        `);

        res.json({ 
            success: true, 
            message: 'Demo users created successfully',
            users: [
                { name: 'John Doe', phone: '9876543210', pin: '1234', balance: 10000 },
                { name: 'Jane Smith', phone: '9876543211', pin: '1234', balance: 15000 }
            ]
        });

    } catch (error) {
        console.error('Demo users creation error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to create demo users' 
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
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('💳 Demo Login Accounts:');
    console.log('   � John Doe - 📱 9876543210 | 🔐 1234 | 💰 ₹10,000');
    console.log('   � Jane Smith - 📱 9876543211 | 🔐 1234 | 💰 ₹15,000');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✨ Server running in quiet mode (only errors will be logged)');
    console.log('🎯 Ready for transactions!');
});

module.exports = app;
