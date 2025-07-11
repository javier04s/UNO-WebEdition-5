// Inicializacion y configuracion del juego
async function startGame(playerName, numPlayers) {
    try {
        // Iniciar partida en el servidor
        const serverGameState = await serverComm.startGame(playerName, numPlayers);

        // Cambiar a pantalla de juego
        welcomeScreen.classList.add('hidden');
        gameScreen.classList.remove('hidden');

        showNotification('¡La partida ha comenzado! Es tu turno.', 'success');

    } catch (error) {
        console.error('Error iniciando partida:', error);
        showNotification('Error iniciando la partida. Verifica que el servidor esté ejecutándose.', 'error');
    }
}

// Función para reiniciar el juego
async function restartGame() {
    try {
        await serverComm.restartGame();
        showNotification('Partida reiniciada', 'success');
    } catch (error) {
        console.error('Error reiniciando partida:', error);
        showNotification('Error reiniciando la partida', 'error');
    }
}