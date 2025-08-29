require('dotenv').config();
const { Pool } = require('pg');

class Database {
  constructor() {
    this.pool = new Pool({
      host: process.env.PG_HOST || 'localhost',
      port: process.env.PG_PORT || 5432,
      database: process.env.PG_DATABASE || 'upi_payments_db',
      user: process.env.PG_USER || 'upi_user',
      password: process.env.PG_PASSWORD,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
    this.initPostgres();
  }

  async initPostgres() {
    try {
      console.log('Connecting to PostgreSQL database...');
      
      // Test connection
      await this.pool.query('SELECT NOW()');
      console.log('PostgreSQL connection established successfully');

      const schema = `
        CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) NOT NULL,
          phone VARCHAR(20) UNIQUE NOT NULL,
          email VARCHAR(255) NOT NULL,
          pin TEXT NOT NULL,
          device_id VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          is_locked BOOLEAN DEFAULT FALSE,
          pin_attempts INTEGER DEFAULT 0,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE TABLE IF NOT EXISTS upi_ids (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          upi_id VARCHAR(255) UNIQUE NOT NULL,
          is_default BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE TABLE IF NOT EXISTS bank_accounts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          account_number VARCHAR(20) NOT NULL,
          ifsc VARCHAR(20) NOT NULL,
          bank_name VARCHAR(255) NOT NULL,
          balance DECIMAL(15,2) DEFAULT 0.00,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
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
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE TABLE IF NOT EXISTS sessions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          session_token TEXT NOT NULL,
          device_id VARCHAR(255) NOT NULL,
          expires_at TIMESTAMP NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE TABLE IF NOT EXISTS test_logs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          test_case VARCHAR(255) NOT NULL,
          input JSONB,
          expected_result JSONB,
          actual_result JSONB,
          status VARCHAR(20) NOT NULL,
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- Create indexes for better performance
        CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        CREATE INDEX IF NOT EXISTS idx_upi_ids_upi_id ON upi_ids(upi_id);
        CREATE INDEX IF NOT EXISTS idx_transactions_from_user ON transactions(from_user_id);
        CREATE INDEX IF NOT EXISTS idx_transactions_to_user ON transactions(to_user_id);
        CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
        CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(session_token);
        CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
      `;
      
      await this.pool.query(schema);
      console.log('PostgreSQL tables and indexes created successfully');
      
    } catch (error) {
      console.error('PostgreSQL initialization error:', error);
      throw error;
    }
  }

  async seedTestDataPg() {
    try {
      // Check if users already exist
      const { rows } = await this.pool.query('SELECT COUNT(*)::int AS count FROM users');
      if (rows[0].count > 0) {
        console.log('Test data already exists');
        return;
      }

      console.log('Seeding test data for PostgreSQL...');

      // Insert test users
      await this.pool.query(`
        INSERT INTO users (id, name, phone, email, pin, deviceId, createdAt, isLocked, pinAttempts)
        VALUES 
        ('user1', 'Test User 1', '9876543210', 'user1@test.com', '$2a$10$9AqGWxkR8xn7kPL3TjMGZ.VvJnWiJhQzXQYFR/qKWU9A.GDAEK98G', 'device1', $1, false, 0),
        ('user2', 'Test User 2', '9876543211', 'user2@test.com', '$2a$10$9AqGWxkR8xn7kPL3TjMGZ.VvJnWiJhQzXQYFR/qKWU9A.GDAEK98G', 'device2', $1, false, 0)
      `, [new Date().toISOString()]);

      // Insert UPI IDs
      await this.pool.query(`
        INSERT INTO upi_ids (id, userId, upiId, isDefault, createdAt)
        VALUES 
        ('upi1', 'user1', '9876543210@simulator', true, $1),
        ('upi2', 'user2', '9876543211@simulator', true, $1)
      `, [new Date().toISOString()]);

      // Insert bank accounts
      await this.pool.query(`
        INSERT INTO bank_accounts (id, userId, accountNumber, ifsc, bankName, balance, createdAt)
        VALUES 
        ('acc1', 'user1', 'ACC9876543210001', 'SIMU0000001', 'Simulator Bank', 50000, $1),
        ('acc2', 'user2', 'ACC9876543211001', 'SIMU0000001', 'Simulator Bank', 75000, $1)
      `, [new Date().toISOString()]);

      console.log('PostgreSQL test data seeded successfully');
    } catch (error) {
      console.error('Error seeding PostgreSQL test data:', error);
      throw error;
    }
  }


  // User operations
  async createUser(user) {
    if (dbClient === 'pg') {
      const query = `
        INSERT INTO users (id, name, phone, email, pin, deviceId, createdAt, isLocked, pinAttempts)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `;
      const { rows } = await this.pool.query(query, [
        user.id, user.name, user.phone, user.email, user.pin,
        user.deviceId, user.createdAt, user.isLocked || false, user.pinAttempts || 0
      ]);
      return rows[0];
    } else {
      return new Promise((resolve, reject) => {
        const sql = `INSERT INTO users (id, name, phone, email, pin, deviceId, createdAt, isLocked, pinAttempts)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        this.db.run(sql, [
          user.id, user.name, user.phone, user.email, user.pin,
          user.deviceId, user.createdAt, user.isLocked ? 1 : 0, user.pinAttempts || 0
        ], function(err) {
          if (err) reject(err);
          else resolve(user);
        });
      });
    }
  }

  async getUserByPhone(phone) {
    if (dbClient === 'pg') {
      const { rows } = await this.pool.query('SELECT * FROM users WHERE phone = $1', [phone]);
      return rows[0] || null;
    } else {
      return new Promise((resolve, reject) => {
        this.db.get('SELECT * FROM users WHERE phone = ?', [phone], (err, row) => {
          if (err) reject(err);
          else resolve(row || null);
        });
      });
    }
  }

  async getUserById(id) {
    if (dbClient === 'pg') {
      const { rows } = await this.pool.query('SELECT * FROM users WHERE id = $1', [id]);
      return rows[0] || null;
    } else {
      return new Promise((resolve, reject) => {
        this.db.get('SELECT * FROM users WHERE id = ?', [id], (err, row) => {
          if (err) reject(err);
          else resolve(row || null);
        });
      });
    }
  }

  async updateUser(user) {
    if (dbClient === 'pg') {
      const query = `
        UPDATE users 
        SET name = $1, email = $2, pin = $3, isLocked = $4, pinAttempts = $5
        WHERE id = $6
        RETURNING *
      `;
      const { rows } = await this.pool.query(query, [
        user.name, user.email, user.pin, user.isLocked, user.pinAttempts, user.id
      ]);
      return rows[0];
    } 
    else {
      return new Promise((resolve, reject) => {
        const sql = `UPDATE users SET name = ?, email = ?, pin = ?, isLocked = ?, pinAttempts = ? WHERE id = ?`;
        this.db.run(sql, [
          user.name, user.email, user.pin, user.isLocked ? 1 : 0, user.pinAttempts, user.id
        ], function(err) {
          if (err) reject(err);
          else resolve(user);
        });
      });
    }
  }

  async getAllUsers() {
    if (dbClient === 'pg') {
      const { rows } = await this.pool.query('SELECT * FROM users ORDER BY createdAt DESC');
      return rows;
    } else {
      return new Promise((resolve, reject) => {
        this.db.all('SELECT * FROM users ORDER BY createdAt DESC', [], (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        });
      });
    }
  }

  // UPI ID operations
  async createUPIId(upiId) {
    if (dbClient === 'pg') {
      const query = `
        INSERT INTO upi_ids (id, userId, upiId, isDefault, createdAt)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `;
      const { rows } = await this.pool.query(query, [
        upiId.id, upiId.userId, upiId.upiId, upiId.isDefault, upiId.createdAt
      ]);
      return rows[0];
    } else {
      return new Promise((resolve, reject) => {
        const sql = `INSERT INTO upi_ids (id, userId, upiId, isDefault, createdAt) VALUES (?, ?, ?, ?, ?)`;
        this.db.run(sql, [
          upiId.id, upiId.userId, upiId.upiId, upiId.isDefault ? 1 : 0, upiId.createdAt
        ], function(err) {
          if (err) reject(err);
          else resolve(upiId);
        });
      });
    }
  }

  async getUPIIdsByUserId(userId) {
    if (dbClient === 'pg') {
      const { rows } = await this.pool.query('SELECT * FROM upi_ids WHERE userId = $1', [userId]);
      return rows;
    } else {
      return new Promise((resolve, reject) => {
        this.db.all('SELECT * FROM upi_ids WHERE userId = ?', [userId], (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        });
      });
    }
  }

  async getUPIIdByUpiId(upiId) {
    if (dbClient === 'pg') {
      const { rows } = await this.pool.query('SELECT * FROM upi_ids WHERE upiId = $1', [upiId]);
      return rows[0] || null;
    } else {
      return new Promise((resolve, reject) => {
        this.db.get('SELECT * FROM upi_ids WHERE upiId = ?', [upiId], (err, row) => {
          if (err) reject(err);
          else resolve(row || null);
        });
      });
    }
  }

  // Bank account operations
  async createBankAccount(account) {
    if (dbClient === 'pg') {
      const query = `
        INSERT INTO bank_accounts (id, userId, accountNumber, ifsc, bankName, balance, createdAt)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;
      const { rows } = await this.pool.query(query, [
        account.id, account.userId, account.accountNumber, account.ifsc,
        account.bankName, account.balance, account.createdAt
      ]);
      return rows[0];
    } else {
      return new Promise((resolve, reject) => {
        const sql = `INSERT INTO bank_accounts (id, userId, accountNumber, ifsc, bankName, balance, createdAt)
                     VALUES (?, ?, ?, ?, ?, ?, ?)`;
        this.db.run(sql, [
          account.id, account.userId, account.accountNumber, account.ifsc,
          account.bankName, account.balance, account.createdAt
        ], function(err) {
          if (err) reject(err);
          else resolve(account);
        });
      });
    }
  }

  async getBankAccountsByUserId(userId) {
    if (dbClient === 'pg') {
      const { rows } = await this.pool.query('SELECT * FROM bank_accounts WHERE userId = $1', [userId]);
      return rows;
    } else {
      return new Promise((resolve, reject) => {
        this.db.all('SELECT * FROM bank_accounts WHERE userId = ?', [userId], (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        });
      });
    }
  }

  async updateBankAccount(account) {
    if (dbClient === 'pg') {
      const query = `
        UPDATE bank_accounts 
        SET accountNumber = $1, ifsc = $2, bankName = $3, balance = $4
        WHERE id = $5
        RETURNING *
      `;
      const { rows } = await this.pool.query(query, [
        account.accountNumber, account.ifsc, account.bankName, account.balance, account.id
      ]);
      return rows[0];
    } else {
      return new Promise((resolve, reject) => {
        const sql = `UPDATE bank_accounts SET accountNumber = ?, ifsc = ?, bankName = ?, balance = ? WHERE id = ?`;
        this.db.run(sql, [
          account.accountNumber, account.ifsc, account.bankName, account.balance, account.id
        ], function(err) {
          if (err) reject(err);
          else resolve(account);
        });
      });
    }
  }

  // Transaction operations
  async createTransaction(transaction) {
    if (dbClient === 'pg') {
      const query = `
        INSERT INTO transactions (id, fromUserId, toUserId, fromUpiId, toUpiId, amount, description, status, failureReason, createdAt)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `;
      const { rows } = await this.pool.query(query, [
        transaction.id, transaction.fromUserId, transaction.toUserId, transaction.fromUpiId,
        transaction.toUpiId, transaction.amount, transaction.description, transaction.status,
        transaction.failureReason, transaction.createdAt
      ]);
      return rows[0];
    } else {
      return new Promise((resolve, reject) => {
        const sql = `INSERT INTO transactions (id, fromUserId, toUserId, fromUpiId, toUpiId, amount, description, status, failureReason, createdAt)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        this.db.run(sql, [
          transaction.id, transaction.fromUserId, transaction.toUserId, transaction.fromUpiId,
          transaction.toUpiId, transaction.amount, transaction.description, transaction.status,
          transaction.failureReason, transaction.createdAt
        ], function(err) {
          if (err) reject(err);
          else resolve(transaction);
        });
      });
    }
  }

  async getTransactionsByUserId(userId, page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    
    if (dbClient === 'pg') {
      const { rows } = await this.pool.query(`
        SELECT * FROM transactions 
        WHERE fromUserId = $1 OR toUserId = $1
        ORDER BY createdAt DESC
        LIMIT $2 OFFSET $3
      `, [userId, limit, offset]);
      return rows;
    } else {
      return new Promise((resolve, reject) => {
        this.db.all(`
          SELECT * FROM transactions 
          WHERE fromUserId = ? OR toUserId = ?
          ORDER BY createdAt DESC
          LIMIT ? OFFSET ?
        `, [userId, userId, limit, offset], (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        });
      }); 
    }
  }

  async getAllTransactions() {
    if (dbClient === 'pg') {
      const { rows } = await this.pool.query('SELECT * FROM transactions ORDER BY createdAt DESC');
      return rows;
    } else {
      return new Promise((resolve, reject) => {
        this.db.all('SELECT * FROM transactions ORDER BY createdAt DESC', [], (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        });
      });
    }
  }

  // Test log operations
  async logTestCase(testCase, input, expectedResult, actualResult, status) {
    const testLog = {
      id: require('uuid').v4(),
      testCase,
      input: JSON.stringify(input),
      expectedResult: JSON.stringify(expectedResult),
      actualResult: JSON.stringify(actualResult),
      status,
      timestamp: new Date().toISOString()
    };

    if (dbClient === 'pg') {
      const query = `
        INSERT INTO test_logs (id, testCase, input, expectedResult, actualResult, status, timestamp)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;
      const { rows } = await this.pool.query(query, [
        testLog.id, testLog.testCase, testLog.input, testLog.expectedResult,
        testLog.actualResult, testLog.status, testLog.timestamp
      ]);
      return rows[0];
    } else {
      return new Promise((resolve, reject) => {
        const sql = `INSERT INTO test_logs (id, testCase, input, expectedResult, actualResult, status, timestamp)
                     VALUES (?, ?, ?, ?, ?, ?, ?)`;
        this.db.run(sql, [
          testLog.id, testLog.testCase, testLog.input, testLog.expectedResult,
          testLog.actualResult, testLog.status, testLog.timestamp
        ], function(err) {
          if (err) reject(err);
          else resolve(testLog);
        });
      });
    }
  }

  async getTestLogs() {
    if (dbClient === 'pg') {
      const { rows } = await this.pool.query('SELECT * FROM test_logs ORDER BY timestamp DESC');
      return rows;
    } else {
      return new Promise((resolve, reject) => {
        this.db.all('SELECT * FROM test_logs ORDER BY timestamp DESC', [], (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        });
      }); 
    }
  }

  // Reset database
  async reset() {
    if (dbClient === 'pg') {
      await this.pool.query(`
        DROP TABLE IF EXISTS test_logs, transactions, bank_accounts, upi_ids, users CASCADE
      `);
      await this.initPostgres();
    } else {
      return new Promise((resolve, reject) => {
        this.db.serialize(() => {
          this.db.exec(`
            DROP TABLE IF EXISTS test_logs;
            DROP TABLE IF EXISTS transactions;
            DROP TABLE IF EXISTS bank_accounts;
            DROP TABLE IF EXISTS upi_ids;
            DROP TABLE IF EXISTS users;
          `, (err) => {
            if (err) {
              reject(err);
            } else {
              this.initSqlite();
              resolve();
            }
          });
        });
      });
    }
  }

  async close() {
    if (dbClient === 'pg') {
      await this.pool.end();
    } else {
      this.db.close();
    }
  }
}

module.exports = Database;