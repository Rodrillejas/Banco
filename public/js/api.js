const API_URL = '/api';

const API = {
    // Helper principal para peticiones
    async request(endpoint, options = {}) {
        try {
            const defaultOptions = {
                headers: {
                    'Content-Type': 'application/json'
                }
            };
            
            const fetchOptions = { ...defaultOptions, ...options };
            
            // Si el body es un objeto, lo convertimos a string
            if (fetchOptions.body && typeof fetchOptions.body === 'object') {
                fetchOptions.body = JSON.stringify(fetchOptions.body);
            }

            const response = await fetch(`${API_URL}${endpoint}`, fetchOptions);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Error en la petición');
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            Utils.showToast(error.message, 'error');
            throw error;
        }
    },

    // Endpoints específicos (getters simples)
    dashboard: {
        getStats: () => API.request('/dashboard/stats'),
        getActivity: () => API.request('/dashboard/activity')
    },
    
    clientes: {
        getAll: () => API.request('/clientes'),
        getById: (id) => API.request(`/clientes/${id}`),
        create: (data) => API.request('/clientes', { method: 'POST', body: data }),
        update: (id, data) => API.request(`/clientes/${id}`, { method: 'PUT', body: data }),
        delete: (id) => API.request(`/clientes/${id}`, { method: 'DELETE' })
    },

    cuentas: {
        getAll: (clienteId) => API.request(`/cuentas${clienteId ? `?cliente_id=${clienteId}` : ''}`),
        create: (data) => API.request('/cuentas', { method: 'POST', body: data }),
        close: (id) => API.request(`/cuentas/${id}/close`, { method: 'PUT' })
    },

    movimientos: {
        getAll: (params) => {
            const qs = new URLSearchParams(params).toString();
            return API.request(`/movimientos?${qs}`);
        },
        deposito: (data) => API.request('/movimientos/deposito', { method: 'POST', body: data }),
        retiro: (data) => API.request('/movimientos/retiro', { method: 'POST', body: data }),
        transferencia: (data) => API.request('/movimientos/transferencia', { method: 'POST', body: data })
    },

    empleados: {
        getAll: () => API.request('/empleados'),
        create: (data) => API.request('/empleados', { method: 'POST', body: data }),
        update: (id, data) => API.request(`/empleados/${id}`, { method: 'PUT', body: data }),
        delete: (id) => API.request(`/empleados/${id}`, { method: 'DELETE' })
    },

    sedes: {
        getAll: () => API.request('/sedes'),
        create: (data) => API.request('/sedes', { method: 'POST', body: data }),
        update: (id, data) => API.request(`/sedes/${id}`, { method: 'PUT', body: data }),
        delete: (id) => API.request(`/sedes/${id}`, { method: 'DELETE' })
    },

    tipos: {
        cuenta: () => API.request('/tipos/cuenta'),
        movimiento: () => API.request('/tipos/movimiento'),
        puntoAtencion: () => API.request('/tipos/punto-atencion')
    },
    
    ubicaciones: {
        departamentos: () => API.request('/ubicaciones/departamentos'),
        municipios: (deptId) => API.request(`/ubicaciones/municipios?departamento_id=${deptId}`),
        comunas: (muniId) => API.request(`/ubicaciones/comunas?municipio_id=${muniId}`),
        barrios: (comunaId) => API.request(`/ubicaciones/barrios?comuna_id=${comunaId}`)
    }
};
