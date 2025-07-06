function getBotAction(player, topCard, currentColor) {
    // Si hay cartas pendientes por robar, el bot debe robar
    if (gameState.drawCount > 0) {
        return { action: 'draw' };
    }

    // Verificar si el bot puede decir UNO
    if (player.cards.length === 2 && !player.saidUno) {
        return { action: 'uno' };
    }

    // Encontrar cartas jugables
    const playableCards = player.cards.map((card, index) => ({ card, index }))
        .filter(({ card }) => canPlayCard(card, topCard, currentColor));

    if (playableCards.length > 0) {
        const selectedCard = selectBestCard(playableCards, player, topCard);

        let newColor;
        if (selectedCard.card.type === 'wild' || selectedCard.card.type === 'wild4') {
            newColor = selectBestColor(player);
        }

        return { action: 'play', cardIndex: selectedCard.index, newColor };
    }

    return { action: 'draw' };
}

function selectBestCard(playableCards, player, topCard) {
    // Priorizar cartas de acción cuando quedan pocas cartas
    if (player.cards.length <= 3) {
        const actionCard = playableCards.find(({ card }) =>
            ['skip', 'reverse', 'draw2', 'wild', 'wild4'].includes(card.type)
        );
        if (actionCard) return actionCard;
    }

    // Priorizar cartas que cambian el color si el jugador tiene muchas cartas del mismo color
    const colorCounts = getColorCounts(player.cards);
    const dominantColor = Object.entries(colorCounts)
        .reduce((a, b) => colorCounts[a[0]] > colorCounts[b[0]] ? a : b)[0];

    const colorCard = playableCards.find(({ card }) =>
        card.color === dominantColor && card.type === 'number'
    );
    if (colorCard) return colorCard;

    // Priorizar cartas de acción para interrumpir el flujo del juego
    const actionCard = playableCards.find(({ card }) =>
        ['skip', 'reverse', 'draw2'].includes(card.type)
    );
    if (actionCard) return actionCard;

    return playableCards[0];
}

function selectBestColor(player) {
    const colorCounts = getColorCounts(player.cards);

    // Seleccionar el color más común en la mano
    return Object.entries(colorCounts)
        .reduce((a, b) => colorCounts[a[0]] > colorCounts[b[0]] ? a : b)[0];
}

function getColorCounts(cards) {
    const colorCounts = { red: 0, yellow: 0, green: 0, blue: 0 };
    cards.forEach(card => {
        if (card.color !== 'wild') {
            colorCounts[card.color]++;
        }
    });
    return colorCounts;
}

function executeBotTurn() {
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (!currentPlayer.isBot || gameState.gamePhase !== 'playing') return;

    const topCard = gameState.discardPile[gameState.discardPile.length - 1];
    const action = getBotAction(currentPlayer, topCard, gameState.currentColor);

    // Simular pensamiento del bot
    const thinkingTime = Math.random() * 2000 + 1000; // Entre 1-3 segundos

    setTimeout(() => {
        if (gameState.gamePhase !== 'playing') return; // Verificar que el juego sigue activo

        switch (action.action) {
            case 'play':
                if (action.cardIndex !== undefined) {
                    playCard(gameState.currentPlayerIndex, action.cardIndex, action.newColor);
                }
                break;
            case 'draw':
                drawCard(gameState.currentPlayerIndex);
                break;
            case 'uno':
                sayUno(gameState.currentPlayerIndex);
                setTimeout(executeBotTurn, 500);
                break;
        }
    }, thinkingTime);
}