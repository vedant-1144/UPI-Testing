// 💳 Transaction Model
class TransactionModel {
    constructor(db) {
        this.db = db;
    }
    
    // 💸 Create transaction
    async create(transactionData) {
        try {
            const result = await this.db.query(
                `INSERT INTO transactions 
                 (reference_id, from_user_id, to_user_id, to_upi_id, amount, description, status, transaction_type) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
                 RETURNING *`,
                [
                    transactionData.reference_id,
                    transactionData.from_user_id,
                    transactionData.to_user_id,
                    transactionData.to_upi_id,
                    transactionData.amount,
                    transactionData.description,
                    transactionData.status,
                    transactionData.transaction_type
                ]
            );
            return result.rows[0];
        } catch (error) {
            throw new Error(`Error creating transaction: ${error.message}`);
        }
    }
    
    // 📋 Get user transactions (both sent and received)
    async getUserTransactions(userId) {
        try {
            const result = await this.db.query(
                `SELECT 
                    t.*,
                    CASE 
                        WHEN t.from_user_id = $1 THEN 'sent'
                        WHEN t.to_user_id = $1 THEN 'received'
                        ELSE 'unknown'
                    END as direction,
                    CASE 
                        WHEN t.from_user_id = $1 THEN to_users.name
                        ELSE from_users.name
                    END as displayName,
                    CASE 
                        WHEN t.from_user_id = $1 THEN to_users.phone
                        ELSE from_users.phone
                    END as displayPhone,
                    from_users.name as fromName,
                    from_users.phone as fromPhone,
                    to_users.name as toName,
                    to_users.phone as toPhone
                 FROM transactions t
                 LEFT JOIN users from_users ON t.from_user_id = from_users.id
                 LEFT JOIN users to_users ON t.to_user_id = to_users.id
                 WHERE t.from_user_id = $1 OR t.to_user_id = $1
                 ORDER BY t.created_at DESC`,
                [userId]
            );
            return result.rows;
        } catch (error) {
            throw new Error(`Error getting user transactions: ${error.message}`);
        }
    }
    
    // 📊 Get all transactions (admin)
    async getAll() {
        try {
            const result = await this.db.query(
                `SELECT 
                    t.*,
                    from_users.name as fromName,
                    from_users.phone as fromPhone,
                    to_users.name as toName,
                    to_users.phone as toPhone
                 FROM transactions t
                 LEFT JOIN users from_users ON t.from_user_id = from_users.id
                 LEFT JOIN users to_users ON t.to_user_id = to_users.id
                 ORDER BY t.created_at DESC`
            );
            return result.rows;
        } catch (error) {
            throw new Error(`Error getting all transactions: ${error.message}`);
        }
    }
    
    // 🔍 Find transaction by reference ID
    async findByReferenceId(referenceId) {
        try {
            const result = await this.db.query(
                'SELECT * FROM transactions WHERE reference_id = $1',
                [referenceId]
            );
            return result.rows[0] || null;
        } catch (error) {
            throw new Error(`Error finding transaction by reference ID: ${error.message}`);
        }
    }
    
    // 📈 Get transaction statistics
    async getStats(userId = null) {
        try {
            let query = `
                SELECT 
                    COUNT(*) as total_transactions,
                    SUM(CASE WHEN status = 'SUCCESS' THEN 1 ELSE 0 END) as successful_transactions,
                    SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END) as failed_transactions,
                    SUM(CASE WHEN status = 'SUCCESS' THEN amount ELSE 0 END) as total_amount,
                    AVG(CASE WHEN status = 'SUCCESS' THEN amount ELSE NULL END) as average_amount
                FROM transactions
            `;
            
            let params = [];
            if (userId) {
                query += ' WHERE from_user_id = $1 OR to_user_id = $1';
                params.push(userId);
            }
            
            const result = await this.db.query(query, params);
            return result.rows[0];
        } catch (error) {
            throw new Error(`Error getting transaction stats: ${error.message}`);
        }
    }
    
    // 📅 Get transactions by date range
    async getByDateRange(startDate, endDate, userId = null) {
        try {
            let query = `
                SELECT * FROM transactions 
                WHERE created_at >= $1 AND created_at <= $2
            `;
            let params = [startDate, endDate];
            
            if (userId) {
                query += ' AND (from_user_id = $3 OR to_user_id = $3)';
                params.push(userId);
            }
            
            query += ' ORDER BY created_at DESC';
            
            const result = await this.db.query(query, params);
            return result.rows;
        } catch (error) {
            throw new Error(`Error getting transactions by date range: ${error.message}`);
        }
    }
}

module.exports = TransactionModel;
