// 💳 Transaction Controller
const bcrypt = require('bcrypt');
const config = require('../config/app');
const Logger = require('../middleware/logger');

class TransactionController {
    constructor(userModel, transactionModel) {
        this.userModel = userModel;
        this.transactionModel = transactionModel;
    }
    
    // 💸 Create transaction
    async createTransaction(req, res) {
        try {
            const { fromUserId, toUserId, toUpiId, amount, description, pin } = req.body;
            
            // Validate input
            if (!fromUserId || (!toUserId && !toUpiId) || !amount || !pin) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing required fields'
                });
            }
            
            const transactionAmount = parseFloat(amount);
            
            // Validate amount
            if (isNaN(transactionAmount) || transactionAmount <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid amount'
                });
            }
            
            if (transactionAmount > config.TRANSACTION_LIMITS.MAX_AMOUNT) {
                return res.status(400).json({
                    success: false,
                    message: `Transaction limit exceeded (₹${config.TRANSACTION_LIMITS.MAX_AMOUNT} max)`
                });
            }
            
            // Start transaction
            const client = await this.userModel.db.connect();
            
            try {
                await client.query('BEGIN');
                
                // Get sender
                const sender = await this.userModel.findById(fromUserId);
                if (!sender) {
                    await client.query('ROLLBACK');
                    return res.status(404).json({
                        success: false,
                        message: 'Sender not found'
                    });
                }
                
                // Check if sender account is locked
                if (sender.is_locked) {
                    await client.query('ROLLBACK');
                    return res.status(423).json({
                        success: false,
                        message: 'Sender account is locked'
                    });
                }
                
                // Verify PIN
                const isPinValid = await bcrypt.compare(pin, sender.pin);
                if (!isPinValid) {
                    await client.query('ROLLBACK');
                    return res.status(401).json({
                        success: false,
                        message: 'Invalid PIN'
                    });
                }
                
                // Check balance
                const senderBalance = parseFloat(sender.balance);
                if (senderBalance < transactionAmount) {
                    await client.query('ROLLBACK');
                    return res.status(400).json({
                        success: false,
                        message: 'Insufficient balance'
                    });
                }
                
                // Find recipient
                let recipient = null;
                let actualToUserId = toUserId;
                
                if (!toUserId && toUpiId) {
                    // Extract phone from UPI ID and find user
                    const cleanUpiId = toUpiId.replace('@payease', '').replace('@paytm', '').replace('@phonepe', '').replace('@gpay', '').replace('@upi', '');
                    recipient = await this.userModel.findByPhone(cleanUpiId);
                    if (recipient) {
                        actualToUserId = recipient.id;
                    }
                } else if (toUserId) {
                    recipient = await this.userModel.findById(toUserId);
                }
                
                // Check if recipient account is locked
                if (recipient && recipient.is_locked) {
                    await client.query('ROLLBACK');
                    return res.status(423).json({
                        success: false,
                        message: 'Recipient account is locked'
                    });
                }
                
                // Generate reference ID
                const referenceId = this.generateReferenceId();
                
                // Update sender balance
                const newSenderBalance = senderBalance - transactionAmount;
                await this.userModel.updateBalance(fromUserId, newSenderBalance);
                
                // Create DEBIT transaction for sender
                const debitTransaction = await this.transactionModel.create({
                    reference_id: referenceId,
                    from_user_id: fromUserId,
                    to_user_id: actualToUserId,
                    to_upi_id: toUpiId || `${recipient?.phone}@payease`,
                    amount: transactionAmount,
                    description: description || '',
                    status: 'SUCCESS',
                    transaction_type: 'DEBIT'
                });
                
                let creditTransaction = null;
                let newRecipientBalance = null;
                
                // If recipient exists in our system, update their balance and create CREDIT transaction
                if (recipient) {
                    const recipientBalance = parseFloat(recipient.balance);
                    newRecipientBalance = recipientBalance + transactionAmount;
                    await this.userModel.updateBalance(recipient.id, newRecipientBalance);
                    
                    // Create CREDIT transaction for recipient
                    creditTransaction = await this.transactionModel.create({
                        reference_id: referenceId,
                        from_user_id: fromUserId,
                        to_user_id: recipient.id,
                        to_upi_id: toUpiId || `${recipient.phone}@payease`,
                        amount: transactionAmount,
                        description: description || '',
                        status: 'SUCCESS',
                        transaction_type: 'CREDIT'
                    });
                }
                
                await client.query('COMMIT');
                
                Logger.success(`Transaction completed: ${sender.name} -> ${recipient?.name || toUpiId} | ₹${transactionAmount} | Ref: ${referenceId}`);
                
                res.json({
                    success: true,
                    message: 'Transaction successful',
                    transaction: debitTransaction,
                    balances: {
                        sender: {
                            previous: senderBalance,
                            current: newSenderBalance
                        },
                        ...(recipient && {
                            receiver: {
                                previous: parseFloat(recipient.balance),
                                current: newRecipientBalance
                            }
                        })
                    }
                });
                
            } catch (error) {
                await client.query('ROLLBACK');
                throw error;
            } finally {
                client.release();
            }
            
        } catch (error) {
            Logger.error(`Transaction error: ${error.message}`);
            res.status(500).json({
                success: false,
                message: 'Transaction failed'
            });
        }
    }
    
    // 📋 Get user transactions
    async getUserTransactions(req, res) {
        try {
            const { userId } = req.params;
            
            const transactions = await this.transactionModel.getUserTransactions(userId);
            
            res.json({
                success: true,
                transactions: transactions
            });
            
        } catch (error) {
            Logger.error(`Get user transactions error: ${error.message}`);
            res.status(500).json({
                success: false,
                message: 'Failed to get transactions'
            });
        }
    }
    
    // 📊 Get all transactions (admin)
    async getAllTransactions(req, res) {
        try {
            const transactions = await this.transactionModel.getAll();
            
            res.json({
                success: true,
                transactions: transactions
            });
            
        } catch (error) {
            Logger.error(`Get all transactions error: ${error.message}`);
            res.status(500).json({
                success: false,
                message: 'Failed to get transactions'
            });
        }
    }
    
    // 📈 Get transaction statistics
    async getTransactionStats(req, res) {
        try {
            const { userId } = req.query;
            
            const stats = await this.transactionModel.getStats(userId);
            
            res.json({
                success: true,
                stats: {
                    total_transactions: parseInt(stats.total_transactions),
                    successful_transactions: parseInt(stats.successful_transactions),
                    failed_transactions: parseInt(stats.failed_transactions),
                    total_amount: parseFloat(stats.total_amount) || 0,
                    average_amount: parseFloat(stats.average_amount) || 0
                }
            });
            
        } catch (error) {
            Logger.error(`Get transaction stats error: ${error.message}`);
            res.status(500).json({
                success: false,
                message: 'Failed to get transaction statistics'
            });
        }
    }
    
    // 🏷️ Generate reference ID
    generateReferenceId() {
        const timestamp = Date.now().toString(36);
        const randomStr = Math.random().toString(36).substring(2, 8);
        return `PE${timestamp}${randomStr}`.toUpperCase();
    }
}

module.exports = TransactionController;
