// 🗄️ Database Configuration
require('dotenv').config();
const { Pool } = require('pg');

class DatabaseConfig {
    constructor() {
        this.pool = new Pool({
            user: process.env.DB_USER || 'postgres',
            host: process.env.DB_HOST || 'localhost',
            database: process.env.DB_NAME || 'upi_simulator',
            password: process.env.DB_PASSWORD || 'password',
            port: process.env.DB_PORT || 5432,
        });
        
        this.pool.on('connect', () => {
            console.log('🔗 Connected to PostgreSQL database');
        });
        
        this.pool.on('error', (err) => {
            console.error('💥 Database connection error:', err);
        });
    }
    
    async testConnection() {
        try {
            const client = await this.pool.connect();
            const result = await client.query('SELECT NOW()');
            client.release();
            console.log('✅ Database connection successful');
            return { success: true, timestamp: result.rows[0].now };
        } catch (error) {
            console.error('❌ Database connection failed:', error);
            return { success: false, error: error.message };
        }
    }
    
    async createTables() {
        const client = await this.pool.connect();
        
        try {
            await client.query('BEGIN');

            // Create users table with all required columns
            await client.query(`
                CREATE TABLE IF NOT EXISTS users (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    email VARCHAR(255) UNIQUE NOT NULL,
                    phone VARCHAR(15) UNIQUE NOT NULL,
                    pin VARCHAR(255) NOT NULL,
                    balance DECIMAL(12,2) DEFAULT 0.00,
                    upi_id VARCHAR(255),
                    is_locked BOOLEAN DEFAULT FALSE,
                    failed_login_attempts INTEGER DEFAULT 0,
                    last_failed_login TIMESTAMP WITH TIME ZONE,
                    last_login TIMESTAMP WITH TIME ZONE,
                    locked_at TIMESTAMP WITH TIME ZONE,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // Fix existing PIN column if it's too short
            await client.query(`
                ALTER TABLE users 
                ALTER COLUMN pin TYPE VARCHAR(255)
            `).catch(() => {
                // Ignore error if column is already correct type
                console.log('PIN column already correct type or table doesn\'t exist yet');
            });

            // Create transactions table with all required columns
            await client.query(`
                CREATE TABLE IF NOT EXISTS transactions (
                    id SERIAL PRIMARY KEY,
                    reference_id VARCHAR(50) UNIQUE NOT NULL,
                    from_user_id INTEGER REFERENCES users(id),
                    to_user_id INTEGER REFERENCES users(id),
                    to_upi_id VARCHAR(255) NOT NULL,
                    amount DECIMAL(12,2) NOT NULL,
                    description TEXT,
                    status VARCHAR(20) NOT NULL DEFAULT 'SUCCESS',
                    transaction_type VARCHAR(20) DEFAULT 'DEBIT',
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // Create indexes for better performance
            await client.query('CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone)');
            await client.query('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');
            await client.query('CREATE INDEX IF NOT EXISTS idx_transactions_from_user ON transactions(from_user_id)');
            await client.query('CREATE INDEX IF NOT EXISTS idx_transactions_to_user ON transactions(to_user_id)');
            await client.query('CREATE INDEX IF NOT EXISTS idx_transactions_ref ON transactions(reference_id)');
            await client.query('CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status)');

            await client.query('COMMIT');
            console.log('✅ Database tables created successfully');
            
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('❌ Error creating tables:', error);
            throw error;
        } finally {
            client.release();
        }
    }
    
    async initialize() {
        try {
            await this.testConnection();
            await this.createTables();
            return this.pool;
        } catch (error) {
            console.error('❌ Database initialization failed:', error);
            throw error;
        }
    }
    
    getPool() {
        return this.pool;
    }
    
    async connect() {
        return this.pool.connect();
    }
    
    async close() {
        await this.pool.end();
        console.log('🔒 Database connection pool closed');
    }
}

// Export singleton instance
const database = new DatabaseConfig();

module.exports = database;
