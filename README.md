# PayEase - Modern UPI Payment Simulator

A sleek, modern UPI payment simulator with PhonePe-inspired UI, built with Node.js, Express, and PostgreSQL.

## ✨ Features

### 🔐 Authentication System
- **User Login/Signup**: Secure authentication with phone number and UPI PIN
- **Demo Accounts**: Pre-configured test accounts for quick testing
- **Session Management**: Persistent login state with localStorage

### 💳 Payment System
- **Send Money**: Transfer funds to any UPI ID with PIN verification
- **Real-time Balance**: Live balance updates after transactions
- **Transaction History**: Complete history with status tracking
- **Quick Amounts**: One-click amount selection (₹100, ₹500, ₹1000, ₹2000)

### 🎨 Modern UI/UX
- **PhonePe-inspired Design**: Clean, modern interface with gradient themes
- **Animated Transitions**: Smooth loading screens and page transitions
- **Success/Failure Animations**: Animated checkmark/cross for transaction results
- **Responsive Design**: Works perfectly on desktop and mobile devices
- **Toast Notifications**: Real-time feedback for user actions

### 🎪 Animations & Effects
- **Loading Screen**: Beautiful app loading with progress bar
- **Card Effects**: Hover animations and shadow effects
- **Transaction Animations**: Success/failure animations like PhonePe
- **Smooth Transitions**: Page transitions and form animations
- **Micro-interactions**: Button hover effects and loading states

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

2. **Install dependencies**
   ```bash
   cd backend
   npm install
   cd ../frontend
   npm install
   ```

3. **Set up PostgreSQL database**
   - Create a database named `upi_simulator`
   - Update connection details in `.env` file

4. **Configure environment variables**
   ```bash
   # backend/.env
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=upi_simulator
   DB_USER=postgres
   DB_PASSWORD=your_password
   PORT=3000
   ```

5. **Start the application**
   ```bash
   cd backend
   npm start
   ```

6. **Access the app**
   - Open http://localhost:3000 in your browser
   - Use demo accounts or create a new account

## 🎯 Demo Accounts

### Test Login Credentials
- **Account 1**: 📱 9876543210 | 🔐 PIN: 1234 | 💰 Balance: ₹10,000
- **Account 2**: 📱 9876543211 | 🔐 PIN: 1234 | 💰 Balance: ₹15,000

## 📱 Usage Guide

### 1. Login/Signup
- **Login**: Use demo credentials or your registered account
- **Signup**: Create new account with name, email, phone, and PIN
- **PIN Security**: All transactions require PIN verification

### 2. Send Money
- Click "Send Money" from dashboard
- Enter recipient UPI ID (e.g., user@paytm)
- Choose amount (manual entry or quick select)
- Add optional description
- Enter your PIN to complete transaction

### 3. View Transactions
- Real-time transaction history on dashboard
- Status indicators (Completed/Failed/Pending)
- Amount and timestamp for each transaction
- Click refresh to reload latest transactions

## 🛠 Technology Stack

### Backend
- **Node.js + Express**: RESTful API server
- **PostgreSQL**: Robust database with ACID compliance
- **CORS**: Cross-origin resource sharing
- **dotenv**: Environment variable management

### Frontend
- **Modern HTML5**: Semantic and accessible markup
- **CSS3 Animations**: Custom animations and transitions
- **Vanilla JavaScript**: Clean, modern ES6+ code
- **Bootstrap 5**: Responsive grid and utilities
- **Font Awesome**: Beautiful icons

### Database Schema
```sql
-- Users table
users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100),
  email VARCHAR(100) UNIQUE,
  phone VARCHAR(15) UNIQUE,
  upi_pin VARCHAR(6),
  balance DECIMAL(12,2),
  created_at TIMESTAMP
)

-- Transactions table
transactions (
  id SERIAL PRIMARY KEY,
  reference_id VARCHAR(50) UNIQUE,
  from_user_id INTEGER REFERENCES users(id),
  to_upi_id VARCHAR(100),
  amount DECIMAL(10,2),
  description TEXT,
  status VARCHAR(20),
  transaction_type VARCHAR(20),
  created_at TIMESTAMP
)
```

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration

### Transactions
- `POST /api/transactions` - Create new transaction
- `GET /api/transactions/:userId` - Get user transactions
- `GET /api/transactions` - Get all transactions (admin)

### User Management
- `GET /api/users/:userId/balance` - Get user balance
- `GET /api/health` - API health check

## 🎨 UI Components

### Modern Design Elements
- **Glassmorphism**: Frosted glass effects with backdrop blur
- **Gradient Themes**: Purple to blue gradient backgrounds
- **Card Layouts**: Clean card-based interface
- **Loading States**: Skeleton screens and spinners
- **Micro-animations**: Hover effects and transitions

### Responsive Features
- Mobile-first design approach
- Touch-friendly interface
- Adaptive layouts for different screen sizes
- Optimized performance on mobile devices

## 🧪 Testing

### Manual Testing
1. **Authentication Flow**
   - Test login with demo accounts
   - Test signup with new credentials
   - Verify session persistence

2. **Payment Flow**
   - Send money between accounts
   - Test insufficient balance scenarios
   - Verify PIN validation

3. **UI/UX Testing**
   - Test animations and transitions
   - Verify responsive design
   - Check accessibility features

### Database Testing
- Transaction integrity
- Balance updates
- Concurrent transaction handling

## 🚀 Production Deployment

### Environment Setup
- Set production database credentials
- Configure CORS for production domain
- Set up SSL certificates
- Enable database connection pooling

### Performance Optimization
- Database indexing for faster queries
- API response caching
- Image optimization
- CDN integration for static assets

## 📈 Future Enhancements

### Planned Features
- **QR Code Payments**: Scan and pay functionality
- **Request Money**: Send payment requests
- **Transaction Categories**: Expense categorization
- **Notifications**: Real-time push notifications
- **Multi-language Support**: Hindi, English, and regional languages

### Technical Improvements
- **JWT Authentication**: Token-based authentication
- **Rate Limiting**: API protection against abuse
- **Real-time Updates**: WebSocket integration
- **Advanced Analytics**: Transaction insights and reports

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **PhonePe**: UI/UX inspiration
- **Bootstrap Team**: Responsive framework
- **Font Awesome**: Beautiful icons
- **PostgreSQL**: Reliable database system

## 📞 Support

For support and questions:
- Create an issue on GitHub
- Email: support@payease.com
- Documentation: [Wiki](https://github.com/your-repo/wiki)

---

**PayEase** - Making digital payments simple, secure, and beautiful! 🚀💳✨
