const request = require('supertest');
const app = require('../backend/app');

describe('UPI Payment Simulator API Tests', () => {
  let authToken;
  let testUserId;

  // Clean up database before and after tests
  beforeAll(async () => {
    // Wait for database to be ready
    await new Promise(resolve => setTimeout(resolve, 2000));
  });

  afterAll(async () => {
    // Clean up test data
    try {
      await request(app)
        .post('/api/admin/reset')
        .expect(200);
    } catch (error) {
      console.log('Cleanup warning:', error.message);
    }
  });

  // Test user registration
  describe('POST /api/register', () => {
    test('TC01: Should register a new user successfully', async () => {
      const userData = {
        name: 'Test User',
        phone: '9999999999',
        email: 'test@example.com',
        pin: '1234',
        deviceId: 'test-device-123'
      };

      const response = await request(app)
        .post('/api/register')
        .send(userData)
        .expect(201);

      expect(response.body).toHaveProperty('message', 'User registered successfully');
      expect(response.body).toHaveProperty('upiId');
    });

    test('TC02: Should reject registration with invalid phone number', async () => {
      const userData = {
        name: 'Test User',
        phone: '123', // Invalid phone
        email: 'test@example.com',
        pin: '1234',
        deviceId: 'test-device-123'
      };

      const response = await request(app)
        .post('/api/register')
        .send(userData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    test('TC03: Should reject registration with duplicate phone number', async () => {
      const userData = {
        name: 'Another User',
        phone: '9876543210', // Already exists in test data
        email: 'another@example.com',
        pin: '5678',
        deviceId: 'test-device-456'
      };

      const response = await request(app)
        .post('/api/register')
        .send(userData)
        .expect(409);

      expect(response.body).toHaveProperty('error', 'User already exists');
    });
  });

  // Test user login
  describe('POST /api/login', () => {
    test('TC04: Should login with valid credentials', async () => {
      const loginData = {
        phone: '9876543210',
        pin: 'password',
        deviceId: 'device-test-1'
      };

      const response = await request(app)
        .post('/api/login')
        .send(loginData)
        .expect(200);

      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      
      authToken = response.body.token;
      testUserId = response.body.user.id;
    });

    test('TC05: Should reject login with invalid PIN', async () => {
      const loginData = {
        phone: '9876543210',
        pin: 'wrongpin',
        deviceId: 'device-test-1'
      };

      const response = await request(app)
        .post('/api/login')
        .send(loginData)
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Invalid PIN');
    });

    test('TC06: Should require OTP for new device', async () => {
      const loginData = {
        phone: '9876543210',
        pin: 'password',
        deviceId: 'new-device-123'
      };

      const response = await request(app)
        .post('/api/login')
        .send(loginData)
        .expect(202);

      expect(response.body).toHaveProperty('requiresOTP', true);
    });
  });

  // Test payment functionality
  describe('POST /api/payment', () => {
    test('TC07: Should process valid payment successfully', async () => {
      const paymentData = {
        toUpiId: '9876543211@simulator',
        amount: 100,
        description: 'Test payment',
        pin: 'password'
      };

      const response = await request(app)
        .post('/api/payment')
        .set('Authorization', `Bearer ${authToken}`)
        .send(paymentData)
        .expect(200);

      expect(response.body).toHaveProperty('status', 'SUCCESS');
      expect(response.body).toHaveProperty('transactionId');
    });

    test('TC08: Should reject payment with invalid UPI ID format', async () => {
      const paymentData = {
        toUpiId: 'invalid@upi#id',
        amount: 100,
        description: 'Test payment',
        pin: 'password'
      };

      const response = await request(app)
        .post('/api/payment')
        .set('Authorization', `Bearer ${authToken}`)
        .send(paymentData)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Invalid UPI ID format');
    });

    test('TC09: Should reject payment below minimum amount', async () => {
      const paymentData = {
        toUpiId: '9876543211@simulator',
        amount: 0.001, // Below minimum
        description: 'Test payment',
        pin: 'password'
      };

      const response = await request(app)
        .post('/api/payment')
        .set('Authorization', `Bearer ${authToken}`)
        .send(paymentData)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Invalid amount');
    });

    test('TC10: Should reject payment above maximum limit', async () => {
      const paymentData = {
        toUpiId: '9876543211@simulator',
        amount: 300000, // Above limit
        description: 'Test payment',
        pin: 'password'
      };

      const response = await request(app)
        .post('/api/payment')
        .set('Authorization', `Bearer ${authToken}`)
        .send(paymentData)
        .expect(403);

      expect(response.body).toHaveProperty('error', 'Transaction amount exceeds daily limit');
    });

    test('TC11: Should reject payment with wrong PIN', async () => {
      const paymentData = {
        toUpiId: '9876543211@simulator',
        amount: 100,
        description: 'Test payment',
        pin: 'wrongpin'
      };

      const response = await request(app)
        .post('/api/payment')
        .set('Authorization', `Bearer ${authToken}`)
        .send(paymentData)
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Invalid PIN');
    });

    test('TC12: Should handle payment to non-existent UPI ID', async () => {
      const paymentData = {
        toUpiId: 'nonexistent@simulator',
        amount: 100,
        description: 'Test payment',
        pin: 'password'
      };

      const response = await request(app)
        .post('/api/payment')
        .set('Authorization', `Bearer ${authToken}`)
        .send(paymentData)
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Invalid recipient UPI ID');
    });
  });

  // Test QR code generation
  describe('POST /api/generate-qr', () => {
    test('TC13: Should generate QR code successfully', async () => {
      const qrData = {
        amount: 500,
        merchantName: 'Test Merchant'
      };

      const response = await request(app)
        .post('/api/generate-qr')
        .set('Authorization', `Bearer ${authToken}`)
        .send(qrData)
        .expect(200);

      expect(response.body).toHaveProperty('qrCode');
      expect(response.body).toHaveProperty('merchantInfo');
    });
  });

  // Test transaction history
  describe('GET /api/transactions', () => {
    test('TC14: Should fetch transaction history', async () => {
      const response = await request(app)
        .get('/api/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('transactions');
      expect(Array.isArray(response.body.transactions)).toBe(true);
    });
  });

  // Test profile
  describe('GET /api/profile', () => {
    test('TC15: Should fetch user profile', async () => {
      const response = await request(app)
        .get('/api/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('upiIds');
      expect(response.body).toHaveProperty('bankAccounts');
    });
  });

  // Test authentication
  describe('Authentication Tests', () => {
    test('TC16: Should reject requests without token', async () => {
      const response = await request(app)
        .get('/api/profile')
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Access token required');
    });

    test('TC17: Should reject requests with invalid token', async () => {
      const response = await request(app)
        .get('/api/profile')
        .set('Authorization', 'Bearer invalid_token')
        .expect(403);

      expect(response.body).toHaveProperty('error', 'Invalid or expired token');
    });
  });

  // Test admin endpoints
  describe('Admin Endpoints', () => {
    test('TC18: Should fetch all users (admin)', async () => {
      const response = await request(app)
        .get('/api/admin/users')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    test('TC19: Should fetch all transactions (admin)', async () => {
      const response = await request(app)
        .get('/api/admin/transactions')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    test('TC20: Should reset database (admin)', async () => {
      const response = await request(app)
        .post('/api/admin/reset')
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Database reset successfully');
    });
  });

  // Test validation functions
  describe('Validation Tests', () => {
    const { validateUPIId, validateAmount, validatePIN } = require('../backend/validators');

    test('TC21: Should validate correct UPI ID format', () => {
      expect(validateUPIId('user@bank')).toBe(true);
      expect(validateUPIId('test.user@bank.com')).toBe(true);
      expect(validateUPIId('user123@bank-test')).toBe(true);
    });

    test('TC22: Should reject incorrect UPI ID format', () => {
      expect(validateUPIId('user@')).toBe(false);
      expect(validateUPIId('@bank')).toBe(false);
      expect(validateUPIId('user bank@test')).toBe(false);
      expect(validateUPIId('user@bank#')).toBe(false);
    });

    test('TC23: Should validate correct amounts', () => {
      expect(validateAmount(0.01)).toBe(true);
      expect(validateAmount(100)).toBe(true);
      expect(validateAmount(100000)).toBe(true);
    });

    test('TC24: Should reject incorrect amounts', () => {
      expect(validateAmount(0)).toBe(false);
      expect(validateAmount(-10)).toBe(false);
      expect(validateAmount(100001)).toBe(false);
    });

    test('TC25: Should validate correct PIN format', () => {
      expect(validatePIN('1234')).toBe(true);
      expect(validatePIN('123456')).toBe(true);
    });

    test('TC26: Should reject incorrect PIN format', () => {
      expect(validatePIN('123')).toBe(false);
      expect(validatePIN('1234567')).toBe(false);
      expect(validatePIN('abcd')).toBe(false);
      expect(validatePIN('12a4')).toBe(false);
    });
  });
});
