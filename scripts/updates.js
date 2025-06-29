// Funciones de interfaz
function updateGameDisplay() {
    updateHeader();
    updateOtherPlayers();
    updateGameBoard();
    updatePlayerHand();
    updateUnoButton();
}

function updateHeader() {
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    document.getElementById('current-player').textContent = currentPlayer.name;
    document.getElementById('direction').textContent = gameState.direction === 1 ? '→' : '←';
}

function updateOtherPlayers() {
    const container = document.getElementById('other-players');
    container.innerHTML = '';
    
    gameState.players.filter(p => p.isBot).forEach(player => {
        const playerIndex = gameState.players.indexOf(player);
        const isCurrentPlayer = playerIndex === gameState.currentPlayerIndex;
        
        const playerDiv = document.createElement('div');
        playerDiv.className = `bot-player ${isCurrentPlayer ? 'current' : ''}`;
        
        playerDiv.innerHTML = `
            <div class="bot-info">
                <span class="bot-icon">${player.avatar}</span>
                <span class="bot-name">${player.name}</span>
                <span class="card-count">${player.cards.length} cartas</span>
                ${player.saidUno ? '<span class="uno-indicator">UNO!</span>' : ''}
            </div>
            <div class="bot-cards">
                ${Array.from({ length: player.cards.length }).map(() => 
                    '<div class="card-back"></div>'
                ).join('')}
            </div>
        `;
        
        container.appendChild(playerDiv);
    });
}

function updateGameBoard() {
    // Actualizar contador del mazo
    document.getElementById('deck-count').textContent = gameState.deck.length;
    
    // Actualizar mazo (puede robar o no)
    const deck = document.getElementById('deck');
    const playableCards = getPlayableCards(0);
    const canDraw = gameState.currentPlayerIndex === 0 && (playableCards.length === 0 || gameState.drawCount > 0);
    
    deck.className = `deck ${canDraw ? 'can-draw' : ''}`;
    
    // Actualizar pila de descarte
    const discardPile = document.getElementById('discard-pile');
    const topCard = gameState.discardPile[gameState.discardPile.length - 1];
    
    if (topCard) {
        discardPile.innerHTML = createCardHTML(topCard, 'large');
    }
    
    // Actualizar indicador de color
    const colorIndicator = document.getElementById('color-indicator');
    const currentColorText = document.getElementById('current-color-text');
    
    if (gameState.currentColor && gameState.currentColor !== topCard.color) {
        colorIndicator.className = `color-indicator ${gameState.currentColor}`;
        colorIndicator.classList.remove('hidden');
        
        const colorNames = {
            red: 'Rojo',
            yellow: 'Amarillo',
            green: 'Verde',
            blue: 'Azul'
        };
        currentColorText.textContent = `Color: ${colorNames[gameState.currentColor]}`;
        currentColorText.className = `current-color ${gameState.currentColor}`;
    } else {
        colorIndicator.classList.add('hidden');
        currentColorText.textContent = '';
    }
}

function updatePlayerHand() {
    const humanPlayer = gameState.players[0];
    const isCurrentPlayer = gameState.currentPlayerIndex === 0;
    const playableCards = getPlayableCards(0);
    
    // Actualizar informacion del jugador
    document.getElementById('player-name-display').textContent = humanPlayer.name;
    document.getElementById('player-card-count').textContent = `${humanPlayer.cards.length} cartas`;
    
    // Actualizar clase del contenedor
    const playerHand = document.getElementById('player-hand');
    playerHand.className = `player-hand ${isCurrentPlayer ? 'current' : ''}`;
    
    // Actualizar cartas
    const cardsContainer = document.getElementById('player-cards');
    cardsContainer.innerHTML = '';
    
    humanPlayer.cards.forEach((card, index) => {
        const cardElement = document.createElement('div');
        cardElement.innerHTML = createCardHTML(card, 'medium');
        
        // Determinar si la carta es jugable
        const isPlayable = isCurrentPlayer && (
            canPlayCard(card, gameState.discardPile[gameState.discardPile.length - 1], gameState.currentColor) &&
            gameState.drawCount === 0 // No se pueden jugar cartas si hay que robar
        );
        
        cardElement.firstElementChild.className += isPlayable ? ' playable' : '';
        
        if (isPlayable) {
            cardElement.firstElementChild.addEventListener('click', () => handleCardClick(index));
        }
        
        cardsContainer.appendChild(cardElement);
    });
}

function updateUnoButton() {
    const humanPlayer = gameState.players[0];
    const showButton = humanPlayer.cards.length === 2 && !humanPlayer.saidUno && gameState.currentPlayerIndex === 0;
    
    unoButton.classList.toggle('hidden', !showButton);
}

function createCardHTML(card, size = 'medium') {
    const cardContent = getCardContent(card);
    return `<div class="card ${card.color} ${size}">${cardContent}</div>`;
}

function getCardContent(card) {
    if (card.type === 'number') {
        return card.value.toString();
    }
    
    const symbols = {
        skip: '⏭️',
        reverse: '🔄',
        draw2: '+2',
        wild: '🎨',
        wild4: '🎨+4'
    };
    
    return symbols[card.type] || '';
}

function showVictoryScreen() {
    gameScreen.classList.add('hidden');
    victoryScreen.classList.remove('hidden');
    document.getElementById('winner-name').textContent = gameState.winner.name;
}