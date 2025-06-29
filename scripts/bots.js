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
        // Priorizar cartas de accion
        const actionCard = playableCards.find(({ card }) => 
            ['skip', 'reverse', 'draw2', 'wild', 'wild4'].includes(card.type)
        );
        const selectedCard = actionCard || playableCards[0];
        
        let newColor;
        if (selectedCard.card.type === 'wild' || selectedCard.card.type === 'wild4') {
            // Elegir color mas comun en la mano
            const colorCounts = { red: 0, yellow: 0, green: 0, blue: 0 };
            player.cards.forEach(card => {
                if (card.color !== 'wild') {
                    colorCounts[card.color]++;
                }
            });
            newColor = Object.entries(colorCounts)
                .reduce((a, b) => colorCounts[a[0]] > colorCounts[b[0]] ? a : b)[0];
        }
        
        return { action: 'play', cardIndex: selectedCard.index, newColor };
    }
    
    return { action: 'draw' };
}

function executeBotTurn() {
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (!currentPlayer.isBot) return;
    
    const topCard = gameState.discardPile[gameState.discardPile.length - 1];
    const action = getBotAction(currentPlayer, topCard, gameState.currentColor);
    
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
}