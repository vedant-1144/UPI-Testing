// 🔐 Authentication Controller
const bcrypt = require('bcrypt');
const config = require('../config/app');
const Logger = require('../middleware/logger');

class AuthController {
    constructor(userModel) {
        this.userModel = userModel;
    }
    
    // 🔑 Login user
    async login(req, res) {
        try {
            const { phone, pin } = req.body;
            
            if (!phone || !pin) {
                return res.status(400).json({
                    success: false,
                    message: 'Phone and PIN are required'
                });
            }
            
            // Find user by phone
            const user = await this.userModel.findByPhone(phone);
            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid credentials'
                });
            }
            
            // Check if account is locked
            if (user.is_locked) {
                const lockTime = new Date(user.locked_at);
                const unlockTime = new Date(lockTime.getTime() + config.SECURITY.LOCKOUT_TIME);
                
                if (new Date() < unlockTime) {
                    return res.status(423).json({
                        success: false,
                        message: `Account is locked. Try again after ${unlockTime.toLocaleTimeString()}`
                    });
                } else {
                    // Auto-unlock expired lock
                    await this.userModel.unlockAccount(user.id);
                    user.is_locked = false;
                    user.failed_login_attempts = 0;
                }
            }
            
            // Verify PIN
            const isPinValid = await bcrypt.compare(pin, user.pin);
            if (!isPinValid) {
                // Increment failed attempts
                const newAttempts = (user.failed_login_attempts || 0) + 1;
                
                if (newAttempts >= config.SECURITY.MAX_LOGIN_ATTEMPTS) {
                    // Lock account
                    await this.userModel.updateLoginAttempts(user.id, newAttempts, new Date());
                    return res.status(423).json({
                        success: false,
                        message: 'Account locked due to too many failed attempts'
                    });
                } else {
                    await this.userModel.updateLoginAttempts(user.id, newAttempts);
                    return res.status(401).json({
                        success: false,
                        message: `Invalid credentials. ${config.SECURITY.MAX_LOGIN_ATTEMPTS - newAttempts} attempts remaining`
                    });
                }
            }
            
            // Reset failed attempts on successful login
            if (user.failed_login_attempts > 0) {
                await this.userModel.updateLoginAttempts(user.id, 0);
            }
            
            // Remove sensitive data
            const { pin: userPin, ...safeUser } = user;
            
            Logger.success(`User ${user.name} logged in successfully`);
            
            res.json({
                success: true,
                message: 'Login successful',
                user: safeUser
            });
            
        } catch (error) {
            Logger.error(`Login error: ${error.message}`);
            res.status(500).json({
                success: false,
                message: 'Login failed'
            });
        }
    }
    
    // 📝 Register user
    async register(req, res) {
        try {
            const { name, email, phone, pin } = req.body;
            
            // Validate input
            if (!name || !email || !phone || !pin) {
                return res.status(400).json({
                    success: false,
                    message: 'All fields are required'
                });
            }
            
            // Validate PIN length
            if (pin.length < config.SECURITY.PIN_LENGTH.min || pin.length > config.SECURITY.PIN_LENGTH.max) {
                return res.status(400).json({
                    success: false,
                    message: `PIN must be ${config.SECURITY.PIN_LENGTH.min}-${config.SECURITY.PIN_LENGTH.max} digits`
                });
            }
            
            // Check if user already exists
            const existingUserByPhone = await this.userModel.findByPhone(phone);
            if (existingUserByPhone) {
                return res.status(409).json({
                    success: false,
                    message: 'Phone number already registered'
                });
            }
            
            const existingUserByEmail = await this.userModel.findByEmail(email);
            if (existingUserByEmail) {
                return res.status(409).json({
                    success: false,
                    message: 'Email already registered'
                });
            }
            
            // Hash PIN
            const hashedPin = await bcrypt.hash(pin, 10);
            
            // Create user
            const userData = {
                name: name.trim(),
                email: email.toLowerCase().trim(),
                phone: phone.trim(),
                pin: hashedPin,
                balance: 1000 // Starting balance
            };
            
            const newUser = await this.userModel.create(userData);
            
            // Remove sensitive data
            const { pin: userPin, ...safeUser } = newUser;
            
            Logger.success(`New user registered: ${newUser.name} (${newUser.phone})`);
            
            res.status(201).json({
                success: true,
                message: 'Registration successful',
                user: safeUser
            });
            
        } catch (error) {
            Logger.error(`Registration error: ${error.message}`);
            res.status(500).json({
                success: false,
                message: 'Registration failed'
            });
        }
    }
    
    // 💰 Refresh user balance
    async refreshBalance(req, res) {
        try {
            const { userId } = req.params;
            
            const user = await this.userModel.findById(userId);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }
            
            res.json({
                success: true,
                balance: parseFloat(user.balance)
            });
            
        } catch (error) {
            Logger.error(`Refresh balance error: ${error.message}`);
            res.status(500).json({
                success: false,
                message: 'Failed to refresh balance'
            });
        }
    }
}

module.exports = AuthController;
