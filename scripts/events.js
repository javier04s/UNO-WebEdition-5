// Elementos del DOM
const welcomeScreen = document.getElementById('welcome-screen');
const gameScreen = document.getElementById('game-screen');
const victoryScreen = document.getElementById('victory-screen');
const gameSetupForm = document.getElementById('game-setup');
const colorSelector = document.getElementById('color-selector');
const unoButton = document.getElementById('uno-button');
const playAgainButton = document.getElementById('play-again');

// Manejo de eventos
function setupEventListeners() {
    gameSetupForm.addEventListener('submit', handleGameStart);
    document.getElementById('deck').addEventListener('click', handleDeckClick);
    unoButton.addEventListener('click', handleUnoClick);
    playAgainButton.addEventListener('click', () => location.reload());
    
    // Event listeners para seleccion de color
    document.querySelectorAll('.color-option').forEach(button => {
        button.addEventListener('click', (e) => {
            handleColorSelect(e.target.dataset.color);
        });
    });
}

function handleGameStart(e) {
    e.preventDefault();
    const playerName = document.getElementById('player-name').value.trim();
    const numPlayers = parseInt(document.getElementById('num-players').value);
    
    if (!playerName) return;
    
    startGame(playerName, numPlayers);
}

function handleCardClick(cardIndex) {
    if (gameState.currentPlayerIndex !== 0) return; // Solo jugador humano
    
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
    if (gameState.currentPlayerIndex === 0) {
        sayUno(0);
    }
}