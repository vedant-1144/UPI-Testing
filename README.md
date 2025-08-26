# UPI Payment Simulator

A comprehensive UPI (Unified Payments Interface) payment simulation and testing platform built for software testing and quality assurance purposes.

## Features

- Simulate UPI payment transactions
- Test various payment scenarios and edge cases
- Generate and scan QR codes for payments
- Track transaction history
- User authentication and security testing
- Admin panel for test data management

## Project Structure

```
upi-payment-simulator/
├── backend/             # Express.js backend API
│   ├── app.js           # Main application file
│   ├── database.js      # Database operations
│   └── validators.js    # Input validation
├── frontend/            # Simple HTML/CSS/JS frontend
│   ├── app.js           # Frontend JavaScript
│   ├── index.html       # Main HTML file
│   └── styles.css       # CSS styles
├── docs/                # Documentation
│   ├── api-spec.json    # API specification
│   └── test-cases.md    # Test cases documentation
└── tests/               # Automated tests
    └── api.test.js      # API tests
```

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm

### Installation

1. Clone the repository
   ```bash
   git clone https://github.com/YOUR_USERNAME/upi-payment-simulator.git
   cd upi-payment-simulator
   ```

2. Install backend dependencies
   ```bash
   cd backend
   npm install
   ```

3. Install frontend dependencies
   ```bash
   cd ../frontend
   npm install
   ```

### Running the Application

1. Start the backend server
   ```bash
   cd backend
   npm start
   ```
   The backend will run on http://localhost:8080

2. Start the frontend server
   ```bash
   cd frontend
   npm start
   ```
   The frontend will run on http://localhost:8000

3. Open your browser and navigate to http://localhost:8000

### Test Accounts

For testing purposes, the following accounts are pre-configured:

- User 1:
  - Phone: 9876543210
  - PIN: password
  - Balance: ₹50,000

- User 2:
  - Phone: 9876543211
  - PIN: password
  - Balance: ₹75,000

## Running Tests

```bash
cd backend
npm test
```

## License

MIT
