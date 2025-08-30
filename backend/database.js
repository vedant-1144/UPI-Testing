const { Pool } = require('pg');
require('dotenv').config();

class Database {
  constructor() {
    this.pool = new Pool({
      user: process.env.PG_USER,
      host: process.env.PG_HOST,
      database: process.env.PG_DATABASE,
      password: process.env.PG_PASSWORD,
      port: process.env.PG_PORT,
      max: 20,
      idleTimeoutMillis: 30000,
      
      connectionTimeoutMillis: 2000,
    });

    this.initDatabase();
  }

  async initDatabase() {
    try {
      await this.createTables();
      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Database initialization error:', error);
      throw error;
    }
  }

  async createTables() {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Users table - using UUID for all IDs consistently
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) NOT NULL,
          phone VARCHAR(15) UNIQUE NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          pin VARCHAR(255) NOT NULL,
          device_id VARCHAR(255) NOT NULL,
          is_locked BOOLEAN DEFAULT FALSE,
          pin_attempts INTEGER DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // UPI IDs table
      await client.query(`
        CREATE TABLE IF NOT EXISTS upi_ids (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          upi_id VARCHAR(255) UNIQUE NOT NULL,
          is_default BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Bank accounts table
      await client.query(`
        CREATE TABLE IF NOT EXISTS bank_accounts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          account_number VARCHAR(50) NOT NULL,
          ifsc VARCHAR(11) NOT NULL,
          bank_name VARCHAR(255) NOT NULL,
          balance DECIMAL(15,2) DEFAULT 0.00,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Transactions table
      await client.query(`
        CREATE TABLE IF NOT EXISTS transactions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          from_user_id UUID REFERENCES users(id),
          to_user_id UUID REFERENCES users(id),
          from_upi_id VARCHAR(255),
          to_upi_id VARCHAR(255) NOT NULL,
          amount DECIMAL(15,2) NOT NULL,
          description TEXT,
          status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
          failure_reason TEXT,
          transaction_ref VARCHAR(50) UNIQUE NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // User sessions table - fixed UUID consistency
      await client.query(`
        CREATE TABLE IF NOT EXISTS user_sessions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          session_token VARCHAR(255) UNIQUE NOT NULL,
          device_id VARCHAR(255) NOT NULL,
          expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Test logs table
      await client.query(`
        CREATE TABLE IF NOT EXISTS test_logs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          test_case VARCHAR(255) NOT NULL,
          input_data JSONB,
          expected_result JSONB,
          actual_result JSONB,
          status VARCHAR(20) NOT NULL,
          execution_time INTEGER,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create indexes for better performance
      await client.query(`CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone)`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_upi_ids_upi_id ON upi_ids(upi_id)`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_upi_ids_user_id ON upi_ids(user_id)`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_bank_accounts_user_id ON bank_accounts(user_id)`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_transactions_from_user ON transactions(from_user_id)`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_transactions_to_user ON transactions(to_user_id)`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status)`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_transactions_ref ON transactions(transaction_ref)`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_sessions_token ON user_sessions(session_token)`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON user_sessions(user_id)`);

      await client.query('COMMIT');
      console.log('Database tables created successfully');
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Database connection error:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // User operations
  async createUser(userData) {
    const query = `
      INSERT INTO users (name, phone, email, pin, device_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const values = [userData.name, userData.phone, userData.email, userData.pin, userData.deviceId];
    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  async getUserByPhone(phone) {
    const query = 'SELECT * FROM users WHERE phone = $1';
    const result = await this.pool.query(query, [phone]);
    return result.rows[0] || null;
  }

  async getUserByEmail(email) {
    const query = 'SELECT * FROM users WHERE email = $1';
    const result = await this.pool.query(query, [email]);
    return result.rows[0] || null;
  }

  async getUserById(id) {
    const query = 'SELECT * FROM users WHERE id = $1';
    const result = await this.pool.query(query, [id]);
    return result.rows[0] || null;
  }

  async updateUser(userId, updateData) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined) {
        fields.push(`${key} = $${paramCount}`);
        values.push(updateData[key]);
        paramCount++;
      }
    });

    if (fields.length === 0) return null;

    values.push(userId);
    const query = `
      UPDATE users 
      SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await this.pool.query(query, values);
    return result.rows[0] || null;
  }

  async lockUser(userId) {
    return this.updateUser(userId, { is_locked: true });
  }

  async unlockUser(userId) {
    return this.updateUser(userId, { is_locked: false, pin_attempts: 0 });
  }

  // UPI ID operations
  async createUPIId(upiData) {
    const query = `
      INSERT INTO upi_ids (user_id, upi_id, is_default)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    const values = [upiData.userId, upiData.upiId, upiData.isDefault || false];
    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  async getUPIIdsByUserId(userId) {
    const query = 'SELECT * FROM upi_ids WHERE user_id = $1 ORDER BY is_default DESC, created_at ASC';
    const result = await this.pool.query(query, [userId]);
    return result.rows;
  }

  async getUPIIdByUpiId(upiId) {
    const query = 'SELECT * FROM upi_ids WHERE upi_id = $1';
    const result = await this.pool.query(query, [upiId]);
    return result.rows[0] || null;
  }

  async getUserByUpiId(upiId) {
    const query = `
      SELECT u.* FROM users u
      JOIN upi_ids ui ON u.id = ui.user_id
      WHERE ui.upi_id = $1
    `;
    const result = await this.pool.query(query, [upiId]);
    return result.rows[0] || null;
  }

  // Bank account operations
  async createBankAccount(accountData) {
    const query = `
      INSERT INTO bank_accounts (user_id, account_number, ifsc, bank_name, balance)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const values = [
      accountData.userId,
      accountData.accountNumber,
      accountData.ifsc,
      accountData.bankName,
      accountData.balance || 0
    ];
    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  async getBankAccountsByUserId(userId) {
    const query = 'SELECT * FROM bank_accounts WHERE user_id = $1 ORDER BY created_at ASC';
    const result = await this.pool.query(query, [userId]);
    return result.rows;
  }

  async updateBankAccountBalance(accountId, newBalance) {
    const query = `
      UPDATE bank_accounts 
      SET balance = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;
    const result = await this.pool.query(query, [newBalance, accountId]);
    return result.rows[0] || null;
  }

  async getPrimaryBankAccount(userId) {
    const query = 'SELECT * FROM bank_accounts WHERE user_id = $1 ORDER BY created_at ASC LIMIT 1';
    const result = await this.pool.query(query, [userId]);
    return result.rows[0] || null;
  }

  // Transaction operations
  async createTransaction(transactionData) {
    const query = `
      INSERT INTO transactions (
        from_user_id, to_user_id, from_upi_id, to_upi_id, 
        amount, description, status, transaction_ref
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    const values = [
      transactionData.fromUserId,
      transactionData.toUserId,
      transactionData.fromUpiId,
      transactionData.toUpiId,
      transactionData.amount,
      transactionData.description,
      transactionData.status || 'PENDING',
      transactionData.transactionRef
    ];
    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  async updateTransactionStatus(transactionId, status, failureReason = null) {
    const query = `
      UPDATE transactions 
      SET status = $1, failure_reason = $2
      WHERE id = $3
      RETURNING *
    `;
    const result = await this.pool.query(query, [status, failureReason, transactionId]);
    return result.rows[0] || null;
  }

  async getTransactionsByUserId(userId, page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    const query = `
      SELECT t.*, 
             fu.name as from_user_name, fu.phone as from_phone,
             tu.name as to_user_name, tu.phone as to_phone
      FROM transactions t
      LEFT JOIN users fu ON t.from_user_id = fu.id
      LEFT JOIN users tu ON t.to_user_id = tu.id
      WHERE t.from_user_id = $1 OR t.to_user_id = $1
      ORDER BY t.created_at DESC
      LIMIT $2 OFFSET $3
    `;
    const result = await this.pool.query(query, [userId, limit, offset]);
    return result.rows;
  }

  async getTransactionById(transactionId) {
    const query = 'SELECT * FROM transactions WHERE id = $1';
    const result = await this.pool.query(query, [transactionId]);
    return result.rows[0] || null;
  }

  async getTransactionByRef(transactionRef) {
    const query = 'SELECT * FROM transactions WHERE transaction_ref = $1';
    const result = await this.pool.query(query, [transactionRef]);
    return result.rows[0] || null;
  }

  // Session management
  async createSession(sessionData) {
    const query = `
      INSERT INTO user_sessions (user_id, session_token, device_id, expires_at)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const values = [
      sessionData.userId,
      sessionData.sessionToken,
      sessionData.deviceId,
      sessionData.expiresAt
    ];
    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  async getActiveSession(sessionToken) {
    const query = `
      SELECT s.*, u.name, u.phone, u.email 
      FROM user_sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.session_token = $1 AND s.is_active = true AND s.expires_at > CURRENT_TIMESTAMP
    `;
    const result = await this.pool.query(query, [sessionToken]);
    return result.rows[0] || null;
  }

  async invalidateSession(sessionToken) {
    const query = `
      UPDATE user_sessions 
      SET is_active = false
      WHERE session_token = $1
      RETURNING *
    `;
    const result = await this.pool.query(query, [sessionToken]);
    return result.rows[0] || null;
  }

  async invalidateAllUserSessions(userId) {
    const query = `
      UPDATE user_sessions 
      SET is_active = false
      WHERE user_id = $1
      RETURNING count(*) as invalidated_sessions
    `;
    const result = await this.pool.query(query, [userId]);
    return result.rows[0];
  }

  // Test logging
  async logTestCase(testData) {
    const query = `
      INSERT INTO test_logs (test_case, input_data, expected_result, actual_result, status, execution_time)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const values = [
      testData.testCase,
      JSON.stringify(testData.input),
      JSON.stringify(testData.expectedResult),
      JSON.stringify(testData.actualResult),
      testData.status,
      testData.executionTime || null
    ];
    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  async getTestLogs(limit = 50) {
    const query = 'SELECT * FROM test_logs ORDER BY created_at DESC LIMIT $1';
    const result = await this.pool.query(query, [limit]);
    return result.rows;
  }

  // Admin operations
  async getAllUsers(page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const query = `
      SELECT u.*, 
             COUNT(t.id) as transaction_count,
             COALESCE(SUM(CASE WHEN t.from_user_id = u.id THEN t.amount ELSE 0 END), 0) as total_sent,
             COALESCE(SUM(CASE WHEN t.to_user_id = u.id THEN t.amount ELSE 0 END), 0) as total_received
      FROM users u
      LEFT JOIN transactions t ON (u.id = t.from_user_id OR u.id = t.to_user_id)
      GROUP BY u.id
      ORDER BY u.created_at DESC
      LIMIT $1 OFFSET $2
    `;
    const result = await this.pool.query(query, [limit, offset]);
    return result.rows;
  }

  async getAllTransactions(page = 1, limit = 50) {
    const offset = (page - 1) * limit;
    const query = `
      SELECT t.*, 
             fu.name as from_user_name, fu.phone as from_phone,
             tu.name as to_user_name, tu.phone as to_phone
      FROM transactions t
      LEFT JOIN users fu ON t.from_user_id = fu.id
      LEFT JOIN users tu ON t.to_user_id = tu.id
      ORDER BY t.created_at DESC
      LIMIT $1 OFFSET $2
    `;
    const result = await this.pool.query(query, [limit, offset]);
    return result.rows;
  }

  async close() {
    await this.pool.end();
  }

  // Add this method to your Database class in database.js

  async resetDatabase() {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      
      // Drop all tables in correct order
      await client.query('DROP TABLE IF EXISTS user_sessions CASCADE');
      await client.query('DROP TABLE IF EXISTS test_logs CASCADE');
      await client.query('DROP TABLE IF EXISTS transactions CASCADE');
      await client.query('DROP TABLE IF EXISTS bank_accounts CASCADE');
      await client.query('DROP TABLE IF EXISTS upi_ids CASCADE');
      await client.query('DROP TABLE IF EXISTS users CASCADE');
      
      await client.query('COMMIT');
      console.log('Database tables dropped successfully');
      
      // Recreate tables
      await this.createTables();
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = Database;
