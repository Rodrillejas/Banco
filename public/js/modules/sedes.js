window.SedesModule = {
    render: async function(container) {
        container.innerHTML = `
            <div class="flex-between">
                <h1 class="page-title">Sucursales (Sedes)</h1>
            </div>

            <div class="card">
                <div class="table-container">
                    <table id="sedes-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Nombre</th>
                                <th>Dirección</th>
                                <th>Teléfono</th>
                                <th>Barrio</th>
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
        const tbody = document.querySelector('#sedes-table tbody');
        Utils.showLoader(tbody);

        try {
            const data = await API.sedes.getAll();
            
            if (data.length === 0) {
                tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-secondary);">No hay sucursales registradas</td></tr>`;
                return;
            }

            tbody.innerHTML = data.map(sede => `
                <tr>
                    <td>${sede.id}</td>
                    <td style="font-weight: 500">${sede.nombre}</td>
                    <td>${sede.direccion}</td>
                    <td>${sede.telefono || '-'}</td>
                    <td>${sede.barrio_nombre}</td>
                </tr>
            `).join('');
            
        } catch (error) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--danger-color);">Error al cargar sedes</td></tr>`;
        }
    }
};
