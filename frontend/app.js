// Modern UPI Payment App - Main JavaScript File
class PayEaseApp {
    constructor() {
        this.currentUser = null;
        this.apiBaseUrl = 'http://localhost:3000';
        this.authToken = null; // Add token for authentication
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
    async checkAuthStatus() {
        // Get token from session storage (safer than localStorage for auth)
        const token = sessionStorage.getItem('payease_auth_token');
        
        if (token) {
            this.authToken = token;
            try {
                // Validate token with backend
                const response = await fetch(`${this.apiBaseUrl}/api/auth/validate-token`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                
                const data = await response.json();
                if (data.success) {
                    this.currentUser = data.user;
                    this.showDashboard();
                    return;
                }
            } catch (error) {
                console.error('Token validation error:', error);
                // Clear invalid token
                sessionStorage.removeItem('payease_auth_token');
            }
        }
        
        // If no token or invalid token, show login
        this.showLogin();
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
        
        const phone = document.getElementById('loginPhone').value;
        const pin = document.getElementById('loginPin').value;

        this.showButtonLoading(form.querySelector('button[type="submit"]'));

        try {
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

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Login failed');
            }

            if (data.success) {
                this.currentUser = data.user;
                localStorage.setItem('payease_user', JSON.stringify(data.user));
                sessionStorage.setItem('payease_auth_token', data.token); // Store token in session

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

        this.showButtonLoading(form.querySelector('button[type="submit"]'));

        try {
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

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Registration failed');
            }

            if (data.success) {
                this.currentUser = data.user;
                localStorage.setItem('payease_user', JSON.stringify(data.user));
                sessionStorage.setItem('payease_auth_token', data.token); // Store token in session

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

        this.showButtonLoading(form.querySelector('button[type="submit"]'));

        try {
            const response = await fetch(`${this.apiBaseUrl}/api/transactions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.authToken}`
                },
                body: JSON.stringify({
                    toUpiId: toUpiId,
                    amount: amount,
                    description: description,
                    pin: pin
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Payment failed');
            }

            if (data.success) {
                this.hidePaymentForm();
                if (data.transaction.status === 'completed') {
                    this.showSuccessModal(data.transaction);
                } else {
                    this.showFailureModal(data.transaction);
                }
                this.loadTransactions();
                
                // Update user balance if returned by API
                if (data.user && data.user.balance !== undefined) {
                    this.currentUser.balance = data.user.balance;
                    this.updateUserInfo();
                }
            } else {
                throw new Error(data.message || 'Payment failed');
            }
        } catch (error) {
            this.showToast('Payment failed: ' + error.message, 'error');
        } finally {
            this.hideButtonLoading(form.querySelector('button[type="submit"]'));
        }
    }

    // Transaction management
    async loadTransactions() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/api/transactions?userId=${this.currentUser.id}`, {
                headers: {
                    'Authorization': `Bearer ${this.authToken}`
                }
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.displayTransactions(data.transactions);
            } else {
                this.displayTransactions([]);
                console.error('Error loading transactions:', data.message);
            }
        } catch (error) {
            console.error('Failed to load transactions:', error);
            this.displayTransactions([]);
            this.showToast('Failed to load transactions', 'error');
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
            // Determine if transaction is sent or received
            const isSent = transaction.from_user_id === this.currentUser.id;
            const type = isSent ? 'sent' : 'received';
            const amount = parseFloat(transaction.amount);
            
            return `
                <div class="transaction-item">
                    <div class="transaction-icon ${type}">
                        <i class="fas ${type === 'sent' ? 'fa-arrow-up' : 'fa-arrow-down'}"></i>
                    </div>
                    <div class="transaction-details">
                        <h6>${type === 'sent' ? 'Sent to' : 'Received from'} ${isSent ? transaction.to_upi_id : transaction.from_name || 'Unknown'}</h6>
                        <p class="text-muted mb-0">
                            <small>${this.formatDate(transaction.created_at)}</small>
                            ${transaction.description ? `<br><small>${transaction.description}</small>` : ''}
                        </p>
                    </div>
                    <div class="transaction-amount">
                        <div class="amount ${type === 'sent' ? 'text-danger' : 'text-success'}">
                            ${type === 'sent' ? '-' : '+'}₹${amount.toFixed(2)}
                        </div>
                        <span class="status ${transaction.status}">${this.capitalizeFirst(transaction.status)}</span>
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
        // Clear session storage instead of localStorage
        sessionStorage.removeItem('payease_auth_token');
        this.currentUser = null;
        this.authToken = null;
        
        // Call logout endpoint to invalidate token on server
        fetch(`${this.apiBaseUrl}/api/auth/logout`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.authToken}`
            }
        }).catch(error => console.error('Logout error:', error));
        
        this.showLogin();
        this.showToast('Logged out successfully', 'info');
        
        // Hide user info
        const userInfo = document.getElementById('userInfo');
        const logoutBtn = document.getElementById('logoutBtn');
        if (userInfo) userInfo.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'none';
    }

    async refreshBalance() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/api/user/balance`, {
                headers: {
                    'Authorization': `Bearer ${this.authToken}`
                }
            });
            
            const data = await response.json();
            
            if (data.success && data.balance !== undefined) {
                this.currentUser.balance = data.balance;
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