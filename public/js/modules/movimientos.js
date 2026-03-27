window.MovimientosModule = {
    render: async function(container) {
        container.innerHTML = `
            <div class="flex-between">
                <h1 class="page-title">Transacciones y Movimientos</h1>
                <div class="action-btns">
                    <button class="btn btn-primary" onclick="MovimientosModule.openTransferModal()">
                        <i class="fa-solid fa-money-bill-transfer"></i> Transferencia
                    </button>
                    <button class="btn btn-accent" onclick="MovimientosModule.openDepositModal()">
                        <i class="fa-solid fa-plus"></i> Depósito
                    </button>
                    <button class="btn" onclick="MovimientosModule.openWithdrawalModal()" style="border: 1px solid var(--border-color)">
                        <i class="fa-solid fa-minus"></i> Retiro
                    </button>
                </div>
            </div>

            <!-- Filtros -->
            <div class="card mb-4">
                <form id="filter-form" class="form-row" onsubmit="event.preventDefault(); MovimientosModule.loadData()">
                    <div class="form-group" style="flex: 2">
                        <label>Buscar por Cuenta (ID)</label>
                        <input type="number" class="form-control" id="filter-cuenta" placeholder="Opcional">
                    </div>
                    <div class="form-group">
                        <label>Fecha Inicio</label>
                        <input type="date" class="form-control" id="filter-inicio">
                    </div>
                    <div class="form-group">
                        <label>Fecha Fin</label>
                        <input type="date" class="form-control" id="filter-fin">
                    </div>
                    <div class="form-group" style="display: flex; align-items: flex-end; flex: 0">
                        <button type="submit" class="btn btn-primary" style="height: 42px">Filtrar</button>
                    </div>
                </form>
            </div>

            <div class="card">
                <div class="table-container">
                    <table id="movimientos-table">
                        <thead>
                            <tr>
                                <th>Fecha y Hora</th>
                                <th>Tipo</th>
                                <th>Cta. Origen</th>
                                <th>Cta. Destino</th>
                                <th>Sucursal (Punto)</th>
                                <th style="text-align: right">Monto</th>
                            </tr>
                        </thead>
                        <tbody>
                            <!-- Se cargan vía JS -->
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Modal Transaccion Genérico -->
            <div id="trx-modal" class="modal-overlay">
                <div class="modal">
                    <div class="modal-header">
                        <h3 id="trx-title">Nueva Transacción</h3>
                        <button class="close-modal" onclick="MovimientosModule.closeModal()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form id="trx-form">
                            <input type="hidden" id="trx-type" name="type">
                            <!-- El punto de atencion usado por el cajero/app = 1 por defecto -->
                            <input type="hidden" name="punto_id" value="1">
                            
                            <div class="form-group" id="group-origen">
                                <label>Cuenta Origen (ID de Cuenta)</label>
                                <input type="number" class="form-control" id="cuenta-origen" name="cuenta_origen_id">
                            </div>
                            
                            <div class="form-group" id="group-destino">
                                <label>Cuenta Destino (ID de Cuenta)</label>
                                <input type="number" class="form-control" id="cuenta-destino" name="cuenta_destino_id">
                            </div>

                            <div class="form-group">
                                <label>Monto</label>
                                <div style="position: relative;">
                                    <span style="position: absolute; left: 12px; top: 10px; color: var(--text-secondary)">$</span>
                                    <input type="number" class="form-control" name="valor" required min="1" step="0.01" style="padding-left: 25px;">
                                </div>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn" style="background:#eee" onclick="MovimientosModule.closeModal()">Cancelar</button>
                        <button type="button" class="btn btn-primary" onclick="MovimientosModule.executeTrx()">Confirmar</button>
                    </div>
                </div>
            </div>
        `;

        await this.loadData();
    },

    loadData: async function() {
        const tbody = document.querySelector('#movimientos-table tbody');
        Utils.showLoader(tbody);

        // Capturar filtros
        const cuenta_id = document.getElementById('filter-cuenta')?.value;
        const fecha_inicio = document.getElementById('filter-inicio')?.value;
        const fecha_fin = document.getElementById('filter-fin')?.value;

        const params = {};
        if (cuenta_id) params.cuenta_id = cuenta_id;
        if (fecha_inicio) params.fecha_inicio = fecha_inicio;
        if (fecha_fin) params.fecha_fin = fecha_fin;

        try {
            const data = await API.movimientos.getAll(params);
            
            if (data.length === 0) {
                tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-secondary);">No hay transacciones registradas</td></tr>`;
                return;
            }

            tbody.innerHTML = data.map(trx => {
                const tipoBadge = trx.tipo_movimiento_id === 1 ? 'badge-success' : 
                                 (trx.tipo_movimiento_id === 2 ? 'badge-danger' : 'badge-info');
                return `
                <tr>
                    <td>${Utils.formatDate(trx.fecha, true)}</td>
                    <td><span class="badge ${tipoBadge}">${trx.tipo_movimiento_nombre}</span></td>
                    <td style="font-family: monospace;">${trx.cuenta_origen_id || '-'}</td>
                    <td style="font-family: monospace;">${trx.cuenta_destino_id || '-'}</td>
                    <td>ID: ${trx.punto_id}</td>
                    <td style="text-align: right; font-weight: 600; color: ${trx.tipo_movimiento_id === 2 ? 'var(--danger-color)' : 'var(--primary-color)'}">
                        ${Utils.formatCurrency(trx.valor)}
                    </td>
                </tr>
            `}).join('');
            
        } catch (error) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--danger-color);">Error al cargar historial</td></tr>`;
        }
    },

    openModal: function(title, type) {
        const modal = document.getElementById('trx-modal');
        const form = document.getElementById('trx-form');
        form.reset();
        
        document.getElementById('trx-title').textContent = title;
        document.getElementById('trx-type').value = type;
        
        const groupOrigen = document.getElementById('group-origen');
        const inputOrigen = document.getElementById('cuenta-origen');
        const groupDestino = document.getElementById('group-destino');
        const inputDestino = document.getElementById('cuenta-destino');

        // Reset display and required
        groupOrigen.style.display = 'block';
        groupDestino.style.display = 'block';
        inputOrigen.required = true;
        inputDestino.required = true;

        if (type === 'deposito') {
            groupOrigen.style.display = 'none';
            inputOrigen.required = false;
        } else if (type === 'retiro') {
            groupDestino.style.display = 'none';
            inputDestino.required = false;
        }

        modal.classList.add('active');
    },

    openDepositModal: function() { this.openModal('Realizar Depósito', 'deposito'); },
    openWithdrawalModal: function() { this.openModal('Realizar Retiro', 'retiro'); },
    openTransferModal: function() { this.openModal('Transferencia de Fondos', 'transferencia'); },

    closeModal: function() {
        document.getElementById('trx-modal').classList.remove('active');
    },

    executeTrx: async function() {
        const form = document.getElementById('trx-form');
        if (!form.reportValidity()) return;

        const type = document.getElementById('trx-type').value;
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        data.valor = parseFloat(data.valor);
        data.punto_id = parseInt(data.punto_id);

        try {
            if (type === 'deposito') {
                data.cuenta_destino_id = parseInt(data.cuenta_destino_id);
                await API.movimientos.deposito(data);
            } else if (type === 'retiro') {
                data.cuenta_origen_id = parseInt(data.cuenta_origen_id);
                await API.movimientos.retiro(data);
            } else if (type === 'transferencia') {
                data.cuenta_origen_id = parseInt(data.cuenta_origen_id);
                data.cuenta_destino_id = parseInt(data.cuenta_destino_id);
                await API.movimientos.transferencia(data);
            }

            Utils.showToast(`${type.charAt(0).toUpperCase() + type.slice(1)} exitoso`);
            this.closeModal();
            this.loadData();
        } catch (error) {
            // Error handling provided by API.js
        }
    }
};
