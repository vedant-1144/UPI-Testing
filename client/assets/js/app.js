// 🚀 Main Application Class - PayEase UPI Simulator
class PayEaseApp {
    constructor() {
        console.log('🚀 Initializing PayEase App...');
        
        // Initialize managers
        this.uiManager = new UIManager();
        this.authManager = new AuthManager(this.uiManager);
        this.transactionManager = new TransactionManager(this.authManager, this.uiManager);
        this.userManager = new UserManager(this.authManager, this.uiManager);
        
        // Initialize app
        this.init();
    }
    
    // 🎯 Initialize application
    async init() {
        console.log('🔧 Setting up application...');
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Check if user is already logged in
        if (this.authManager.isLoggedIn()) {
            console.log('👤 User already logged in, showing dashboard');
            this.showDashboard();
        } else {
            console.log('🔑 No user logged in, showing login');
            this.showLogin();
        }
        
        // Adapt UI to screen size
        this.uiManager.adaptToScreenSize();
        
        console.log('✅ PayEase App initialized successfully');
    }
    
    // 🎧 Set up event listeners
    setupEventListeners() {
        // Authentication forms
        const loginForm = document.getElementById('loginForm');
        const signupForm = document.getElementById('signupForm');
        const paymentForm = document.getElementById('paymentForm');
        
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }
        
        if (signupForm) {
            signupForm.addEventListener('submit', (e) => this.handleSignup(e));
        }
        
        if (paymentForm) {
            paymentForm.addEventListener('submit', (e) => this.handlePayment(e));
        }
        
        // Responsive handling
        window.addEventListener('resize', () => {
            this.uiManager.adaptToScreenSize();
        });
    }
    
    // 🔑 Authentication handlers
    async handleLogin(e) {
        e.preventDefault();
        const form = e.target;
        
        const phone = document.getElementById('loginPhone').value;
        const pin = document.getElementById('loginPin').value;
        
        if (!phone || !pin) {
            this.uiManager.showToast('Please fill all fields', 'error');
            return;
        }
        
        this.uiManager.showButtonLoading(form.querySelector('button[type="submit"]'));
        
        try {
            const result = await this.authManager.login(phone, pin);
            
            if (result.success) {
                this.showDashboard();
            }
        } finally {
            this.uiManager.hideButtonLoading(form.querySelector('button[type="submit"]'));
        }
    }
    
    async handleSignup(e) {
        e.preventDefault();
        const form = e.target;
        
        const userData = {
            name: document.getElementById('signupName').value,
            email: document.getElementById('signupEmail').value,
            phone: document.getElementById('signupPhone').value,
            pin: document.getElementById('signupPin').value
        };
        
        // Validate data
        const validation = this.userManager.validateUserData(userData);
        if (!validation.isValid) {
            this.uiManager.showToast(validation.errors[0], 'error');
            return;
        }
        
        this.uiManager.showButtonLoading(form.querySelector('button[type="submit"]'));
        
        try {
            const result = await this.authManager.register(userData);
            
            if (result.success) {
                this.showDashboard();
            }
        } finally {
            this.uiManager.hideButtonLoading(form.querySelector('button[type="submit"]'));
        }
    }
    
    // 💳 Payment handler
    async handlePayment(e) {
        e.preventDefault();
        const form = e.target;
        
        // Get recipient selection type
        const recipientType = document.querySelector('input[name="recipientType"]:checked')?.value;
        let toUserId = null;
        let toUpiId = null;
        
        if (recipientType === 'select') {
            toUserId = document.getElementById('toUserId').value;
            const selectedOption = document.querySelector('#toUserId option:checked');
            if (selectedOption && selectedOption.dataset.phone) {
                toUpiId = `${selectedOption.dataset.phone}@payease`;
            }
        } else {
            toUpiId = document.getElementById('toUpiId').value;
        }
        
        const transactionData = {
            amount: parseFloat(document.getElementById('amount').value),
            description: document.getElementById('description').value,
            pin: document.getElementById('paymentPin').value
        };
        
        // Add recipient info
        if (toUserId) {
            transactionData.toUserId = parseInt(toUserId);
            transactionData.toUpiId = toUpiId;
        } else {
            transactionData.toUpiId = toUpiId;
        }
        
        // Validate transaction
        const validation = this.transactionManager.validateTransaction(transactionData);
        if (!validation.isValid) {
            this.uiManager.showToast(validation.errors[0], 'error');
            return;
        }
        
        this.uiManager.showButtonLoading(form.querySelector('button[type="submit"]'));
        
        try {
            const result = await this.transactionManager.sendMoney(transactionData);
            
            if (result.success) {
                this.hidePaymentForm();
                this.uiManager.updateUserInfo(this.authManager.getCurrentUser());
                
                if (result.transaction.status === 'SUCCESS') {
                    this.showSuccessModal(result.transaction);
                } else {
                    this.showFailureModal(result.transaction);
                }
                
                // Refresh transactions and balance
                await this.loadTransactions();
                await this.refreshBalance();
            } else {
                this.uiManager.showToast('Payment failed: ' + result.message, 'error');
            }
        } finally {
            this.uiManager.hideButtonLoading(form.querySelector('button[type="submit"]'));
        }
    }
    
    // 📱 Screen management
    showLogin() {
        this.uiManager.showSection('loginSection');
    }
    
    showSignup() {
        this.uiManager.showSection('signupSection');
    }
    
    showDashboard() {
        this.uiManager.showSection('dashboardSection');
        this.uiManager.updateUserInfo(this.authManager.getCurrentUser());
        
        // Load transactions after a brief delay
        setTimeout(() => {
            this.loadTransactions();
        }, 100);
    }
    
    // 💳 Payment form management
    showPaymentForm() {
        console.log('💳 Opening payment form...');
        this.uiManager.showModal('paymentModal');
        
        // Initialize payment form after showing modal
        setTimeout(() => {
            this.initPaymentForm();
        }, CONFIG.UI.ANIMATION_DELAY);
    }
    
    hidePaymentForm() {
        this.uiManager.hideModal('paymentModal');
        this.uiManager.clearForm('paymentForm');
        this.resetPaymentForm();
    }
    
    initPaymentForm() {
        console.log('🔧 Initializing payment form...');
        
        const elements = {
            recipientSelectRadio: document.getElementById('recipientSelect'),
            recipientManualRadio: document.getElementById('recipientManual'),
            userSelectionDiv: document.getElementById('userSelectionDiv'),
            upiInputDiv: document.getElementById('upiInputDiv'),
            toUserIdSelect: document.getElementById('toUserId'),
            toUpiIdInput: document.getElementById('toUpiId')
        };
        
        // Check if all elements exist
        const missingElements = Object.entries(elements).filter(([key, el]) => !el);
        if (missingElements.length > 0) {
            console.error('❌ Missing payment form elements:', missingElements.map(([key]) => key));
            return;
        }
        
        console.log('✅ All payment form elements found');
        
        // Set up event listeners
        elements.recipientSelectRadio.addEventListener('change', () => {
            if (elements.recipientSelectRadio.checked) {
                elements.userSelectionDiv.style.display = 'block';
                elements.upiInputDiv.style.display = 'none';
                elements.toUserIdSelect.required = true;
                elements.toUpiIdInput.required = false;
                elements.toUpiIdInput.value = '';
            }
        });
        
        elements.recipientManualRadio.addEventListener('change', () => {
            if (elements.recipientManualRadio.checked) {
                elements.userSelectionDiv.style.display = 'none';
                elements.upiInputDiv.style.display = 'block';
                elements.toUserIdSelect.required = false;
                elements.toUpiIdInput.required = true;
                elements.toUserIdSelect.value = '';
            }
        });
        
        // Load users
        this.loadUsersForDropdown();
    }
    
    resetPaymentForm() {
        // Reset to default state (select user)
        const recipientSelect = document.getElementById('recipientSelect');
        const userSelectionDiv = document.getElementById('userSelectionDiv');
        const upiInputDiv = document.getElementById('upiInputDiv');
        
        if (recipientSelect) {
            recipientSelect.checked = true;
            if (userSelectionDiv) userSelectionDiv.style.display = 'block';
            if (upiInputDiv) upiInputDiv.style.display = 'none';
        }
    }
    
    // 👥 Load users for payment dropdown
    async loadUsersForDropdown() {
        console.log('📋 Loading users for dropdown...');
        
        const currentUser = this.authManager.getCurrentUser();
        if (!currentUser) {
            console.error('❌ No current user found');
            return;
        }
        
        const userSelect = document.getElementById('toUserId');
        if (!userSelect) {
            console.error('❌ User select element not found');
            return;
        }
        
        userSelect.innerHTML = '<option value="">Loading users...</option>';
        
        try {
            const result = await this.userManager.getUsers(true);
            
            if (result.success) {
                userSelect.innerHTML = '<option value="">Select recipient...</option>';
                
                if (result.users && result.users.length > 0) {
                    result.users.forEach(user => {
                        const option = document.createElement('option');
                        option.value = user.id;
                        option.textContent = `${user.name} (${user.phone})`;
                        option.dataset.phone = user.phone;
                        option.dataset.email = user.email;
                        userSelect.appendChild(option);
                    });
                    console.log(`✅ Loaded ${result.users.length} users into dropdown`);
                } else {
                    userSelect.innerHTML = '<option value="">No other users available</option>';
                }
            } else {
                userSelect.innerHTML = `<option value="">Error: ${result.message}</option>`;
            }
        } catch (error) {
            console.error('Failed to load users:', error);
            userSelect.innerHTML = '<option value="">Network error</option>';
        }
    }
    
    // 📊 Transaction management
    async loadTransactions() {
        if (!this.authManager.isLoggedIn()) {
            console.log('No user logged in, skipping transaction load');
            return;
        }
        
        try {
            const result = await this.transactionManager.getUserTransactions();
            
            if (result.success) {
                this.uiManager.displayTransactions(
                    result.transactions, 
                    this.authManager.getCurrentUser().id
                );
            } else {
                console.error('Error loading transactions:', result.message);
                this.uiManager.displayTransactions([]);
            }
        } catch (error) {
            console.error('Failed to load transactions:', error);
            this.uiManager.displayTransactions([]);
        }
    }
    
    // 💰 Balance management
    async refreshBalance() {
        const newBalance = await this.authManager.refreshBalance();
        if (newBalance !== null) {
            this.uiManager.updateUserInfo(this.authManager.getCurrentUser());
        }
    }
    
    // 🎉 Success/Failure modals
    showSuccessModal(transaction) {
        const modal = document.getElementById('successModal');
        if (modal) {
            // Update modal content with transaction details
            const amountEl = modal.querySelector('.success-amount');
            const recipientEl = modal.querySelector('.success-recipient');
            const refEl = modal.querySelector('.success-reference');
            
            if (amountEl) amountEl.textContent = Utils.formatCurrency(transaction.amount);
            if (recipientEl) recipientEl.textContent = transaction.toUpiId || 'Unknown';
            if (refEl) refEl.textContent = transaction.referenceId;
            
            this.uiManager.showModal('successModal');
        }
    }
    
    showFailureModal(transaction) {
        const modal = document.getElementById('failureModal');
        if (modal) {
            // Update modal content with transaction details
            const reasonEl = modal.querySelector('.failure-reason');
            const refEl = modal.querySelector('.failure-reference');
            
            if (reasonEl) reasonEl.textContent = transaction.failureReason || 'Transaction failed';
            if (refEl) refEl.textContent = transaction.referenceId;
            
            this.uiManager.showModal('failureModal');
        }
    }
    
    hideSuccessModal() {
        this.uiManager.hideModal('successModal');
    }
    
    hideFailureModal() {
        this.uiManager.hideModal('failureModal');
    }
    
    // 🚪 Logout
    logout() {
        this.authManager.logout();
        this.showLogin();
    }
    
    // 🛠️ Utility methods for global access
    refreshUsers() {
        console.log('🔄 Manual refresh users triggered');
        this.loadUsersForDropdown();
    }
    
    setAmount(amount) {
        const amountInput = document.getElementById('amount');
        if (amountInput) {
            amountInput.value = amount;
        }
    }
}

// 🌍 Global functions for HTML onclick handlers
let app;

function showLogin() {
    app?.showLogin();
}

function showSignup() {
    app?.showSignup();
}

function showPaymentForm() {
    app?.showPaymentForm();
}

function hidePaymentForm() {
    app?.hidePaymentForm();
}

function refreshUsers() {
    app?.refreshUsers();
}

function showRequestForm() {
    app?.uiManager.showToast('Request Money feature coming soon!', 'info');
}

function showQRCode() {
    app?.uiManager.showToast('QR Code feature coming soon!', 'info');
}

function showHistory() {
    app?.loadTransactions();
    app?.refreshBalance();
    app?.uiManager.showToast('Transaction history refreshed', 'info');
}

function loadTransactions() {
    app?.loadTransactions();
}

function setAmount(amount) {
    app?.setAmount(amount);
}

function logout() {
    app?.logout();
}

function hideSuccessModal() {
    app?.hideSuccessModal();
}

function hideFailureModal() {
    app?.hideFailureModal();
}

// 🚀 Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM loaded, initializing PayEase App...');
    app = new PayEaseApp();
});

// Export for ES6 modules (if supported)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PayEaseApp;
}
