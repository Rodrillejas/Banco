window.DashboardModule = {
    render: async function(container) {
        container.innerHTML = `
            <div class="dashboard-header flex-between">
                <h1 class="page-title">Bienvenido, Admin</h1>
                <div class="date-display">${Utils.formatDate(new Date(), false)}</div>
            </div>

            <div class="stats-grid" id="stats-container">
                <!-- Se cargan vía JS -->
            </div>

            <div class="card">
                <div class="flex-between">
                    <h3>Actividad Reciente</h3>
                    <button class="btn btn-sm btn-primary" onclick="window.appRouter?.navigate('movimientos')">Ver Todas</button>
                </div>
                <div class="table-container">
                    <table id="recent-activity-table">
                        <thead>
                            <tr>
                                <th>Fecha</th>
                                <th>Tipo</th>
                                <th>Origen</th>
                                <th>Destino</th>
                                <th>Monto</th>
                            </tr>
                        </thead>
                        <tbody>
                            <!-- Se cargan vía JS -->
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        await this.loadStats();
        await this.loadActivity();
    },

    loadStats: async function() {
        const statsContainer = document.getElementById('stats-container');
        Utils.showLoader(statsContainer);

        try {
            const stats = await API.dashboard.getStats();
            statsContainer.innerHTML = `
                <div class="card stat-card">
                    <div class="stat-icon"><i class="fa-solid fa-users"></i></div>
                    <div class="stat-info">
                        <h3>Clientes Activos</h3>
                        <div class="value">${stats.clientes_activos}</div>
                    </div>
                </div>
                <div class="card stat-card">
                    <div class="stat-icon"><i class="fa-solid fa-wallet"></i></div>
                    <div class="stat-info">
                        <h3>Cuentas Activas</h3>
                        <div class="value">${stats.cuentas_activas}</div>
                    </div>
                </div>
                <div class="card stat-card">
                    <div class="stat-icon"><i class="fa-solid fa-money-bill-transfer"></i></div>
                    <div class="stat-info">
                        <h3>Transacciones</h3>
                        <div class="value">${stats.transacciones_total}</div>
                    </div>
                </div>
                <div class="card stat-card" style="border-left: 4px solid var(--accent-color);">
                    <div class="stat-icon" style="color: var(--accent-color)"><i class="fa-solid fa-vault"></i></div>
                    <div class="stat-info">
                        <h3>Capital Total</h3>
                        <div class="value">${Utils.formatCurrency(stats.saldo_total)}</div>
                    </div>
                </div>
            `;
        } catch (error) {
            Utils.showEmptyState(statsContainer, 'Error al cargar estadísticas');
        }
    },

    loadActivity: async function() {
        const tbody = document.querySelector('#recent-activity-table tbody');
        Utils.showLoader(tbody);
        // Replace tr from tbody wrapper
        tbody.innerHTML = `<tr><td colspan="5" class="text-center">Cargando...</td></tr>`;

        try {
            const activities = await API.dashboard.getActivity();
            
            if (activities.length === 0) {
                tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-secondary);">No hay transacciones recientes</td></tr>`;
                return;
            }

            tbody.innerHTML = activities.map(act => {
                const tipoBadge = act.tipo_movimiento_id === 1 ? 'badge-success' : 
                                 (act.tipo_movimiento_id === 2 ? 'badge-danger' : 'badge-info');
                                 
                return `
                    <tr>
                        <td>${Utils.formatDate(act.fecha, true)}</td>
                        <td><span class="badge ${tipoBadge}">${act.tipo_movimiento_nombre}</span></td>
                        <td>${act.cuenta_origen_id || '-'}</td>
                        <td>${act.cuenta_destino_id || '-'}</td>
                        <td style="font-weight: 600;">${Utils.formatCurrency(act.valor)}</td>
                    </tr>
                `;
            }).join('');
            
        } catch (error) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--danger-color);">Error al cargar actividad</td></tr>`;
        }
    }
};
