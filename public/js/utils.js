const Utils = {
    // Formatear moneda (Pesos colombianos)
    formatCurrency: (amount) => {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 2
        }).format(amount);
    },

    // Formatear fecha
    formatDate: (dateString, includeTime = false) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        const options = { year: 'numeric', month: '2-digit', day: '2-digit' };
        if (includeTime) {
            options.hour = '2-digit';
            options.minute = '2-digit';
        }
        return new Intl.DateTimeFormat('es-CO', options).format(date);
    },

    // Mostrar Notificación Toast
    showToast: (message, type = 'success') => {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const iconClass = type === 'success' ? 'fa-circle-check' : (type === 'error' ? 'fa-circle-exclamation' : 'fa-circle-info');
        
        toast.innerHTML = `
            <i class="fa-solid ${iconClass}"></i>
            <span>${message}</span>
        `;
        
        container.appendChild(toast);
        
        // Trigger reflow for animation
        setTimeout(() => toast.classList.add('show'), 10);
        
        // Remove after 3 seconds
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },

    // Crear tabla vacía / Skeleton loader
    showLoader: (containerEl) => {
        containerEl.innerHTML = `
            <div class="loader-container">
                <div class="spinner"></div>
            </div>
        `;
    },

    // Estado vacío (No hay datos)
    showEmptyState: (containerEl, message = 'No hay datos disponibles') => {
        containerEl.innerHTML = `
            <div class="empty-state">
                <i class="fa-regular fa-folder-open"></i>
                <p>${message}</p>
            </div>
        `;
    },

    // Confirmación nativa (se puede mejorar con un modal)
    confirmAction: (message) => {
        return confirm(message);
    }
};
