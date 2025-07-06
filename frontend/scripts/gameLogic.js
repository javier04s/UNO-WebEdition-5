// Logica principal del juego
function getNextPlayerIndex(currentIndex, direction, numPlayers) {
    const nextIndex = currentIndex + direction;
    if (nextIndex >= numPlayers) {
        return 0;
    }
    if (nextIndex < 0) {
        return numPlayers - 1;
    }
    return nextIndex;
}

function executeCardAction(card) {
    const updates = {};

    switch (card.type) {
        case 'skip':
            const skippedIndex = getNextPlayerIndex(gameState.currentPlayerIndex, gameState.direction, gameState.players.length);
            updates.currentPlayerIndex = getNextPlayerIndex(skippedIndex, gameState.direction, gameState.players.length);
            showNotification(`¡${gameState.players[skippedIndex].name} fue saltado!`, 'info');
            break;

        case 'reverse':
            updates.direction = gameState.direction === 1 ? -1 : 1;
            showNotification('¡Se cambio la direccion del juego!', 'info');
            break;

        case 'draw2':
            updates.drawCount = gameState.drawCount + 2;
            showNotification('¡El siguiente jugador debe robar 2 cartas!', 'warning');
            break;

        case 'wild4':
            updates.drawCount = gameState.drawCount + 4;
            showNotification('¡El siguiente jugador debe robar 4 cartas!', 'warning');
            break;
    }

    return updates;
}

async function playCard(playerIndex, cardIndex, newColor) {
    const player = gameState.players[playerIndex];
    const card = player.cards[cardIndex];

    if (!card) {
        showNotification('Error: Carta no encontrada', 'error');
        return;
    }

    // Validar que es el turno del jugador
    if (playerIndex !== gameState.currentPlayerIndex) {
        showNotification('No es tu turno', 'error');
        return;
    }

    // Validar que no hay cartas pendientes por robar
    if (gameState.drawCount > 0 && card.type !== 'draw2' && card.type !== 'wild4') {
        showNotification('Debes robar las cartas pendientes primero', 'error');
        return;
    }

    try {
        // Enviar jugada al servidor
        await serverComm.playCard(card, newColor);

    } catch (error) {
        console.error('Error jugando carta:', error);
    }
}

async function drawCard(playerIndex) {
    // Validar que es el turno del jugador
    if (playerIndex !== gameState.currentPlayerIndex) {
        showNotification('No es tu turno', 'error');
        return;
    }

    try {
        // Enviar acción de robar al servidor
        await serverComm.drawCard();

    } catch (error) {
        console.error('Error robando carta:', error);
    }
}

async function sayUno(playerIndex) {
    const player = gameState.players[playerIndex];

    // Validar que el jugador tiene exactamente 1 carta
    if (player.cards.length !== 1) {
        showNotification('Solo puedes gritar UNO cuando tienes 1 carta', 'error');
        return;
    }

    // Validar que no ha gritado UNO ya
    if (player.saidUno) {
        showNotification('Ya gritaste UNO', 'error');
        return;
    }

    try {
        // Enviar UNO al servidor
        await serverComm.sayUno();

    } catch (error) {
        console.error('Error diciendo UNO:', error);
    }
}

function getPlayableCards(playerIndex) {
    const player = gameState.players[playerIndex];
    const topCard = gameState.discardPile[gameState.discardPile.length - 1];

    if (!player || !topCard) return [];

    return player.cards.map((card, index) =>
        canPlayCard(card, topCard, gameState.currentColor) ? index : -1
    ).filter(index => index !== -1);
}



// Función para pausar/reanudar el juego
function togglePause() {
    if (gameState.gamePhase === 'playing') {
        gameState.gamePhase = 'paused';
        showNotification('Juego pausado', 'info');
    } else if (gameState.gamePhase === 'paused') {
        gameState.gamePhase = 'playing';
        showNotification('Juego reanudado', 'success');
    }
}

// Función para nueva ronda
async function newRound() {
    try {
        await serverComm.newRound();
        showNotification('Nueva ronda iniciada', 'success');
    } catch (error) {
        console.error('Error iniciando nueva ronda:', error);
        showNotification('Error iniciando nueva ronda', 'error');
    }
}