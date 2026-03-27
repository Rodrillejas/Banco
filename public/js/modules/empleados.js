window.EmpleadosModule = {
    render: async function(container) {
        container.innerHTML = `
            <div class="flex-between">
                <h1 class="page-title">Gestión de Empleados</h1>
                <button class="btn btn-primary" onclick="EmpleadosModule.openFormModal()">
                    <i class="fa-solid fa-plus"></i> Nuevo Empleado
                </button>
            </div>

            <div class="card">
                <div class="table-container">
                    <table id="empleados-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Documento</th>
                                <th>Nombre Completo</th>
                                <th>Sede Asignada</th>
                                <th>Estado</th>
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
            <div id="empleado-modal" class="modal-overlay">
                <div class="modal">
                    <div class="modal-header">
                        <h3 id="empleado-modal-title">Nuevo Empleado</h3>
                        <button class="close-modal" onclick="EmpleadosModule.closeModal()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form id="empleado-form">
                            <input type="hidden" id="empleado-id" name="id">
                            
                            <div class="form-row">
                                <div class="form-group">
                                    <label>Tipo Documento</label>
                                    <select class="form-control" id="emp-tipo-doc" name="tipo_documento" required>
                                        <option value="CC">CC</option>
                                        <option value="CE">CE</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label>Número Documento</label>
                                    <input type="text" class="form-control" id="emp-num-doc" name="numero_documento" required>
                                </div>
                            </div>

                            <div class="form-row">
                                <div class="form-group">
                                    <label>Nombre</label>
                                    <input type="text" class="form-control" id="emp-nombre" name="nombre" required>
                                </div>
                                <div class="form-group">
                                    <label>Apellido</label>
                                    <input type="text" class="form-control" id="emp-apellido" name="apellido" required>
                                </div>
                            </div>

                            <div class="form-group">
                                <label>Sede Asignada</label>
                                <select class="form-control" id="emp-sede" name="sede_id" required>
                                    <option value="">Cargando sedes...</option>
                                </select>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn" style="background:#eee" onclick="EmpleadosModule.closeModal()">Cancelar</button>
                        <button type="button" class="btn btn-primary" onclick="EmpleadosModule.saveEmpleado()">Guardar</button>
                    </div>
                </div>
            </div>
        `;

        await Promise.all([this.loadData(), this.loadSedes()]);
    },

    loadData: async function() {
        const tbody = document.querySelector('#empleados-table tbody');
        Utils.showLoader(tbody);

        try {
            const data = await API.empleados.getAll();
            this.empleadosData = data;
            
            if (data.length === 0) {
                tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-secondary);">No hay empleados registrados</td></tr>`;
                return;
            }

            tbody.innerHTML = data.map(emp => `
                <tr>
                    <td>${emp.id}</td>
                    <td>${emp.tipo_documento} ${emp.numero_documento}</td>
                    <td style="font-weight: 500">${emp.nombre} ${emp.apellido}</td>
                    <td>${emp.sede_nombre}</td>
                    <td><span class="badge badge-success">Activo</span></td>
                    <td>
                        <div class="action-btns" style="justify-content: flex-end">
                            <button class="action-btn edit" onclick="EmpleadosModule.openFormModal(${emp.id})" title="Editar"><i class="fa-solid fa-pen"></i></button>
                            <button class="action-btn delete" onclick="EmpleadosModule.deleteEmpleado(${emp.id})" title="Dar de baja"><i class="fa-solid fa-trash"></i></button>
                        </div>
                    </td>
                </tr>
            `).join('');
            
        } catch (error) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--danger-color);">Error al cargar empleados</td></tr>`;
        }
    },

    loadSedes: async function() {
        try {
            const sedes = await API.sedes.getAll();
            const select = document.getElementById('emp-sede');
            select.innerHTML = '<option value="">Seleccione una sede</option>' + 
                              sedes.map(s => `<option value="${s.id}">${s.nombre}</option>`).join('');
        } catch (error) {
            console.error('Error al cargar sedes', error);
        }
    },

    openFormModal: function(id = null) {
        const modal = document.getElementById('empleado-modal');
        const form = document.getElementById('empleado-form');
        const title = document.getElementById('empleado-modal-title');
        
        form.reset();
        document.getElementById('empleado-id').value = '';

        if (id) {
            // Edit mode
            title.textContent = 'Editar Empleado';
            const emp = this.empleadosData.find(e => e.id === id);
            if (emp) {
                document.getElementById('empleado-id').value = emp.id;
                document.getElementById('emp-tipo-doc').value = emp.tipo_documento;
                document.getElementById('emp-num-doc').value = emp.numero_documento;
                document.getElementById('emp-nombre').value = emp.nombre;
                document.getElementById('emp-apellido').value = emp.apellido;
                document.getElementById('emp-sede').value = emp.sede_id;
            }
        } else {
            // Create mode
            title.textContent = 'Nuevo Empleado';
        }

        modal.classList.add('active');
    },

    closeModal: function() {
        document.getElementById('empleado-modal').classList.remove('active');
    },

    saveEmpleado: async function() {
        const form = document.getElementById('empleado-form');
        if (!form.reportValidity()) return;

        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        const id = data.id;
        delete data.id; 

        data.sede_id = parseInt(data.sede_id);

        try {
            if (id) {
                await API.empleados.update(id, data);
                Utils.showToast('Empleado actualizado');
            } else {
                await API.empleados.create(data);
                Utils.showToast('Empleado creado con éxito');
            }
            this.closeModal();
            this.loadData();
        } catch (error) {
            // Error handling in api.js
        }
    },

    deleteEmpleado: async function(id) {
        if (!Utils.confirmAction('¿Está seguro de dar de baja a este empleado?')) return;
        
        try {
            await API.empleados.delete(id);
            Utils.showToast('Empleado dado de baja');
            this.loadData();
        } catch (error) {}
    }
};
