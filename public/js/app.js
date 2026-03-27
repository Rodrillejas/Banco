// Manejo de la aplicación SPA (Single Page Application)
document.addEventListener('DOMContentLoaded', () => {
    const app = new AppRouter();
    app.init();
});

class AppRouter {
    constructor() {
        this.navItems = document.querySelectorAll('.nav-item');
        this.viewContainer = document.getElementById('view-container');
        this.menuToggle = document.getElementById('menu-toggle');
        this.sidebar = document.querySelector('.sidebar');
        this.currentView = null;
    }

    init() {
        // Event listeners para navegación
        this.navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                const viewName = item.dataset.view;
                this.navigate(viewName);
            });
        });

        // Event listener para menú móvil
        if (this.menuToggle) {
            this.menuToggle.addEventListener('click', () => {
                this.sidebar.classList.toggle('open');
            });
        }

        // Cargar vista inicial (dashboard) o la que esté en la URL // ?view=clientes
        const urlParams = new URLSearchParams(window.location.search);
        const initialView = urlParams.get('view') || 'dashboard';
        this.navigate(initialView);
    }

    navigate(viewName) {
        // Actualizar UI
        this.navItems.forEach(item => item.classList.remove('active'));
        const activeItem = document.querySelector(`.nav-item[data-view="${viewName}"]`);
        if (activeItem) activeItem.classList.add('active');

        // Cerrar sidebar en móvil al navegar
        if (window.innerWidth <= 992) {
            this.sidebar.classList.remove('open');
        }

        // Actualizar URL sin recargar
        const url = new URL(window.location);
        url.searchParams.set('view', viewName);
        window.history.pushState({}, '', url);

        // Renderizar vista
        this.renderView(viewName);
    }

    renderView(viewName) {
        this.currentView = viewName;
        // Limpiar contenedor
        this.viewContainer.innerHTML = '';
        Utils.showLoader(this.viewContainer);

        // Lógica de enrutamiento a módulos
        switch (viewName) {
            case 'dashboard':
                if (window.DashboardModule) DashboardModule.render(this.viewContainer);
                break;
            case 'clientes':
                if (window.ClientesModule) ClientesModule.render(this.viewContainer);
                break;
            case 'cuentas':
                if (window.CuentasModule) CuentasModule.render(this.viewContainer);
                break;
            case 'movimientos':
                if (window.MovimientosModule) MovimientosModule.render(this.viewContainer);
                break;
            case 'empleados':
                if (window.EmpleadosModule) EmpleadosModule.render(this.viewContainer);
                break;
            case 'sedes':
                if (window.SedesModule) SedesModule.render(this.viewContainer);
                break;
            // Otros módulos se pueden ir agregando de forma silenciar
            default:
                this.viewContainer.innerHTML = `
                    <div class="empty-state">
                        <i class="fa-solid fa-person-digging"></i>
                        <h2>Módulo en construcción</h2>
                        <p>El módulo "${viewName}" estará disponible pronto.</p>
                    </div>
                `;
        }
    }
}
