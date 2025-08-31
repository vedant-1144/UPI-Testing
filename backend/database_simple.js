const { Pool } = require('pg');
require('dotenv').config();

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

async function initializeDatabase() {
    try {
        await createTables();
        console.log('✅ Database initialized successfully');
    } catch (error) {
        console.error('❌ Database initialization error:', error.message);
        throw error;
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
        console.log('✅ Database tables created successfully');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Database creation error:', error.message);
        throw error;
    } finally {
        client.release();
    }
}

module.exports = { pool, initializeDatabase };
