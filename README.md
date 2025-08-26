# UPI Payment Simulator - Setup and Usage Guide

## Project Overview
This is a comprehensive UPI Payment Simulation & Testing Platform designed for software testing assignments. It implements core UPI functionalities in a simplified environment for testing demonstration.

## Features Implemented

### Core Features
- ✅ User registration and authentication
- ✅ UPI PIN validation with lockout mechanism
- ✅ P2P (Person-to-Person) payments
- ✅ P2M (Person-to-Merchant) QR code generation
- ✅ Transaction history and balance management
- ✅ Session timeout and security controls
- ✅ Compliance rule enforcement
- ✅ Comprehensive error handling

### Testing Features
- ✅ Automated test case execution
- ✅ Manual testing interface
- ✅ Test data generation
- ✅ Audit logging and reporting
- ✅ Admin dashboard for monitoring

## Prerequisites

Before running the project, ensure you have:

- **Node.js** (v14 or higher)
- **npm** (v6 or higher)
- **Git** (for cloning)

## Installation and Setup

### 1. Navigate to Project Directory
```bash
cd /Users/admin/Downloads/109/STQA/upi-payment-simulator
```

### 2. Install Backend Dependencies
```bash
cd backend
npm install
```

### 3. Start the Backend Server
```bash
npm start
```

The backend server will start on `http://localhost:3000`

### 4. Open Frontend (in a new terminal)
```bash
cd ../frontend
# Serve frontend using a simple HTTP server
python3 -m http.server 8080
# OR using Node.js
npx http-server -p 8080
```

The frontend will be available at `http://localhost:8080`

## Usage Guide

### 1. Access the Application
Open your web browser and navigate to `http://localhost:8080`

### 2. Login with Test Account
Use one of the pre-configured test accounts:
- **Phone:** 9876543210
- **PIN:** password

### 3. Explore Features

#### Dashboard
- View account balance
- See your UPI ID
- Access quick actions

#### Send Money
1. Click "Pay" button
2. Enter recipient UPI ID (e.g., `9876543211@simulator`)
3. Enter amount
4. Add description (optional)
5. Enter your PIN
6. Submit payment

#### Generate QR Code
1. Click "QR" button
2. Enter amount and merchant name
3. Generate QR code for payments

#### View Transactions
- All transactions are displayed in the history section
- Refresh to see latest transactions

### 4. Testing Features

#### Automated Test Cases
The application includes built-in test cases that can be executed from the Test Dashboard:

- **TC01:** UPI PIN Validation
- **TC04:** Invalid UPI ID Format
- **TC05:** Minimum Boundary Amount (₹0.01)
- **TC06:** Maximum Boundary Amount (₹100,000+)
- **TC11:** Session Timeout

#### Manual Testing Scenarios
Test various scenarios manually:

1. **Valid Payment:** Use `9876543211@simulator` as recipient
2. **Invalid UPI ID:** Try `user@xyz#` or `invalid@format`
3. **Amount Boundaries:** Test ₹0.01, ₹100,000, ₹200,001
4. **Wrong PIN:** Use incorrect PIN to test validation
5. **Session Timeout:** Wait 5+ minutes to test timeout

## API Testing

### Using curl commands:

#### Register New User
```bash
curl -X POST http://localhost:3000/api/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New User",
    "phone": "9999999999",
    "email": "new@example.com",
    "pin": "1234",
    "deviceId": "test-device-123"
  }'
```

#### Login
```bash
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "9876543210",
    "pin": "password",
    "deviceId": "device-test-1"
  }'
```

#### Make Payment (requires auth token)
```bash
curl -X POST http://localhost:3000/api/payment \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "toUpiId": "9876543211@simulator",
    "amount": 100,
    "description": "Test payment",
    "pin": "password"
  }'
```

## Running Automated Tests

### Backend API Tests
```bash
cd backend
npm test
```

This will run the complete test suite covering:
- User registration and authentication
- Payment processing
- Validation functions
- Security features
- Error handling

### Test Coverage
```bash
cd backend
npm run test:coverage
```

## Project Structure

```
upi-payment-simulator/
├── backend/
│   ├── app.js              # Main Express application
│   ├── database.js         # Database operations
│   ├── validators.js       # Input validation functions
│   ├── package.json        # Backend dependencies
│   └── logs/              # Application logs
├── frontend/
│   ├── index.html         # Main HTML file
│   ├── app.js            # Frontend JavaScript
│   └── styles.css        # CSS styling
├── tests/
│   └── api.test.js       # Automated test cases
├── docs/
│   ├── test-cases.md     # Detailed test documentation
│   └── README.md         # This file
└── upi.md               # Original PRD document
```

## Admin Features

### Admin Endpoints
Access admin features for testing and monitoring:

- **View All Users:** `GET /api/admin/users`
- **View All Transactions:** `GET /api/admin/transactions`
- **Reset Database:** `POST /api/admin/reset`

### Database Reset
To reset all data and start fresh:
```bash
curl -X POST http://localhost:3000/api/admin/reset
```

## Security Features Implemented

1. **Authentication:** JWT token-based authentication
2. **Rate Limiting:** 100 requests per 15 minutes per IP
3. **Input Validation:** Comprehensive input sanitization
4. **PIN Security:** Bcrypt hashing for PIN storage
5. **Session Management:** 5-minute idle timeout
6. **Device Binding:** OTP requirement for new devices
7. **Data Masking:** Sensitive data masked in responses

## Compliance Features

1. **Transaction Limits:** ₹2,00,000 daily limit enforcement
2. **Audit Logging:** All activities logged
3. **Data Protection:** Sensitive information secured
4. **Error Handling:** Graceful failure management
5. **Regulatory Compliance:** KYC and transaction monitoring

## Test Scenarios Covered

### Functional Testing
- User registration and login
- Payment processing
- UPI ID validation
- Amount boundary testing
- Transaction history

### Security Testing
- Authentication and authorization
- Session management
- Input validation
- SQL injection prevention
- Rate limiting

### Performance Testing
- Response time measurement
- Concurrent user handling
- Load testing capabilities

### Compliance Testing
- Transaction limits
- Audit trail
- Data masking
- Regulatory rules

## Troubleshooting

### Common Issues

1. **Port Already in Use**
   ```bash
   # Kill process on port 3000
   lsof -ti :3000 | xargs kill -9
   ```

2. **Database Issues**
   ```bash
   # Reset database via API
   curl -X POST http://localhost:3000/api/admin/reset
   ```

3. **Frontend Not Loading**
   - Ensure backend is running on port 3000
   - Check browser console for errors
   - Verify CORS settings

### Logs and Debugging
- Backend logs are stored in `backend/logs/`
- Check browser console for frontend errors
- Use network tab to debug API calls

## Extending the Project

### Adding New Test Cases
1. Add test case to `tests/api.test.js`
2. Implement frontend test in `frontend/app.js`
3. Update documentation in `docs/test-cases.md`

### Adding New Features
1. Create new API endpoints in `backend/app.js`
2. Add database operations in `backend/database.js`
3. Update frontend interface as needed
4. Add corresponding tests

## Conclusion

This UPI Payment Simulator provides a comprehensive testing environment for:
- Functional testing of payment systems
- Security vulnerability assessment
- Performance and load testing
- Compliance validation
- Error handling verification

All test cases from the original PRD have been implemented and can be executed both manually and automatically. The system is designed to be easily extendable for additional testing scenarios.

## Support

For issues or questions:
1. Check the logs in `backend/logs/`
2. Verify all dependencies are installed
3. Ensure both backend and frontend are running
4. Test API endpoints using curl or Postman

The project is designed for educational and testing purposes and provides a realistic simulation of UPI payment system functionality.
