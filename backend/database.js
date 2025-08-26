const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
  constructor() {
    this.db = new sqlite3.Database(':memory:'); // Using in-memory database for testing
    this.init();
  }

  init() {
    const schema = `
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        phone TEXT UNIQUE NOT NULL,
        email TEXT NOT NULL,
        pin TEXT NOT NULL,
        deviceId TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        isLocked BOOLEAN DEFAULT 0,
        pinAttempts INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS upi_ids (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        upiId TEXT UNIQUE NOT NULL,
        isDefault BOOLEAN DEFAULT 0,
        createdAt TEXT NOT NULL,
        FOREIGN KEY (userId) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS bank_accounts (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        accountNumber TEXT NOT NULL,
        ifsc TEXT NOT NULL,
        bankName TEXT NOT NULL,
        balance REAL DEFAULT 0,
        createdAt TEXT NOT NULL,
        FOREIGN KEY (userId) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        fromUserId TEXT,
        toUserId TEXT,
        fromUpiId TEXT,
        toUpiId TEXT NOT NULL,
        amount REAL NOT NULL,
        description TEXT,
        status TEXT NOT NULL,
        failureReason TEXT,
        createdAt TEXT NOT NULL,
        FOREIGN KEY (fromUserId) REFERENCES users(id),
        FOREIGN KEY (toUserId) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS test_logs (
        id TEXT PRIMARY KEY,
        testCase TEXT NOT NULL,
        input TEXT,
        expectedResult TEXT,
        actualResult TEXT,
        status TEXT NOT NULL,
        timestamp TEXT NOT NULL
      );
    `;

    this.db.exec(schema, (err) => {
      if (err) {
        console.error('Database initialization error:', err);
      } else {
        console.log('Database initialized successfully');
        this.seedTestData();
      }
    });
  }

  seedTestData() {
    // Insert some test data for demonstration
    const testUsers = [
      {
        id: 'user-test-1',
        name: 'Test User 1',
        phone: '9876543210',
        email: 'test1@example.com',
        pin: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // 'password'
        deviceId: 'device-test-1',
        createdAt: new Date().toISOString(),
        isLocked: 0,
        pinAttempts: 0
      },
      {
        id: 'user-test-2',
        name: 'Test User 2',
        phone: '9876543211',
        email: 'test2@example.com',
        pin: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // 'password'
        deviceId: 'device-test-2',
        createdAt: new Date().toISOString(),
        isLocked: 0,
        pinAttempts: 0
      }
    ];

    const testUPIIds = [
      {
        id: 'upi-test-1',
        userId: 'user-test-1',
        upiId: '9876543210@simulator',
        isDefault: 1,
        createdAt: new Date().toISOString()
      },
      {
        id: 'upi-test-2',
        userId: 'user-test-2',
        upiId: '9876543211@simulator',
        isDefault: 1,
        createdAt: new Date().toISOString()
      }
    ];

    const testBankAccounts = [
      {
        id: 'bank-test-1',
        userId: 'user-test-1',
        accountNumber: 'ACC9876543210123',
        ifsc: 'SIMU0000001',
        bankName: 'Simulator Bank',
        balance: 50000,
        createdAt: new Date().toISOString()
      },
      {
        id: 'bank-test-2',
        userId: 'user-test-2',
        accountNumber: 'ACC9876543211456',
        ifsc: 'SIMU0000001',
        bankName: 'Simulator Bank',
        balance: 75000,
        createdAt: new Date().toISOString()
      }
    ];

    // Insert test data
    testUsers.forEach(user => this.createUser(user));
    testUPIIds.forEach(upiId => this.createUPIId(upiId));
    testBankAccounts.forEach(account => this.createBankAccount(account));
  }

  // User operations
  createUser(user) {
    return new Promise((resolve, reject) => {
      const sql = `INSERT INTO users (id, name, phone, email, pin, deviceId, createdAt, isLocked, pinAttempts) 
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
      this.db.run(sql, [
        user.id, user.name, user.phone, user.email, user.pin, 
        user.deviceId, user.createdAt, user.isLocked || 0, user.pinAttempts || 0
      ], function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      });
    });
  }

  getUserByPhone(phone) {
    return new Promise((resolve, reject) => {
      const sql = `SELECT * FROM users WHERE phone = ?`;
      this.db.get(sql, [phone], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  getUserById(id) {
    return new Promise((resolve, reject) => {
      const sql = `SELECT * FROM users WHERE id = ?`;
      this.db.get(sql, [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  updateUser(user) {
    return new Promise((resolve, reject) => {
      const sql = `UPDATE users SET name = ?, email = ?, isLocked = ?, pinAttempts = ? WHERE id = ?`;
      this.db.run(sql, [user.name, user.email, user.isLocked, user.pinAttempts, user.id], function(err) {
        if (err) reject(err);
        else resolve(this.changes);
      });
    });
  }

  getAllUsers() {
    return new Promise((resolve, reject) => {
      const sql = `SELECT * FROM users ORDER BY createdAt DESC`;
      this.db.all(sql, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  // UPI ID operations
  createUPIId(upiId) {
    return new Promise((resolve, reject) => {
      const sql = `INSERT INTO upi_ids (id, userId, upiId, isDefault, createdAt) VALUES (?, ?, ?, ?, ?)`;
      this.db.run(sql, [upiId.id, upiId.userId, upiId.upiId, upiId.isDefault, upiId.createdAt], function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      });
    });
  }

  getUPIIdsByUserId(userId) {
    return new Promise((resolve, reject) => {
      const sql = `SELECT * FROM upi_ids WHERE userId = ? ORDER BY isDefault DESC`;
      this.db.all(sql, [userId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  getUPIIdByUpiId(upiId) {
    return new Promise((resolve, reject) => {
      const sql = `SELECT * FROM upi_ids WHERE upiId = ?`;
      this.db.get(sql, [upiId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  // Bank account operations
  createBankAccount(account) {
    return new Promise((resolve, reject) => {
      const sql = `INSERT INTO bank_accounts (id, userId, accountNumber, ifsc, bankName, balance, createdAt) 
                   VALUES (?, ?, ?, ?, ?, ?, ?)`;
      this.db.run(sql, [
        account.id, account.userId, account.accountNumber, 
        account.ifsc, account.bankName, account.balance, account.createdAt
      ], function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      });
    });
  }

  getBankAccountsByUserId(userId) {
    return new Promise((resolve, reject) => {
      const sql = `SELECT * FROM bank_accounts WHERE userId = ?`;
      this.db.all(sql, [userId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  updateBankAccount(account) {
    return new Promise((resolve, reject) => {
      const sql = `UPDATE bank_accounts SET balance = ? WHERE id = ?`;
      this.db.run(sql, [account.balance, account.id], function(err) {
        if (err) reject(err);
        else resolve(this.changes);
      });
    });
  }

  // Transaction operations
  createTransaction(transaction) {
    return new Promise((resolve, reject) => {
      const sql = `INSERT INTO transactions (id, fromUserId, toUserId, fromUpiId, toUpiId, amount, description, status, failureReason, createdAt) 
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
      this.db.run(sql, [
        transaction.id, transaction.fromUserId, transaction.toUserId,
        transaction.fromUpiId, transaction.toUpiId, transaction.amount,
        transaction.description, transaction.status, transaction.failureReason,
        transaction.createdAt
      ], function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      });
    });
  }

  getTransactionsByUserId(userId, page = 1, limit = 10) {
    return new Promise((resolve, reject) => {
      const offset = (page - 1) * limit;
      const sql = `SELECT t.*, 
                          fromUser.name as fromUserName, fromUser.phone as fromUserPhone,
                          toUser.name as toUserName, toUser.phone as toUserPhone
                   FROM transactions t
                   LEFT JOIN users fromUser ON t.fromUserId = fromUser.id
                   LEFT JOIN users toUser ON t.toUserId = toUser.id
                   WHERE t.fromUserId = ? OR t.toUserId = ?
                   ORDER BY t.createdAt DESC
                   LIMIT ? OFFSET ?`;
      this.db.all(sql, [userId, userId, limit, offset], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  getAllTransactions() {
    return new Promise((resolve, reject) => {
      const sql = `SELECT t.*, 
                          fromUser.name as fromUserName, fromUser.phone as fromUserPhone,
                          toUser.name as toUserName, toUser.phone as toUserPhone
                   FROM transactions t
                   LEFT JOIN users fromUser ON t.fromUserId = fromUser.id
                   LEFT JOIN users toUser ON t.toUserId = toUser.id
                   ORDER BY t.createdAt DESC`;
      this.db.all(sql, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  // Test log operations
  logTestCase(testCase, input, expectedResult, actualResult, status) {
    return new Promise((resolve, reject) => {
      const sql = `INSERT INTO test_logs (id, testCase, input, expectedResult, actualResult, status, timestamp) 
                   VALUES (?, ?, ?, ?, ?, ?, ?)`;
      const id = require('uuid').v4();
      this.db.run(sql, [id, testCase, input, expectedResult, actualResult, status, new Date().toISOString()], function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      });
    });
  }

  getTestLogs() {
    return new Promise((resolve, reject) => {
      const sql = `SELECT * FROM test_logs ORDER BY timestamp DESC`;
      this.db.all(sql, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  // Reset database
  reset() {
    return new Promise((resolve, reject) => {
      const sql = `
        DELETE FROM test_logs;
        DELETE FROM transactions;
        DELETE FROM bank_accounts;
        DELETE FROM upi_ids;
        DELETE FROM users;
      `;
      this.db.exec(sql, (err) => {
        if (err) reject(err);
        else {
          this.seedTestData();
          resolve();
        }
      });
    });
  }

  close() {
    this.db.close();
  }
}

module.exports = Database;
