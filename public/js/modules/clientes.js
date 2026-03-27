window.ClientesModule = {
    render: async function(container) {
        container.innerHTML = `
            <div class="flex-between">
                <h1 class="page-title">Gestión de Clientes</h1>
                <button class="btn btn-primary" onclick="ClientesModule.openFormModal()">
                    <i class="fa-solid fa-plus"></i> Nuevo Cliente
                </button>
            </div>

            <div class="card">
                <div class="table-container">
                    <table id="clientes-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Documento</th>
                                <th>Nombre</th>
                                <th>Email</th>
                                <th>Teléfono</th>
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
            <div id="cliente-modal" class="modal-overlay">
                <div class="modal">
                    <div class="modal-header">
                        <h3 id="modal-title">Nuevo Cliente</h3>
                        <button class="close-modal" onclick="ClientesModule.closeModal()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form id="cliente-form">
                            <input type="hidden" id="cliente-id" name="id">
                            
                            <div class="form-row">
                                <div class="form-group">
                                    <label>Tipo Documento</label>
                                    <select class="form-control" id="tipo-doc" name="tipo_documento" required>
                                        <option value="CC">CC</option>
                                        <option value="CE">CE</option>
                                        <option value="NIT">NIT</option>
                                        <option value="Pasaporte">Pasaporte</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label>Número Documento</label>
                                    <input type="text" class="form-control" id="num-doc" name="numero_documento" required>
                                </div>
                            </div>

                            <div class="form-row">
                                <div class="form-group">
                                    <label>Nombre</label>
                                    <input type="text" class="form-control" id="nombre" name="nombre" required>
                                </div>
                                <div class="form-group">
                                    <label>Apellido</label>
                                    <input type="text" class="form-control" id="apellido" name="apellido" required>
                                </div>
                            </div>
                            
                            <div class="form-group">
                                <label>Fecha de Nacimiento</label>
                                <input type="date" class="form-control" id="fecha-nac" name="fecha_nacimiento">
                            </div>

                            <div class="form-row">
                                <div class="form-group">
                                    <label>Email</label>
                                    <input type="email" class="form-control" id="email" name="email">
                                </div>
                                <div class="form-group">
                                    <label>Teléfono</label>
                                    <input type="text" class="form-control" id="telefono" name="telefono">
                                </div>
                            </div>

                            <div class="form-group">
                                <label>Dirección</label>
                                <input type="text" class="form-control" id="direccion" name="direccion">
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn" style="background:#eee" onclick="ClientesModule.closeModal()">Cancelar</button>
                        <button type="button" class="btn btn-primary" onclick="ClientesModule.saveCliente()">Guardar</button>
                    </div>
                </div>
            </div>
        `;

        await this.loadData();
    },

    loadData: async function() {
        const tbody = document.querySelector('#clientes-table tbody');
        tbody.innerHTML = `<tr><td colspan="6" class="text-center">Cargando...</td></tr>`;

        try {
            const data = await API.clientes.getAll();
            this.clientesData = data;
            
            if (data.length === 0) {
                tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-secondary);">No hay clientes registrados</td></tr>`;
                return;
            }

            tbody.innerHTML = data.map(cliente => `
                <tr>
                    <td>${cliente.id}</td>
                    <td>${cliente.tipo_documento} ${cliente.numero_documento}</td>
                    <td style="font-weight: 500">${cliente.nombre} ${cliente.apellido}</td>
                    <td>${cliente.email || '-'}</td>
                    <td>${cliente.telefono || '-'}</td>
                    <td>
                        <div class="action-btns" style="justify-content: flex-end">
                            <button class="action-btn edit" onclick="ClientesModule.openFormModal(${cliente.id})" title="Editar"><i class="fa-solid fa-pen"></i></button>
                            <button class="action-btn delete" onclick="ClientesModule.deleteCliente(${cliente.id})" title="Eliminar"><i class="fa-solid fa-trash"></i></button>
                        </div>
                    </td>
                </tr>
            `).join('');
            
        } catch (error) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--danger-color);">Error al cargar clientes</td></tr>`;
        }
    },

    openFormModal: function(id = null) {
        const modal = document.getElementById('cliente-modal');
        const form = document.getElementById('cliente-form');
        const title = document.getElementById('modal-title');
        
        form.reset();
        document.getElementById('cliente-id').value = '';

        if (id) {
            // Edit mode
            title.textContent = 'Editar Cliente';
            const cliente = this.clientesData.find(c => c.id === id);
            if (cliente) {
                document.getElementById('cliente-id').value = cliente.id;
                document.getElementById('tipo-doc').value = cliente.tipo_documento;
                document.getElementById('num-doc').value = cliente.numero_documento;
                document.getElementById('nombre').value = cliente.nombre;
                document.getElementById('apellido').value = cliente.apellido;
                document.getElementById('fecha-nac').value = cliente.fecha_nacimiento ? cliente.fecha_nacimiento.substring(0, 10) : '';
                document.getElementById('email').value = cliente.email || '';
                document.getElementById('telefono').value = cliente.telefono || '';
                document.getElementById('direccion').value = cliente.direccion || '';
            }
        } else {
            // Create mode
            title.textContent = 'Nuevo Cliente';
        }

        modal.classList.add('active');
    },

    closeModal: function() {
        document.getElementById('cliente-modal').classList.remove('active');
    },

    saveCliente: async function() {
        const form = document.getElementById('cliente-form');
        if (!form.reportValidity()) return;

        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        const id = data.id;
        delete data.id; // API doesn't need this in body

        try {
            if (id) {
                await API.clientes.update(id, data);
                Utils.showToast('Cliente actualizado correctamente');
            } else {
                await API.clientes.create(data);
                Utils.showToast('Cliente creado correctamente');
            }
            this.closeModal();
            this.loadData();
        } catch (error) {
            // Error handling is in api.js
        }
    },

    deleteCliente: async function(id) {
        if (!Utils.confirmAction('¿Está seguro de que desea eliminar este cliente? Esta acción lo desactivará en el sistema.')) return;
        
        try {
            await API.clientes.delete(id);
            Utils.showToast('Cliente desactivado');
            this.loadData();
        } catch (error) {
            // Error manejado en api.js
        }
    }
};
