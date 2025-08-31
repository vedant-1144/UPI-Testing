// Modern UPI Payment App - Main JavaScript File
class PayEaseApp {
    constructor() {
        this.currentUser = null;
        this.apiBaseUrl = 'http://localhost:3000';
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.showLoadingScreen();
        this.checkAuthStatus();
    }

    // Loading Screen
    showLoadingScreen() {
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            setTimeout(() => {
                loadingScreen.style.display = 'none';
            }, 2000);
        }
    }

    // Check if user is logged in
    checkAuthStatus() {
        const savedUser = localStorage.getItem('payease_user');
        if (savedUser) {
            this.currentUser = JSON.parse(savedUser);
            this.showDashboard();
        } else {
            this.showLogin();
        }
    }

    // Setup Event Listeners
    setupEventListeners() {
        // Login form
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        // Signup form
        const signupForm = document.getElementById('signupForm');
        if (signupForm) {
            signupForm.addEventListener('submit', (e) => this.handleSignup(e));
        }

        // Payment form
        const paymentForm = document.getElementById('paymentForm');
        if (paymentForm) {
            paymentForm.addEventListener('submit', (e) => this.handlePayment(e));
        }

        // Logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.handleLogout());
        }

        // Window events
        window.addEventListener('load', () => {
            setTimeout(() => this.hideLoadingScreen(), 2000);
        });
    }

    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            loadingScreen.style.display = 'none';
        }
    }

    // Show different sections
    showLogin() {
        this.hideAllSections();
        const loginSection = document.getElementById('loginSection');
        if (loginSection) {
            loginSection.style.display = 'flex';
            loginSection.classList.add('fade-in');
        }
    }

    showSignup() {
        this.hideAllSections();
        const signupSection = document.getElementById('signupSection');
        if (signupSection) {
            signupSection.style.display = 'flex';
            signupSection.classList.add('fade-in');
        }
    }

    showDashboard() {
        this.hideAllSections();
        const dashboardSection = document.getElementById('dashboardSection');
        if (dashboardSection) {
            dashboardSection.style.display = 'block';
            dashboardSection.classList.add('fade-in');
        }
        this.updateUserInfo();
        this.loadTransactions();
    }

    hideAllSections() {
        const sections = ['loginSection', 'signupSection', 'dashboardSection'];
        sections.forEach(sectionId => {
            const section = document.getElementById(sectionId);
            if (section) {
                section.style.display = 'none';
                section.classList.remove('fade-in');
            }
        });
    }

    // Authentication handlers
    async handleLogin(e) {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);
        
        const phone = document.getElementById('loginPhone').value;
        const pin = document.getElementById('loginPin').value;

        this.showButtonLoading(form.querySelector('button[type="submit"]'));

        try {
            // Demo authentication - replace with real API call
            if (this.validateDemoLogin(phone, pin)) {
                const user = {
                    name: phone === '9876543210' ? 'John Doe' : 'Jane Smith',
                    phone: phone,
                    email: phone === '9876543210' ? 'john@example.com' : 'jane@example.com',
                    balance: 10000
                };
                
                this.currentUser = user;
                localStorage.setItem('payease_user', JSON.stringify(user));
                
                this.showToast('Login successful!', 'success');
                this.showDashboard();
            } else {
                throw new Error('Invalid credentials');
            }
        } catch (error) {
            this.showToast('Login failed: ' + error.message, 'error');
        } finally {
            this.hideButtonLoading(form.querySelector('button[type="submit"]'));
        }
    }

    validateDemoLogin(phone, pin) {
        const demoAccounts = [
            { phone: '9876543210', pin: '1234' },
            { phone: '9876543211', pin: '1234' }
        ];
        return demoAccounts.some(account => account.phone === phone && account.pin === pin);
    }

    async handleSignup(e) {
        e.preventDefault();
        const form = e.target;
        
        const name = document.getElementById('signupName').value;
        const email = document.getElementById('signupEmail').value;
        const phone = document.getElementById('signupPhone').value;
        const pin = document.getElementById('signupPin').value;

        this.showButtonLoading(form.querySelector('button[type="submit"]'));

        try {
            // Demo signup - replace with real API call
            const user = {
                name: name,
                phone: phone,
                email: email,
                balance: 5000 // Starting balance for new users
            };
            
            this.currentUser = user;
            localStorage.setItem('payease_user', JSON.stringify(user));
            
            this.showToast('Account created successfully!', 'success');
            this.showDashboard();
        } catch (error) {
            this.showToast('Signup failed: ' + error.message, 'error');
        } finally {
            this.hideButtonLoading(form.querySelector('button[type="submit"]'));
        }
    }

    // Payment handling
    async handlePayment(e) {
        e.preventDefault();
        const form = e.target;
        
        const toUpiId = document.getElementById('toUpiId').value;
        const amount = parseFloat(document.getElementById('amount').value);
        const description = document.getElementById('description').value;
        const pin = document.getElementById('paymentPin').value;

        // Validate PIN for demo
        if (!this.validatePin(pin)) {
            this.showToast('Invalid PIN', 'error');
            return;
        }

        this.showButtonLoading(form.querySelector('button[type="submit"]'));

        try {
            // Simulate payment processing
            await this.simulatePayment();
            
            // Create transaction record
            const transaction = {
                id: this.generateTransactionId(),
                toUpiId: toUpiId,
                amount: amount,
                description: description,
                status: Math.random() > 0.1 ? 'completed' : 'failed', // 90% success rate
                timestamp: new Date().toISOString(),
                type: 'sent'
            };

            // Save transaction
            this.saveTransaction(transaction);
            
            // Update balance if successful
            if (transaction.status === 'completed') {
                this.currentUser.balance -= amount;
                localStorage.setItem('payease_user', JSON.stringify(this.currentUser));
                this.updateUserInfo();
            }

            // Hide payment modal
            this.hidePaymentForm();
            
            // Show result animation
            if (transaction.status === 'completed') {
                this.showSuccessModal(transaction);
            } else {
                this.showFailureModal(transaction);
            }

            // Reload transactions
            this.loadTransactions();
            
        } catch (error) {
            this.showToast('Payment failed: ' + error.message, 'error');
        } finally {
            this.hideButtonLoading(form.querySelector('button[type="submit"]'));
        }
    }

    validatePin(pin) {
        return pin === '1234'; // Demo PIN validation
    }

    async simulatePayment() {
        return new Promise(resolve => {
            setTimeout(resolve, 2000); // Simulate 2 second processing
        });
    }

    generateTransactionId() {
        return 'UPI' + Date.now() + Math.floor(Math.random() * 1000);
    }

    // Transaction management
    saveTransaction(transaction) {
        let transactions = JSON.parse(localStorage.getItem('payease_transactions')) || [];
        transactions.unshift(transaction);
        localStorage.setItem('payease_transactions', JSON.stringify(transactions));
    }

    loadTransactions() {
        const transactions = JSON.parse(localStorage.getItem('payease_transactions')) || [];
        this.displayTransactions(transactions);
    }

    displayTransactions(transactions) {
        const transactionsList = document.getElementById('transactionsList');
        if (!transactionsList) return;

        if (transactions.length === 0) {
            transactionsList.innerHTML = `
                <div class="text-center py-4">
                    <i class="fas fa-history fa-2x text-muted mb-3"></i>
                    <p class="text-muted">No transactions yet</p>
                    <button class="btn btn-outline-primary btn-sm" onclick="showPaymentForm()">
                        Make your first payment
                    </button>
                </div>
            `;
            return;
        }

        transactionsList.innerHTML = transactions.slice(0, 10).map(transaction => `
            <div class="transaction-item">
                <div class="transaction-icon ${transaction.type}">
                    <i class="fas ${transaction.type === 'sent' ? 'fa-arrow-up' : 'fa-arrow-down'}"></i>
                </div>
                <div class="transaction-details">
                    <h6>${transaction.type === 'sent' ? 'Sent to' : 'Received from'} ${transaction.toUpiId || 'Unknown'}</h6>
                    <p class="text-muted mb-0">
                        <small>${this.formatDate(transaction.timestamp)}</small>
                        ${transaction.description ? `<br><small>${transaction.description}</small>` : ''}
                    </p>
                </div>
                <div class="transaction-amount">
                    <div class="amount ${transaction.type === 'sent' ? 'text-danger' : 'text-success'}">
                        ${transaction.type === 'sent' ? '-' : '+'}₹${transaction.amount.toFixed(2)}
                    </div>
                    <span class="status ${transaction.status}">${this.capitalizeFirst(transaction.status)}</span>
                </div>
            </div>
        `).join('');
    }

    // UI Helpers
    updateUserInfo() {
        if (!this.currentUser) return;

        const profileName = document.getElementById('profileName');
        const profilePhone = document.getElementById('profilePhone');
        const balanceAmount = document.getElementById('balanceAmount');
        const userInfo = document.getElementById('userInfo');

        if (profileName) profileName.textContent = this.currentUser.name;
        if (profilePhone) profilePhone.textContent = `+91 ${this.currentUser.phone}`;
        if (balanceAmount) balanceAmount.textContent = `₹${this.currentUser.balance.toLocaleString()}`;
        if (userInfo) {
            userInfo.textContent = this.currentUser.name;
            userInfo.style.display = 'inline';
        }

        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) logoutBtn.style.display = 'inline-block';
    }

    // Modal handlers
    showPaymentForm() {
        const modal = document.getElementById('paymentModal');
        if (modal) {
            modal.style.display = 'flex';
            modal.classList.add('fade-in');
        }
    }

    hidePaymentForm() {
        const modal = document.getElementById('paymentModal');
        if (modal) {
            modal.style.display = 'none';
            modal.classList.remove('fade-in');
        }
        // Reset form
        const form = document.getElementById('paymentForm');
        if (form) form.reset();
    }

    showSuccessModal(transaction) {
        const modal = document.getElementById('successModal');
        if (modal) {
            document.getElementById('successAmount').textContent = `₹${transaction.amount}`;
            document.getElementById('successRecipient').textContent = transaction.toUpiId;
            document.getElementById('successRef').textContent = transaction.id;
            
            modal.style.display = 'flex';
            modal.classList.add('fade-in');
        }
    }

    hideSuccessModal() {
        const modal = document.getElementById('successModal');
        if (modal) {
            modal.style.display = 'none';
            modal.classList.remove('fade-in');
        }
    }

    showFailureModal(transaction) {
        const modal = document.getElementById('failureModal');
        if (modal) {
            document.getElementById('failureRef').textContent = transaction.id;
            
            modal.style.display = 'flex';
            modal.classList.add('fade-in');
        }
    }

    hideFailureModal() {
        const modal = document.getElementById('failureModal');
        if (modal) {
            modal.style.display = 'none';
            modal.classList.remove('fade-in');
        }
    }

    // Toast notifications
    showToast(message, type = 'info') {
        const toastContainer = document.querySelector('.toast-container');
        if (!toastContainer) return;

        const toastId = 'toast-' + Date.now();
        const toast = document.createElement('div');
        toast.id = toastId;
        toast.className = 'toast show';
        toast.innerHTML = `
            <div class="toast-header">
                <div class="toast-icon ${type}"></div>
                <strong class="toast-title me-auto">PayEase</strong>
                <button type="button" class="btn-close" onclick="this.closest('.toast').remove()"></button>
            </div>
            <div class="toast-body">${message}</div>
        `;

        toastContainer.appendChild(toast);

        // Auto remove after 5 seconds
        setTimeout(() => {
            const toastElement = document.getElementById(toastId);
            if (toastElement) {
                toastElement.remove();
            }
        }, 5000);
    }

    // Button loading states
    showButtonLoading(button) {
        if (!button) return;
        const btnText = button.querySelector('.btn-text');
        const btnLoader = button.querySelector('.btn-loader');
        
        if (btnText) btnText.style.display = 'none';
        if (btnLoader) btnLoader.style.display = 'block';
        button.disabled = true;
    }

    hideButtonLoading(button) {
        if (!button) return;
        const btnText = button.querySelector('.btn-text');
        const btnLoader = button.querySelector('.btn-loader');
        
        if (btnText) btnText.style.display = 'inline';
        if (btnLoader) btnLoader.style.display = 'none';
        button.disabled = false;
    }

    // Utility functions
    formatDate(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
            return date.toLocaleTimeString('en-IN', { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
        } else if (diffDays === 1) {
            return 'Yesterday';
        } else if (diffDays < 7) {
            return date.toLocaleDateString('en-IN', { weekday: 'long' });
        } else {
            return date.toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            });
        }
    }

    capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    // Logout
    handleLogout() {
        localStorage.removeItem('payease_user');
        localStorage.removeItem('payease_transactions');
        this.currentUser = null;
        this.showLogin();
        this.showToast('Logged out successfully', 'info');
        
        // Hide user info
        const userInfo = document.getElementById('userInfo');
        const logoutBtn = document.getElementById('logoutBtn');
        if (userInfo) userInfo.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'none';
    }
}

// Global functions for HTML onclick handlers
function showLogin() {
    app.showLogin();
}

function showSignup() {
    app.showSignup();
}

function showPaymentForm() {
    app.showPaymentForm();
}

function hidePaymentForm() {
    app.hidePaymentForm();
}

function showRequestForm() {
    app.showToast('Request Money feature coming soon!', 'info');
}

function showQRCode() {
    app.showToast('QR Code feature coming soon!', 'info');
}

function showHistory() {
    app.loadTransactions();
    app.showToast('Transaction history refreshed', 'info');
}

function loadTransactions() {
    app.loadTransactions();
}

function setAmount(amount) {
    const amountInput = document.getElementById('amount');
    if (amountInput) {
        amountInput.value = amount;
    }
}

function hideSuccessModal() {
    app.hideSuccessModal();
}

function hideFailureModal() {
    app.hideFailureModal();
}

// Initialize app when DOM is loaded
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new PayEaseApp();
});

// Backend API integration (when available)
async function createTransaction(transactionData) {
    try {
        const response = await fetch('http://localhost:3000/api/transactions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(transactionData)
        });
        
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error creating transaction:', error);
        throw error;
    }
}

async function getTransactions() {
    try {
        const response = await fetch('http://localhost:3000/api/transactions');
        
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error fetching transactions:', error);
        return [];
    }
}
