window.CuentasModule = {
    render: async function(container) {
        container.innerHTML = `
            <div class="flex-between">
                <h1 class="page-title">Gestión de Cuentas</h1>
                <button class="btn btn-primary" onclick="CuentasModule.openFormModal()">
                    <i class="fa-solid fa-plus"></i> Abrir Cuenta
                </button>
            </div>

            <div class="card">
                <div class="table-container">
                    <table id="cuentas-table">
                        <thead>
                            <tr>
                                <th>Número Cuenta</th>
                                <th>Cliente</th>
                                <th>Tipo</th>
                                <th>Estado</th>
                                <th>Fecha Apertura</th>
                                <th style="text-align: right">Saldo</th>
                                <th style="text-align: right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            <!-- Se cargan vía JS -->
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Modal Formulario -->
            <div id="cuenta-modal" class="modal-overlay">
                <div class="modal">
                    <div class="modal-header">
                        <h3>Apertura de Nueva Cuenta</h3>
                        <button class="close-modal" onclick="CuentasModule.closeModal()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form id="cuenta-form">
                            <div class="form-group">
                                <label>Cliente (Buscar por ID)</label>
                                <input type="number" class="form-control" id="cliente-id-input" name="cliente_id" required placeholder="Ej: 101">
                            </div>
                            
                            <div class="form-group">
                                <label>Tipo de Cuenta</label>
                                <select class="form-control" id="tipo-cuenta-select" name="tipo_cuenta_id" required>
                                    <option value="">Cargando tipos...</option>
                                </select>
                            </div>

                            <div class="form-group">
                                <label>Depósito Inicial (opcional)</label>
                                <input type="number" class="form-control" name="saldo_inicial" value="0" min="0" step="0.01">
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn" style="background:#eee" onclick="CuentasModule.closeModal()">Cancelar</button>
                        <button type="button" class="btn btn-primary" onclick="CuentasModule.saveCuenta()">Crear Cuenta</button>
                    </div>
                </div>
            </div>
        `;

        await Promise.all([this.loadData(), this.loadTiposCuenta()]);
    },

    loadData: async function() {
        const tbody = document.querySelector('#cuentas-table tbody');
        tbody.innerHTML = `<tr><td colspan="7" class="text-center">Cargando...</td></tr>`;

        try {
            const data = await API.cuentas.getAll();
            this.cuentasData = data;
            
            if (data.length === 0) {
                tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-secondary);">No hay cuentas registradas</td></tr>`;
                return;
            }

            tbody.innerHTML = data.map(cuenta => {
                const estadoBadge = cuenta.activa ? 'badge-success' : 'badge-danger';
                const estadoTexto = cuenta.activa ? 'Activa' : 'Cerrada';
                
                return `
                <tr>
                    <td style="font-family: monospace; font-size: 1.1em">${cuenta.numero_cuenta}</td>
                    <td><div style="font-size: 0.8rem; color: var(--text-secondary)">ID: ${cuenta.cliente_id}</div>${cuenta.cliente_nombre} ${cuenta.cliente_apellido}</td>
                    <td>${cuenta.tipo_cuenta_nombre}</td>
                    <td><span class="badge ${estadoBadge}">${estadoTexto}</span></td>
                    <td>${Utils.formatDate(cuenta.fecha_apertura)}</td>
                    <td style="text-align: right; font-weight: 600; color: ${cuenta.saldo < 0 ? 'var(--danger-color)' : 'var(--primary-color)'}">
                        ${Utils.formatCurrency(cuenta.saldo)}
                    </td>
                    <td>
                        <div class="action-btns" style="justify-content: flex-end">
                            ${cuenta.activa ? `<button class="action-btn delete" onclick="CuentasModule.closeCuenta(${cuenta.id})" title="Cerrar Cuenta"><i class="fa-solid fa-ban"></i></button>` : ''}
                        </div>
                    </td>
                </tr>
            `}).join('');
            
        } catch (error) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--danger-color);">Error al cargar cuentas</td></tr>`;
        }
    },

    loadTiposCuenta: async function() {
        try {
            const select = document.getElementById('tipo-cuenta-select');
            const tipos = await API.tipos.cuenta();
            select.innerHTML = '<option value="">Seleccione un tipo</option>' + tipos.map(t => `<option value="${t.id}">${t.nombre}</option>`).join('');
        } catch (error) {
            console.error('Error cargando tipos de cuenta', error);
        }
    },

    openFormModal: function() {
        const modal = document.getElementById('cuenta-modal');
        const form = document.getElementById('cuenta-form');
        form.reset();
        modal.classList.add('active');
    },

    closeModal: function() {
        document.getElementById('cuenta-modal').classList.remove('active');
    },

    saveCuenta: async function() {
        const form = document.getElementById('cuenta-form');
        if (!form.reportValidity()) return;

        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        data.cliente_id = parseInt(data.cliente_id);
        data.tipo_cuenta_id = parseInt(data.tipo_cuenta_id);

        try {
            const nuevaCuenta = await API.cuentas.create(data);
            
            // Si hay depósito inicial, hacer un movimiento
            const saldoInicial = parseFloat(data.saldo_inicial);
            if (saldoInicial > 0) {
                // Aquí el punto_id idealmente viene de sesión, pero hardcoded a 1 para el dummy
                await API.movimientos.deposito({
                    cuenta_destino_id: nuevaCuenta.id,
                    punto_id: 1, 
                    valor: saldoInicial
                });
            }

            Utils.showToast('Cuenta creada correctamente');
            this.closeModal();
            this.loadData();
        } catch (error) {
            // El error se muestra en utils
        }
    },

    closeCuenta: async function(id) {
        if (!Utils.confirmAction('¿Está seguro de que desea cerrar (desactivar) esta cuenta?')) return;
        
        try {
            await API.cuentas.close(id);
            Utils.showToast('Cuenta cerrada exitosamente');
            this.loadData();
        } catch (error) {
            // Error manejable
        }
    }
};
