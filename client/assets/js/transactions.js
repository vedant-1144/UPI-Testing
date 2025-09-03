// 💳 Transaction Manager
class TransactionManager {
    constructor(authManager, uiManager) {
        this.authManager = authManager;
        this.uiManager = uiManager;
    }
    
    // 💸 Send money
    async sendMoney(transactionData) {
        try {
            console.log('💸 Processing transaction:', transactionData);
            
            const result = await Utils.makeApiCall(CONFIG.API_BASE_URL + CONFIG.API_ENDPOINTS.TRANSACTIONS.CREATE, {
                method: 'POST',
                body: JSON.stringify({
                    fromUserId: this.authManager.getCurrentUser().id,
                    ...transactionData
                })
            });
            
            console.log('Transaction response:', result);
            
            if (result.success && result.data.success) {
                // Update balance if provided
                if (result.data.balances && result.data.balances.sender) {
                    const user = this.authManager.getCurrentUser();
                    user.balance = result.data.balances.sender.current;
                    this.authManager.saveUser(user);
                }
                
                return { 
                    success: true, 
                    transaction: result.data.transaction,
                    balances: result.data.balances
                };
            } else {
                const message = result.data.message || 'Transaction failed';
                return { success: false, message };
            }
        } catch (error) {
            console.error('Transaction error:', error);
            return { success: false, message: 'Network error' };
        }
    }
    
    // 📋 Get user transactions
    async getUserTransactions(userId = null) {
        try {
            const targetUserId = userId || this.authManager.getCurrentUser()?.id;
            if (!targetUserId) {
                throw new Error('No user ID available');
            }
            
            console.log('📋 Loading transactions for user:', targetUserId);
            
            const result = await Utils.makeApiCall(
                `${CONFIG.API_BASE_URL}${CONFIG.API_ENDPOINTS.TRANSACTIONS.GET_BY_USER}/${targetUserId}`
            );
            
            console.log('Transactions response:', result);
            
            if (result.success && result.data.success) {
                return { success: true, transactions: result.data.transactions };
            } else {
                return { success: false, message: result.data.message || 'Failed to load transactions' };
            }
        } catch (error) {
            console.error('Failed to load transactions:', error);
            return { success: false, message: 'Network error' };
        }
    }
    
    // 📊 Get all transactions (admin)
    async getAllTransactions() {
        try {
            const result = await Utils.makeApiCall(
                CONFIG.API_BASE_URL + CONFIG.API_ENDPOINTS.TRANSACTIONS.GET_ALL
            );
            
            if (result.success && result.data.success) {
                return { success: true, transactions: result.data.transactions };
            } else {
                return { success: false, message: result.data.message || 'Failed to load transactions' };
            }
        } catch (error) {
            console.error('Failed to load all transactions:', error);
            return { success: false, message: 'Network error' };
        }
    }
    
    // 🎯 Validate transaction data
    validateTransaction(data) {
        const errors = [];
        
        // Amount validation
        if (!data.amount || !Utils.validateAmount(data.amount)) {
            errors.push('Invalid amount');
        }
        
        // Recipient validation
        if (!data.toUserId && !data.toUpiId) {
            errors.push('Recipient is required');
        }
        
        // PIN validation
        if (!data.pin || !Utils.validatePin(data.pin)) {
            errors.push('Valid PIN is required');
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }
    
    // 🏷️ Format transaction for display
    formatTransactionForDisplay(transaction, currentUserId) {
        const isOutgoing = transaction.from_user_id === currentUserId;
        const direction = transaction.direction || (isOutgoing ? 'sent' : 'received');
        
        return {
            ...transaction,
            direction,
            displayAmount: Utils.formatCurrency(transaction.amount),
            formattedDate: Utils.formatDate(transaction.created_at),
            icon: direction === 'sent' ? 'fa-arrow-up' : 'fa-arrow-down',
            colorClass: direction === 'sent' ? 'text-danger' : 'text-success',
            amountPrefix: direction === 'sent' ? '-' : '+',
            displayName: this.getDisplayName(transaction, direction),
            displayDetail: this.getDisplayDetail(transaction, direction)
        };
    }
    
    // 👤 Get display name for transaction
    getDisplayName(transaction, direction) {
        if (direction === 'sent') {
            return transaction.toName || transaction.toUpiId || 'Unknown Recipient';
        } else {
            return transaction.fromName || transaction.displayName || 'Unknown Sender';
        }
    }
    
    // 📝 Get display detail for transaction
    getDisplayDetail(transaction, direction) {
        if (direction === 'sent') {
            return transaction.toPhone ? transaction.toPhone : transaction.toUpiId;
        } else {
            return transaction.fromPhone || 'Unknown';
        }
    }
}

// Export for ES6 modules (if supported)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TransactionManager;
}
