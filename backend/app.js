require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const winston = require('winston');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');
const Database = require('./database');
const { validateUPIId, validateAmount, validatePIN } = require('./validators');

const app = express();
const PORT = process.env.PORT || 8080;
const JWT_SECRET = process.env.JWT_SECRET || 'upi_simulator_secret_key';

// Initialize database
const db = new Database();

// Configure Winston logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'upi-simulator' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
});
app.use(limiter);

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Session timeout tracking
const sessions = new Map();
const SESSION_TIMEOUT = 5 * 60 * 1000; // 5 minutes

// Clean expired sessions
setInterval(() => {
  const now = Date.now();
  for (const [sessionId, session] of sessions) {
    if (now - session.lastActivity > SESSION_TIMEOUT) {
      sessions.delete(sessionId);
      logger.info(`Session ${sessionId} expired`);
    }
  }
}, 60000); // Check every minute

// API Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// User Registration
app.post('/api/register', async (req, res) => {
  try {
    const { name, phone, email, pin, deviceId } = req.body;
    
    // Validate input
    if (!name || !phone || !email || !pin || !deviceId) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (!validatePIN(pin)) {
      return res.status(400).json({ error: 'PIN must be 4-6 digits' });
    }

    // Check if user already exists
    const existingUser = await db.getUserByPhone(phone);
    if (existingUser) {
      return res.status(409).json({ error: 'User already exists' });
    }

    const existingEmail = await db.getUserByEmail(email);
    if (existingEmail) {
      return res.status(409).json({ error: 'Email already exists' });
    }

    // Hash PIN
    const hashedPin = await bcrypt.hash(pin, 10);
    
    // Create user
    const user = await db.createUser({
      name,
      phone,
      email,
      pin_hash: hashedPin,
      device_id: deviceId
    });
    
    // Create default UPI ID
    const upiId = `${phone}@simulator`;
    await db.createUPIId({
      user_id: user.id,
      upi_id: upiId,
      is_default: true
    });

    // Create default bank account
    await db.createBankAccount({
      user_id: user.id,
      account_number: `ACC${phone}${Math.floor(Math.random() * 1000)}`,
      ifsc: 'SIMU0000001',
      bank_name: 'Simulator Bank',
      account_holder_name: name,
      balance: 10000, // Default balance
      is_primary: true
    });

    logger.info(`User registered: ${phone}`);
    res.status(201).json({ 
      message: 'User registered successfully',
      upiId: upiId
    });
  } catch (error) {
    logger.error('Registration error:', error);
    if (error.code === '23505') { // Unique constraint violation
      return res.status(409).json({ error: 'User or email already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// User Login
app.post('/api/login', async (req, res) => {
  try {
    const { phone, pin, deviceId } = req.body;
    
    const user = await db.getUserByPhone(phone);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (user.is_locked) {
      return res.status(423).json({ error: 'Account locked due to multiple failed attempts' });
    }

    // Check device binding
    if (user.device_id !== deviceId) {
      // Simulate OTP requirement for new device
      logger.info(`New device login attempt for user: ${phone}`);
      return res.status(202).json({ 
        message: 'OTP sent to registered mobile number',
        requiresOTP: true 
      });
    }

    // Verify PIN
    const isValidPin = await bcrypt.compare(pin, user.pin_hash);
    if (!isValidPin) {
      const pinAttempts = (user.pin_attempts || 0) + 1;
      if (pinAttempts >= 3) {
        await db.lockUser(user.id);
        logger.warn(`Account locked for user: ${phone}`);
        return res.status(423).json({ error: 'Account locked due to multiple failed attempts' });
      }
      await db.updateUser(user.id, { pin_attempts: pinAttempts });
      return res.status(401).json({ 
        error: 'Invalid PIN',
        attemptsRemaining: 3 - pinAttempts
      });
    }

    // Reset pin attempts and update last login on successful login
    await db.updateUser(user.id, { 
      pin_attempts: 0,
      last_login: new Date().toISOString()
    });

    // Create session
    const sessionId = uuidv4();
    const token = jwt.sign({ userId: user.id, sessionId }, JWT_SECRET, { expiresIn: '1h' });
    
    sessions.set(sessionId, {
      userId: user.id,
      lastActivity: Date.now()
    });

    logger.info(`User logged in: ${phone}`);
    res.json({ 
      token,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email
      }
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user profile
app.get('/api/profile', authenticateToken, async (req, res) => {
  try {
    const user = await db.getUserById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const upiIds = await db.getUPIIdsByUserId(user.id);
    const bankAccounts = await db.getBankAccountsByUserId(user.id);

    res.json({
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email
      },
      upiIds: upiIds.map(upi => ({
        id: upi.id,
        upiId: upi.upi_id,
        isDefault: upi.is_default,
        isActive: upi.is_active
      })),
      bankAccounts: bankAccounts.map(acc => ({
        id: acc.id,
        accountNumber: acc.account_number.replace(/\d(?=\d{4})/g, '*'), // Mask account number
        ifsc: acc.ifsc,
        bankName: acc.bank_name,
        balance: acc.balance,
        isPrimary: acc.is_primary
      }))
    });
  } catch (error) {
    logger.error('Profile fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create payment
app.post('/api/payment', authenticateToken, async (req, res) => {
  try {
    const { toUpiId, amount, description, pin } = req.body;
    
    // Update session activity
    const session = sessions.get(req.user.sessionId);
    if (!session) {
      return res.status(401).json({ error: 'Session expired' });
    }
    session.lastActivity = Date.now();

    // Validate inputs
    if (!validateUPIId(toUpiId)) {
      return res.status(400).json({ error: 'Invalid UPI ID format' });
    }

    if (!validateAmount(amount)) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    if (!validatePIN(pin)) {
      return res.status(400).json({ error: 'Invalid PIN format' });
    }

    // Check compliance rules
    if (amount > 200000) {
      return res.status(403).json({ error: 'Transaction amount exceeds daily limit' });
    }

    // Get sender details
    const sender = await db.getUserById(req.user.userId);
    if (!sender) {
      return res.status(404).json({ error: 'Sender not found' });
    }

    // Verify PIN
    const isValidPin = await bcrypt.compare(pin, sender.pin_hash);
    if (!isValidPin) {
      return res.status(401).json({ error: 'Invalid PIN' });
    }

    // Get sender's primary bank account
    const senderAccount = await db.getPrimaryBankAccount(sender.id);
    if (!senderAccount) {
      return res.status(404).json({ error: 'No bank account found' });
    }

    // Check balance
    if (parseFloat(senderAccount.balance) < amount) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    // Check if recipient exists
    const recipient = await db.getUserByUpiId(toUpiId);
    if (!recipient) {
      // Create failed transaction
      const transactionRef = `TXN${Date.now()}${Math.floor(Math.random() * 1000)}`;
      const failedTransaction = await db.createTransaction({
        transaction_ref: transactionRef,
        from_user_id: sender.id,
        to_upi_id: toUpiId,
        amount: amount,
        description: description || '',
        status: 'FAILED',
        failure_reason: 'Invalid recipient UPI ID'
      });
      
      logger.warn(`Failed transaction - Invalid UPI ID: ${toUpiId}`);
      return res.status(404).json({ 
        error: 'Invalid recipient UPI ID',
        transactionId: failedTransaction.id,
        message: 'Amount will be refunded if debited'
      });
    }

    const recipientAccount = await db.getPrimaryBankAccount(recipient.id);
    if (!recipientAccount) {
      return res.status(404).json({ error: 'Recipient bank account not found' });
    }

    // Generate transaction reference
    const transactionRef = `TXN${Date.now()}${Math.floor(Math.random() * 1000)}`;

    // Get sender's UPI ID
    const senderUpiIds = await db.getUPIIdsByUserId(sender.id);
    const senderUpiId = senderUpiIds.find(upi => upi.is_default)?.upi_id || senderUpiIds[0]?.upi_id;

    // Create transaction
    const transaction = await db.createTransaction({
      transaction_ref: transactionRef,
      from_user_id: sender.id,
      to_user_id: recipient.id,
      from_upi_id: senderUpiId,
      to_upi_id: toUpiId,
      amount: amount,
      description: description || '',
      status: 'SUCCESS'
    });

    // Update balances
    const newSenderBalance = parseFloat(senderAccount.balance) - amount;
    const newRecipientBalance = parseFloat(recipientAccount.balance) + amount;

    await db.updateBankAccountBalance(senderAccount.id, newSenderBalance);
    await db.updateBankAccountBalance(recipientAccount.id, newRecipientBalance);

    logger.info(`Transaction completed: ${transaction.id}`);
    res.json({
      transactionId: transaction.id,
      transactionRef: transactionRef,
      status: 'SUCCESS',
      message: 'Payment completed successfully',
      amount,
      toUpiId,
      timestamp: transaction.created_at
    });
  } catch (error) {
    logger.error('Payment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Generate QR Code for merchant payment
app.post('/api/generate-qr', authenticateToken, async (req, res) => {
  try {
    const { amount, merchantName, merchantUpiId } = req.body;
    
    const qrData = {
      pa: merchantUpiId || 'merchant@simulator',
      pn: merchantName || 'Test Merchant',
      am: amount,
      cu: 'INR',
      tn: `Payment to ${merchantName || 'Test Merchant'}`
    };

    const qrString = `upi://pay?${new URLSearchParams(qrData).toString()}`;
    const qrCode = await QRCode.toDataURL(qrString);

    res.json({
      qrCode,
      qrString,
      merchantInfo: {
        name: qrData.pn,
        upiId: qrData.pa,
        amount: amount
      }
    });
  } catch (error) {
    logger.error('QR generation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get transaction history
app.get('/api/transactions', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const transactions = await db.getTransactionsByUserId(
      req.user.userId, 
      parseInt(page), 
      parseInt(limit)
    );

    res.json({
      transactions,
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    logger.error('Transaction history error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin routes for testing
app.get('/api/admin/users', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const users = await db.getAllUsers(parseInt(page), parseInt(limit));
    res.json(users.map(user => ({
      id: user.id,
      name: user.name,
      phone: user.phone,
      email: user.email,
      is_locked: user.is_locked,
      created_at: user.created_at,
      upi_count: user.upi_count,
      bank_account_count: user.bank_account_count,
      transaction_count: user.transaction_count
    })));
  } catch (error) {
    logger.error('Admin users fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/admin/transactions', async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const transactions = await db.getAllTransactions(parseInt(page), parseInt(limit));
    res.json(transactions);
  } catch (error) {
    logger.error('Admin transactions fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/admin/stats', async (req, res) => {
  try {
    const stats = await db.getDashboardStats();
    res.json(stats);
  } catch (error) {
    logger.error('Admin stats fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reset database for testing
app.post('/api/admin/reset', async (req, res) => {
  try {
    await db.reset();
    sessions.clear();
    logger.info('Database reset completed');
    res.json({ message: 'Database reset successfully' });
  } catch (error) {
    logger.error('Database reset error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  logger.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
app.listen(PORT, () => {
  logger.info(`UPI Simulator Backend running on port ${PORT}`);
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
