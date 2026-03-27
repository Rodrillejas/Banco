window.TurnosModule = {
    render: async function(container) {
        container.innerHTML = `
            <div class="flex-between">
                <h1 class="page-title">Gestión de Turnos</h1>
            </div>

            <div class="card">
                <div class="table-container">
                    <table id="turnos-table">
                        <thead>
                            <tr>
                                <th>Fecha</th>
                                <th>Empleado</th>
                                <th>Hora Inicio</th>
                                <th>Hora Fin</th>
                            </tr>
                        </thead>
                        <tbody>
                            <!-- Se cargan vía JS -->
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        await this.loadData();
    },

    loadData: async function() {
        const tbody = document.querySelector('#turnos-table tbody');
        Utils.showLoader(tbody);

        try {
            const data = await API.request('/turnos');
            
            if (data.length === 0) {
                tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-secondary);">No hay turnos registrados</td></tr>`;
                return;
            }

            tbody.innerHTML = data.map(turno => `
                <tr>
                    <td>${Utils.formatDate(turno.fecha)}</td>
                    <td style="font-weight: 500">${turno.empleado_nombre} ${turno.empleado_apellido}</td>
                    <td><span class="badge badge-info">${turno.hora_inicio}</span></td>
                    <td><span class="badge badge-warning">${turno.hora_fin}</span></td>
                </tr>
            `).join('');
            
        } catch (error) {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--danger-color);">Error al cargar turnos</td></tr>`;
        }
    }
};

window.PuntosModule = {
    render: async function(container) {
        container.innerHTML = `
            <div class="flex-between">
                <h1 class="page-title">Puntos de Atención</h1>
            </div>

            <div class="card">
                <div class="table-container">
                    <table id="puntos-table">
                        <thead>
                            <tr>
                                <th>Código</th>
                                <th>Sede</th>
                                <th>Tipo de Punto</th>
                                <th>Estado</th>
                            </tr>
                        </thead>
                        <tbody>
                            <!-- Se cargan vía JS -->
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        await this.loadData();
    },

    loadData: async function() {
        const tbody = document.querySelector('#puntos-table tbody');
        Utils.showLoader(tbody);

        try {
            const data = await API.request('/puntos-atencion');
            
            if (data.length === 0) {
                tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-secondary);">No hay puntos de atención registrados</td></tr>`;
                return;
            }

            tbody.innerHTML = data.map(punto => `
                <tr>
                    <td style="font-family: monospace; font-size: 1.1em; font-weight: bold">${punto.codigo}</td>
                    <td>${punto.sede_nombre}</td>
                    <td>${punto.tipo_nombre}</td>
                    <td><span class="badge badge-success">Activo</span></td>
                </tr>
            `).join('');
            
        } catch (error) {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--danger-color);">Error al cargar puntos de atención</td></tr>`;
        }
    }
};
