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
            try {
                this.currentUser = JSON.parse(savedUser);
                this.showDashboard();
            } catch (error) {
                console.error('Error parsing saved user:', error);
                localStorage.removeItem('payease_user');
                this.showLogin();
            }
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
        
        // Ensure user info is updated
        this.updateUserInfo();
        
        // Load transactions after a brief delay to ensure user is set
        setTimeout(() => {
            this.loadTransactions();
        }, 100);
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
        
        const phone = document.getElementById('loginPhone').value;
        const pin = document.getElementById('loginPin').value;

        // Validate inputs
        if (!phone || !pin) {
            this.showToast('Please enter phone number and PIN', 'error');
            return;
        }

        this.showButtonLoading(form.querySelector('button[type="submit"]'));

        try {
            console.log('Sending login request:', {
                phone: phone,
                hasPin: !!pin
            });

            // Call backend API for login
            const response = await fetch(`${this.apiBaseUrl}/api/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    phone: phone,
                    pin: pin
                })
            });

            console.log('Login response status:', response.status);
            const data = await response.json();
            console.log('Login response data:', data);

            if (!response.ok) {
                throw new Error(data.message || 'Login failed');
            }

            if (data.success) {
                this.currentUser = data.user;
                localStorage.setItem('payease_user', JSON.stringify(data.user));
                
                this.showToast('Login successful!', 'success');
                this.showDashboard();
            } else {
                throw new Error(data.message || 'Login failed');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showToast('Login failed: ' + error.message, 'error');
        } finally {
            this.hideButtonLoading(form.querySelector('button[type="submit"]'));
        }
    }

    async handleSignup(e) {
        e.preventDefault();
        const form = e.target;
        
        const name = document.getElementById('signupName').value;
        const email = document.getElementById('signupEmail').value;
        const phone = document.getElementById('signupPhone').value;
        const pin = document.getElementById('signupPin').value;

        // Validate inputs
        if (!name || !email || !phone || !pin) {
            this.showToast('Please fill all required fields', 'error');
            return;
        }

        this.showButtonLoading(form.querySelector('button[type="submit"]'));

        try {
            console.log('Sending registration request:', {
                name: name,
                email: email,
                phone: phone,
                hasPin: !!pin
            });

            // Call backend API for registration
            const response = await fetch(`${this.apiBaseUrl}/api/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: name,
                    email: email,
                    phone: phone,
                    pin: pin
                })
            });

            console.log('Registration response status:', response.status);
            const data = await response.json();
            console.log('Registration response data:', data);

            if (!response.ok) {
                throw new Error(data.message || 'Registration failed');
            }

            if (data.success) {
                this.currentUser = data.user;
                localStorage.setItem('payease_user', JSON.stringify(data.user));
                
                this.showToast('Account created successfully!', 'success');
                this.showDashboard();
            } else {
                throw new Error(data.message || 'Registration failed');
            }
        } catch (error) {
            console.error('Registration error:', error);
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

        // Validate inputs
        if (!toUpiId || !amount || !pin) {
            this.showToast('Please fill all required fields', 'error');
            return;
        }

        if (!this.currentUser || !this.currentUser.id) {
            this.showToast('User not logged in', 'error');
            return;
        }

        this.showButtonLoading(form.querySelector('button[type="submit"]'));

        try {
            console.log('Sending payment request:', {
                fromUserId: this.currentUser.id,
                toUpiId: toUpiId,
                amount: amount,
                description: description,
                hasPin: !!pin
            });

            const response = await fetch(`${this.apiBaseUrl}/api/transactions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    fromUserId: this.currentUser.id,
                    toUpiId: toUpiId,
                    amount: amount,
                    description: description,
                    pin: pin
                })
            });

            console.log('Payment response status:', response.status);
            const data = await response.json();
            console.log('Payment response data:', data);

            if (!response.ok) {
                throw new Error(data.message || 'Payment failed');
            }

            if (data.success) {
                // Update current user balance from response
                if (data.balances && data.balances.sender) {
                    this.currentUser.balance = data.balances.sender.current;
                    localStorage.setItem('payease_user', JSON.stringify(this.currentUser));
                    this.updateUserInfo();
                }

                this.hidePaymentForm();
                
                if (data.transaction.status === 'SUCCESS') {
                    this.showSuccessModal(data.transaction);
                } else {
                    this.showFailureModal(data.transaction);
                }
                
                // Refresh transactions and balance
                await this.loadTransactions();
                await this.refreshBalance();
                
            } else {
                throw new Error(data.message || 'Payment failed');
            }
        } catch (error) {
            console.error('Payment error:', error);
            this.showToast('Payment failed: ' + error.message, 'error');
        } finally {
            this.hideButtonLoading(form.querySelector('button[type="submit"]'));
        }
    }

    // Transaction management
    async loadTransactions() {
        if (!this.currentUser || !this.currentUser.id) {
            console.log('No user logged in, skipping transaction load');
            return;
        }

        try {
            console.log('Loading transactions for user:', this.currentUser.id);
            const response = await fetch(`${this.apiBaseUrl}/api/transactions/${this.currentUser.id}`);
            
            console.log('Transaction response status:', response.status);
            const data = await response.json();
            console.log('Transaction response data:', data);
            
            if (data.success) {
                this.displayTransactions(data.transactions);
            } else {
                console.error('Error loading transactions:', data.message);
                this.displayTransactions([]);
            }
        } catch (error) {
            console.error('Failed to load transactions:', error);
            this.displayTransactions([]);
            // Don't show error toast for transaction loading failures
        }
    }

    displayTransactions(transactions) {
        const transactionsList = document.getElementById('transactionsList');
        if (!transactionsList) return;

        if (!transactions || transactions.length === 0) {
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

        transactionsList.innerHTML = transactions.slice(0, 10).map(transaction => {
            // Use the direction field from backend or determine based on user ID
            const direction = transaction.direction || (transaction.fromUserId === this.currentUser.id ? 'sent' : 'received');
            const amount = parseFloat(transaction.amount);
            
            // Get proper display names and details
            const displayName = direction === 'sent' 
                ? transaction.toUpiId 
                : (transaction.fromName || transaction.fromPhone || 'Unknown');
            
            // Use correct timestamp field
            const timestamp = transaction.timestamp || transaction.created_at;
            
            return `
                <div class="transaction-item">
                    <div class="transaction-icon ${direction}">
                        <i class="fas ${direction === 'sent' ? 'fa-arrow-up' : 'fa-arrow-down'}"></i>
                    </div>
                    <div class="transaction-details">
                        <h6>${direction === 'sent' ? 'Sent to' : 'Received from'} ${displayName}</h6>
                        <p class="text-muted mb-0">
                            <small>${this.formatDate(timestamp)}</small>
                            ${transaction.description ? `<br><small>${transaction.description}</small>` : ''}
                        </p>
                    </div>
                    <div class="transaction-amount">
                        <div class="amount ${direction === 'sent' ? 'text-danger' : 'text-success'}">
                            ${direction === 'sent' ? '-' : '+'}₹${amount.toFixed(2)}
                        </div>
                        <span class="status ${transaction.status.toLowerCase()}">${this.capitalizeFirst(transaction.status)}</span>
                    </div>
                </div>
            `;
        }).join('');
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
        // Clear localStorage
        localStorage.removeItem('payease_user');
        this.currentUser = null;
        
        this.showLogin();
        this.showToast('Logged out successfully', 'info');
        
        // Hide user info
        const userInfo = document.getElementById('userInfo');
        const logoutBtn = document.getElementById('logoutBtn');
        if (userInfo) userInfo.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'none';
    }

    async refreshBalance() {
        if (!this.currentUser || !this.currentUser.id) return;
        
        try {
            const response = await fetch(`${this.apiBaseUrl}/api/user/balance?userId=${this.currentUser.id}`);
            
            const data = await response.json();
            
            if (data.success && data.balance !== undefined) {
                this.currentUser.balance = data.balance;
                localStorage.setItem('payease_user', JSON.stringify(this.currentUser));
                this.updateUserInfo();
            }
        } catch (error) {
            console.error('Failed to refresh balance:', error);
        }
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
    app.refreshBalance();
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