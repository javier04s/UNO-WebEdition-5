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

function playCard(playerIndex, cardIndex, newColor) {
    const player = gameState.players[playerIndex];
    const card = player.cards[cardIndex];
    
    if (!card) return;
    
    // Remover carta de la mano del jugador
    player.cards.splice(cardIndex, 1);
    
    // Resetear UNO si quedan mas de 1 carta
    if (player.cards.length !== 1) {
        player.saidUno = false;
    }
    
    // Agregar carta a la pila de descarte
    gameState.discardPile.push(card);
    
    // Ejecutar accion de la carta
    const actionUpdates = executeCardAction(card);
    Object.assign(gameState, actionUpdates);
    
    // Determinar nuevo color
    if (card.type === 'wild' || card.type === 'wild4') {
        gameState.currentColor = newColor || null;
    } else if (card.color !== 'wild') {
        gameState.currentColor = null;
    }
    
    // Verificar ganador
    if (player.cards.length === 0) {
        gameState.winner = player;
        gameState.gamePhase = 'finished';
        showVictoryScreen();
        return;
    }
    
    // Mover al siguiente jugador si no se especifico en la accion
    if (!actionUpdates.currentPlayerIndex) {
        gameState.currentPlayerIndex = getNextPlayerIndex(
            gameState.currentPlayerIndex, 
            gameState.direction, 
            gameState.players.length
        );
    }
    
    updateGameDisplay();
    
    // Ejecutar turno del bot despues de un delay
    if (gameState.players[gameState.currentPlayerIndex].isBot) {
        setTimeout(executeBotTurn, 5000);
    }
}

function drawCard(playerIndex) {
    let { deck } = gameState;
    
    // Barajar si el mazo esta vacio
    if (deck.length === 0) {
        deck = reshuffleDeck(gameState.discardPile);
        gameState.deck = deck;
        showNotification('Se barajeo el mazo', 'info');
    }
    
    const drawAmount = Math.max(1, gameState.drawCount);
    const { drawnCards, remainingDeck } = drawCards(deck, drawAmount);
    
    gameState.players[playerIndex].cards.push(...drawnCards);
    gameState.deck = remainingDeck;
    
    // Mostrar notificacion de cartas robadas
    if (drawAmount > 1) {
        showNotification(`${gameState.players[playerIndex].name} robo ${drawAmount} cartas`, 'warning');
    } else {
        showNotification(`${gameState.players[playerIndex].name} robo 1 carta`, 'info');
    }
    
    // Resetear contador de cartas por robar
    gameState.drawCount = 0;
    
    // Mover al siguiente jugador
    gameState.currentPlayerIndex = getNextPlayerIndex(
        gameState.currentPlayerIndex, 
        gameState.direction, 
        gameState.players.length
    );
    
    updateGameDisplay();
    
    // Ejecutar turno del bot despues de un delay
    if (gameState.players[gameState.currentPlayerIndex].isBot) {
        setTimeout(executeBotTurn, 5000);
    }
}

function sayUno(playerIndex) {
    gameState.players[playerIndex].saidUno = true;
    showNotification(`¡${gameState.players[playerIndex].name} grito UNO!`, 'success');
    updateGameDisplay();
}

function getPlayableCards(playerIndex) {
    const player = gameState.players[playerIndex];
    const topCard = gameState.discardPile[gameState.discardPile.length - 1];
    
    if (!player || !topCard) return [];
    
    return player.cards.map((card, index) => 
        canPlayCard(card, topCard, gameState.currentColor) ? index : -1
    ).filter(index => index !== -1);
}