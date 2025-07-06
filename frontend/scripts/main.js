// Archivo principal - inicializacion
document.addEventListener('DOMContentLoaded', async () => {
    // Inicializar comunicación con el servidor
    serverComm.initWebSocket();

    // Verificar conexión con el servidor
    const isConnected = await serverComm.checkServerConnection();
    if (!isConnected) {
        showNotification('No se puede conectar con el servidor. Asegúrate de que esté ejecutándose en el puerto 3001.', 'error');
    }

    setupEventListeners();
});