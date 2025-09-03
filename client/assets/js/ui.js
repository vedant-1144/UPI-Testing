// 🎨 UI Manager - Handles all user interface interactions
class UIManager {
    constructor() {
        this.toastCounter = 0;
        this.initializeEventListeners();
    }
    
    // 🎯 Initialize global event listeners
    initializeEventListeners() {
        // Handle ESC key for modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
        });
        
        // Handle click outside modal to close
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-overlay')) {
                this.closeAllModals();
            }
        });
    }
    
    // 📱 Show/Hide sections
    showSection(sectionId) {
        this.hideAllSections();
        const section = document.getElementById(sectionId);
        if (section) {
            section.style.display = 'block';
            setTimeout(() => section.classList.add('fade-in'), 50);
        }
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
    
    // 🔔 Toast notifications
    showToast(message, type = 'info') {
        const toastId = `toast-${++this.toastCounter}`;
        const toastContainer = this.getOrCreateToastContainer();
        
        const toast = Utils.createElement('div', `toast toast-${type}`, `
            <div class="toast-content">
                <i class="fas ${this.getToastIcon(type)}"></i>
                <span>${Utils.sanitizeInput(message)}</span>
            </div>
            <button class="toast-close" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `);
        
        toast.id = toastId;
        toastContainer.appendChild(toast);
        
        // Auto remove after duration
        setTimeout(() => {
            const toastElement = document.getElementById(toastId);
            if (toastElement) {
                toastElement.classList.add('fade-out');
                setTimeout(() => toastElement.remove(), 300);
            }
        }, CONFIG.UI.TOAST_DURATION);
    }
    
    getOrCreateToastContainer() {
        let container = document.getElementById('toastContainer');
        if (!container) {
            container = Utils.createElement('div', 'toast-container');
            container.id = 'toastContainer';
            document.body.appendChild(container);
        }
        return container;
    }
    
    getToastIcon(type) {
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };
        return icons[type] || icons.info;
    }
    
    // 🪟 Modal management
    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'flex';
            setTimeout(() => modal.classList.add('fade-in'), 50);
        }
    }
    
    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('fade-out');
            setTimeout(() => {
                modal.style.display = 'none';
                modal.classList.remove('fade-in', 'fade-out');
            }, 300);
        }
    }
    
    closeAllModals() {
        const modals = document.querySelectorAll('.modal-overlay');
        modals.forEach(modal => {
            if (modal.style.display !== 'none') {
                this.hideModal(modal.id);
            }
        });
    }
    
    // 🔄 Loading states
    showButtonLoading(button) {
        if (!button) return;
        const btnText = button.querySelector('.btn-text');
        const btnLoader = button.querySelector('.btn-loader');
        
        if (btnText) btnText.style.display = 'none';
        if (btnLoader) btnLoader.style.display = 'flex';
        button.disabled = true;
    }
    
    hideButtonLoading(button) {
        if (!button) return;
        const btnText = button.querySelector('.btn-text');
        const btnLoader = button.querySelector('.btn-loader');
        
        if (btnText) btnText.style.display = 'flex';
        if (btnLoader) btnLoader.style.display = 'none';
        button.disabled = false;
    }
    
    // 📝 Form utilities
    clearForm(formId) {
        const form = document.getElementById(formId);
        if (form) {
            form.reset();
            // Clear any error states
            const inputs = form.querySelectorAll('.form-control');
            inputs.forEach(input => {
                input.classList.remove('is-invalid', 'is-valid');
            });
        }
    }
    
    setInputError(inputId, message) {
        const input = document.getElementById(inputId);
        if (input) {
            input.classList.add('is-invalid');
            input.classList.remove('is-valid');
            
            // Show error message
            let errorDiv = input.parentNode.querySelector('.invalid-feedback');
            if (!errorDiv) {
                errorDiv = Utils.createElement('div', 'invalid-feedback');
                input.parentNode.appendChild(errorDiv);
            }
            errorDiv.textContent = message;
        }
    }
    
    clearInputError(inputId) {
        const input = document.getElementById(inputId);
        if (input) {
            input.classList.remove('is-invalid');
            const errorDiv = input.parentNode.querySelector('.invalid-feedback');
            if (errorDiv) {
                errorDiv.remove();
            }
        }
    }
    
    // 📊 Update user interface elements
    updateUserInfo(user) {
        if (!user) return;
        
        // Update user name
        const userNameElements = document.querySelectorAll('.user-name');
        userNameElements.forEach(el => {
            el.textContent = user.name;
        });
        
        // Update balance
        const balanceElements = document.querySelectorAll('.balance-amount');
        balanceElements.forEach(el => {
            el.textContent = Utils.formatCurrency(user.balance || 0);
        });
        
        // Update phone
        const phoneElements = document.querySelectorAll('.user-phone');
        phoneElements.forEach(el => {
            el.textContent = user.phone;
        });
        
        // Update UPI ID
        const upiElements = document.querySelectorAll('.user-upi');
        upiElements.forEach(el => {
            el.textContent = `${user.phone}@payease`;
        });
    }
    
    // 📋 Transaction display
    displayTransactions(transactions, currentUserId) {
        const transactionsList = document.getElementById('transactionsList');
        if (!transactionsList) return;
        
        if (!transactions || transactions.length === 0) {
            transactionsList.innerHTML = `
                <div class="no-transactions">
                    <i class="fas fa-receipt fa-3x text-muted mb-3"></i>
                    <h5 class="text-muted">No transactions yet</h5>
                    <p class="text-muted">Start by sending money to someone!</p>
                </div>
            `;
            return;
        }
        
        transactionsList.innerHTML = transactions.slice(0, 10).map(transaction => {
            const direction = transaction.direction || 'unknown';
            const amount = parseFloat(transaction.amount);
            
            let displayName, displayDetail;
            
            if (direction === 'sent') {
                displayName = transaction.toName || transaction.toUpiId || 'Unknown Recipient';
                displayDetail = transaction.toPhone ? transaction.toPhone : transaction.toUpiId;
            } else if (direction === 'received') {
                displayName = transaction.fromName || transaction.displayName || 'Unknown Sender';
                displayDetail = transaction.fromPhone ? transaction.fromPhone : 'Unknown';
            } else {
                displayName = 'Unknown';
                displayDetail = 'Transaction details unavailable';
            }
            
            const timestamp = transaction.timestamp || transaction.created_at;
            
            return `
                <div class="transaction-item">
                    <div class="transaction-icon ${direction}">
                        <i class="fas ${direction === 'sent' ? 'fa-arrow-up' : direction === 'received' ? 'fa-arrow-down' : 'fa-question'}"></i>
                    </div>
                    <div class="transaction-details">
                        <h6>
                            ${direction === 'sent' ? 'Sent to' : direction === 'received' ? 'Received from' : 'Transaction with'} 
                            ${displayName}
                        </h6>
                        <p class="text-muted mb-0">
                            <small>${Utils.formatDate(timestamp)}</small>
                            ${displayDetail ? `<br><small>${displayDetail}</small>` : ''}
                            ${transaction.description ? `<br><small class="text-info">"${transaction.description}"</small>` : ''}
                            <br><small class="text-secondary">Ref: ${transaction.referenceId}</small>
                        </p>
                    </div>
                    <div class="transaction-amount">
                        <div class="amount ${direction === 'sent' ? 'text-danger' : direction === 'received' ? 'text-success' : 'text-muted'}">
                            ${direction === 'sent' ? '-' : direction === 'received' ? '+' : ''}${Utils.formatCurrency(amount)}
                        </div>
                        <span class="status ${transaction.status.toLowerCase()}">${Utils.capitalizeFirst(transaction.status)}</span>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    // 🎨 Animation utilities
    animateElement(element, animation) {
        element.classList.add(`animate-${animation}`);
        setTimeout(() => {
            element.classList.remove(`animate-${animation}`);
        }, 1000);
    }
    
    // 📱 Responsive utilities
    adaptToScreenSize() {
        const isMobile = Utils.isMobileDevice();
        document.body.classList.toggle('mobile-device', isMobile);
    }
}

// Export for ES6 modules (if supported)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UIManager;
}
