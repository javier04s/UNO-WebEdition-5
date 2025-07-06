// Elementos del DOM
const welcomeScreen = document.getElementById('welcome-screen');
const gameScreen = document.getElementById('game-screen');
const victoryScreen = document.getElementById('victory-screen');
const gameSetupForm = document.getElementById('game-setup');
const colorSelector = document.getElementById('color-selector');
const unoButton = document.getElementById('uno-button');
const playAgainButton = document.getElementById('play-again');
const exitGameButton = document.getElementById('exit-game');

// Manejo de eventos
function setupEventListeners() {
    gameSetupForm.addEventListener('submit', handleGameStart);
    document.getElementById('deck').addEventListener('click', handleDeckClick);
    unoButton.addEventListener('click', handleUnoClick);
    playAgainButton.addEventListener('click', handlePlayAgain);
    exitGameButton.addEventListener('click', handleExitGame);

    // Nuevos event listeners
    document.getElementById('pause-button').addEventListener('click', handlePause);
    document.getElementById('restart-button').addEventListener('click', handleRestart);

    // Event listeners para seleccion de color
    document.querySelectorAll('.color-option').forEach(button => {
        button.addEventListener('click', (e) => {
            handleColorSelect(e.target.dataset.color);
        });
    });


}

async function handleGameStart(e) {
    e.preventDefault();
    const playerName = document.getElementById('player-name').value.trim();
    const numPlayers = parseInt(document.getElementById('num-players').value);

    if (!playerName) return;



    try {
        await startGame(playerName, numPlayers);
    } catch (error) {
        console.error('Error iniciando juego:', error);
    }
}

function handleCardClick(cardIndex) {
    if (gameState.currentPlayerIndex !== 0) return; // Solo jugador humano
    if (gameState.gamePhase !== 'playing') return; // Solo durante el juego

    const currentPlayer = gameState.players[0];
    const card = currentPlayer.cards[cardIndex];
    const topCard = gameState.discardPile[gameState.discardPile.length - 1];

    if (!canPlayCard(card, topCard, gameState.currentColor)) {
        showNotification('No puedes jugar esta carta', 'error');
        return;
    }

    if (card.type === 'wild' || card.type === 'wild4') {
        gameState.pendingWildCard = { playerIndex: 0, cardIndex };
        colorSelector.classList.remove('hidden');
    } else {
        playCard(0, cardIndex);
    }
}

function handleColorSelect(color) {
    if (gameState.pendingWildCard) {
        playCard(gameState.pendingWildCard.playerIndex, gameState.pendingWildCard.cardIndex, color);
        gameState.pendingWildCard = null;
    }
    colorSelector.classList.add('hidden');
}

function handleDeckClick() {
    if (gameState.currentPlayerIndex !== 0) return; // Solo jugador humano
    if (gameState.gamePhase !== 'playing') return; // Solo durante el juego

    // Si hay cartas pendientes por robar, forzar el robo
    if (gameState.drawCount > 0) {
        drawCard(0);
        return;
    }

    const playableCards = getPlayableCards(0);
    if (playableCards.length > 0) {
        showNotification('Tienes cartas jugables', 'warning');
        return;
    }

    drawCard(0);
}

function handleUnoClick() {
    if (gameState.currentPlayerIndex === 0 && gameState.gamePhase === 'playing') {
        sayUno(0);
    }
}

function handlePause() {
    togglePause();
    const button = document.getElementById('pause-button');

    if (gameState.gamePhase === 'paused') {
        button.textContent = '▶️ Reanudar';
        button.classList.add('paused');
    } else {
        button.textContent = '⏸️ Pausar';
        button.classList.remove('paused');
    }
}

async function handleRestart() {
    if (confirm('¿Estás seguro de que quieres reiniciar la partida?')) {
        try {
            await restartGame();
        } catch (error) {
            console.error('Error reiniciando partida:', error);
        }
    }
}

async function handleExitGame() {
    try {
        // Volver a la pantalla de bienvenida
        victoryScreen.classList.add('hidden');
        welcomeScreen.classList.remove('hidden');

        // Limpiar el formulario
        document.getElementById('player-name').value = '';
        document.getElementById('num-players').value = '4';

    } catch (error) {
        console.error('Error saliendo del juego:', error);
    }
}

async function handlePlayAgain() {
    try {
        await newRound();
        victoryScreen.classList.add('hidden');
        gameScreen.classList.remove('hidden');
    } catch (error) {
        console.error('Error iniciando nueva ronda:', error);
    }
}



function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// Función para actualizar el tiempo del juego
function updateGameTime() {
    if (gameState.gameStartTime && gameState.gamePhase === 'playing') {
        const currentTime = Date.now();
        const gameTime = Math.floor((currentTime - gameState.gameStartTime) / 1000);
        document.getElementById('game-time').textContent = formatTime(gameTime);
    }
}

// Iniciar actualización del tiempo
setInterval(updateGameTime, 1000);