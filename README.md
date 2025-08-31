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
└── tests/               # Automated tests
    └── api.test.js      # API tests
```

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm
- PostgreSQL (v12 or higher)

### Installation

1. Clone the repository
   ```bash
   git clone https://github.com/YOUR_USERNAME/upi-payment-simulator.git
   cd upi-payment-simulator
   ```

2. Set up PostgreSQL database
   ```bash
   # Create database and user
   sudo -u postgres psql
   CREATE DATABASE upi_payments_db;
   CREATE USER upi_user WITH PASSWORD '1234';
   GRANT ALL PRIVILEGES ON DATABASE upi_payments_db TO upi_user;
   \q
   ```

3. Configure environment variables
   ```bash
   cd backend
   # Edit .env with your PostgreSQL settings
   ```

4. Install backend dependencies
   ```bash
   npm install
   ```

5. Install frontend dependencies
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
   Note: Database tables will be created automatically on first run

2. Start the frontend server
   ```bash
   cd frontend
   npm start
   ```
   The frontend will run on http://localhost:8000

3. Open your browser and navigate to http://localhost:8000

### Database Management

To view data in PostgreSQL:
```bash
# Connect to database
psql -h localhost -U upi_user -d upi_payments_db

# List all tables
\dt

# View users
SELECT * FROM users;

# View transactions
SELECT * FROM transactions;
```

### Creating Test Users

The application now requires manual user registration. You can:
1. Use the registration form on the frontend
2. Use the API directly:
   ```bash
   curl -X POST http://localhost:8080/api/register \
     -H "Content-Type: application/json" \
     -d '{
       "name": "Test User",
       "phone": "9876543210",
       "email": "test@example.com",
       "pin": "1234",
       "deviceId": "device123"
     }'
   ```

## Running Tests

```bash
cd backend
npm test
```

## License

MIT
