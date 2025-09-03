# 🚀 PayEase UPI Payment Simulator

A modern, secure UPI payment simulator with PhonePe-inspired UI and enterprise-grade modular architecture.

## 📁 Project Structure

```
upi-payment-simulator/
├── server/                   # 🏗️ Modular Backend
│   ├── app.js               # 🚀 Main server entry point
│   ├── package.json         # 📦 Server dependencies
│   ├── config/              # ⚙️ Configuration
│   ├── models/              # 📊 Data layer
│   ├── controllers/         # 🎮 Business logic
│   ├── middleware/          # 🔧 Cross-cutting concerns
│   └── routes/              # 🛣️ API endpoints
└── client/                  # 🎨 Frontend
    ├── pages/               # 📄 HTML pages
    └── assets/              # 🎨 CSS, JS, Images
```

## ✨ Features

### 🔐 Enterprise Security
- **Account Locking**: Automatic lock after 3 failed login attempts
- **PIN Verification**: Secure transaction processing
- **Rate Limiting**: API protection against abuse
- **Security Headers**: Helmet.js protection

### 💳 Advanced Payment System
- **Dual-Entry Transactions**: DEBIT for sender, CREDIT for receiver
- **Real-time Balance Updates**: Immediate reflection for both parties
- **Transaction Statistics**: Comprehensive reporting and analytics
- **Reference IDs**: Unique transaction tracking
- **UPI ID Support**: Send to any UPI ID format

### 👨‍💼 Admin Panel
- **Account Management**: Unlock locked accounts
- **System Statistics**: Users, transactions, balances
- **Demo Data Creation**: Test user generation
- **Health Monitoring**: Database and API status

### � Modern UI/UX
- **PhonePe-inspired Design**: Clean, modern interface
- **Modular Frontend**: Organized JS modules
- **Responsive Design**: Mobile-first approach
- **Loading Animations**: Smooth user experience

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- PostgreSQL database
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd upi-payment-simulator
   ```

2. **Install server dependencies**
   ```bash
   cd server
   npm install
   ```

3. **Set up PostgreSQL database**
   - Create a database named `upi_simulator`
   - Update connection details in `.env` file

4. **Configure environment variables**
   ```bash
   # server/.env
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=upi_simulator
   DB_USER=postgres
   DB_PASSWORD=your_password
   PORT=3000
   ```

5. **Start the application**
   ```bash
   npm start
   ```

6. **Access the application**
   - 🌐 API: http://localhost:3000
   - 📱 Web App: http://localhost:3000/app
   - 👨‍💼 Admin Panel: http://localhost:3000/admin
   - 📋 API Docs: http://localhost:3000/api/docs

## 🎯 Demo Accounts

### Test Login Credentials
- **Account 1**: 📱 9876543210 | 🔐 PIN: 1234 | 💰 Balance: ₹10,000
- **Account 2**: 📱 9876543211 | 🔐 PIN: 1234 | 💰 Balance: ₹15,000

## � Technology Stack

### Backend (server/)
- **Node.js + Express**: RESTful API with modular architecture
- **PostgreSQL**: ACID-compliant database with connection pooling
- **bcrypt**: Secure PIN hashing
- **helmet + rate-limiting**: Security middleware
- **Modular Structure**: Controllers, Models, Middleware, Routes

### Frontend (client/)
- **Modern HTML5**: Semantic and accessible markup
- **CSS3 + Bootstrap 5**: Responsive design with custom animations
- **Modular JavaScript**: ES6+ with organized modules
- **Font Awesome**: Professional icons

### Database Schema
```sql
-- Users table with security features
users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100),
  email VARCHAR(100) UNIQUE,
  phone VARCHAR(15) UNIQUE,
  pin VARCHAR(255),                    -- bcrypt hashed
  balance DECIMAL(12,2),
  upi_id VARCHAR(100),
  is_locked BOOLEAN DEFAULT FALSE,
  failed_login_attempts INTEGER DEFAULT 0,
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
)

-- Transactions with dual-entry accounting
transactions (
  id SERIAL PRIMARY KEY,
  reference_id VARCHAR(50) UNIQUE,
  from_user_id INTEGER REFERENCES users(id),
  to_user_id INTEGER REFERENCES users(id),
  to_upi_id VARCHAR(100),
  amount DECIMAL(10,2),
  description TEXT,
  status VARCHAR(20) DEFAULT 'SUCCESS',
  transaction_type VARCHAR(20),        -- DEBIT or CREDIT
  created_at TIMESTAMP DEFAULT NOW()
)
```

## 🔧 API Endpoints

### 🔐 Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login with account locking

### 👤 User Management
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID
- `GET /api/users/phone/:phone` - Find user by phone
- `GET /api/users/search?query=` - Search users
- `PUT /api/users/:id/balance` - Update user balance

### 💳 Transactions
- `POST /api/transactions` - Create transaction (dual-entry)
- `GET /api/transactions/user/:userId` - Get user transactions
- `GET /api/transactions` - Get all transactions
- `GET /api/transactions/stats` - Transaction statistics

### 👨‍💼 Admin Panel
- `POST /api/admin/unlock/:userId` - Unlock locked accounts
- `GET /api/admin/locked-accounts` - Get locked accounts
- `DELETE /api/admin/users/clear` - Clear all users
- `POST /api/admin/demo-users` - Create demo users
- `GET /api/admin/stats` - System statistics
- `GET /api/admin/health` - Health check

## � Modular Architecture Benefits

### For Development
- **Separation of Concerns**: Each module has specific responsibilities
- **Easy Testing**: Test individual components independently
- **Team Collaboration**: Multiple developers can work simultaneously
- **Code Reusability**: Shared models and middleware

### For Maintenance
- **Bug Isolation**: Issues contained within specific modules
- **Feature Addition**: Add new features without affecting existing code
- **Self-Documenting**: Clear API documentation and organized structure
- **Scalability**: Enterprise-ready architecture

## 🧪 Testing

### API Testing
```bash
# Health check
curl http://localhost:3000/api/admin/health

# Create demo users
curl -X POST http://localhost:3000/api/admin/demo-users

# Login test
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone":"9876543210","pin":"1234"}'
```

### Frontend Testing
1. Navigate to http://localhost:3000/app
2. Test login with demo accounts
3. Create transactions between accounts
4. Verify admin panel functionality

## 🚀 Production Deployment

### Environment Configuration
```bash
# server/.env (production)
NODE_ENV=production
DB_HOST=your-production-db-host
DB_PORT=5432
DB_NAME=upi_simulator_prod
DB_USER=your-db-user
DB_PASSWORD=your-secure-password
PORT=3000
```

### Security Checklist
- ✅ PIN hashing with bcrypt
- ✅ Account locking after failed attempts
- ✅ Rate limiting on all endpoints
- ✅ Security headers with Helmet.js
- ✅ CORS configuration
- ✅ Input validation and sanitization

## 📈 Future Enhancements

### Planned Features
- **JWT Authentication**: Token-based sessions
- **Real-time Notifications**: WebSocket integration
- **QR Code Payments**: Scan and pay functionality
- **Advanced Analytics**: Transaction insights
- **Multi-language Support**: Internationalization

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Follow the modular structure
4. Add tests for new features
5. Submit a pull request

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

**PayEase** - Enterprise-grade UPI Payment Simulator with modern architecture! 🚀💳✨
