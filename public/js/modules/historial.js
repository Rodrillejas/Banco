// Reuse the logic from movimientos but just display
window.HistorialModule = {
    render: async function(container) {
        // Redirigir a movimientos ya que ahí se consolidó el historial
        window.appRouter?.navigate('movimientos');
    }
};
