// Inicializacion y configuracion del juego
function startGame(playerName, numPlayers) {
    const deck = createDeck();
    const { playerHands, remainingDeck } = dealCards(deck, numPlayers);
    
    // Crear jugadores
    gameState.players = [
        {
            id: '1',
            name: playerName,
            avatar: '👤',
            cards: playerHands[0],
            isBot: false,
            saidUno: false
        },
        ...Array.from({ length: numPlayers - 1 }, (_, i) => ({
            id: (i + 2).toString(),
            name: `Bot ${i + 1}`,
            avatar: AVATARS[i % AVATARS.length],
            cards: playerHands[i + 1],
            isBot: true,
            saidUno: false
        }))
    ];
    
    // Primera carta en la pila de descarte
    const firstCard = remainingDeck.pop();
    gameState.deck = remainingDeck;
    gameState.discardPile = [firstCard];
    gameState.currentColor = firstCard.color === 'wild' ? 'red' : null;
    gameState.gamePhase = 'playing';
    gameState.currentPlayerIndex = 0;
    gameState.direction = 1;
    gameState.drawCount = 0;
    
    // Cambiar a pantalla de juego
    welcomeScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');
    
    updateGameDisplay();
    showNotification('¡La partida ha comenzado! Es tu turno.', 'success');
}