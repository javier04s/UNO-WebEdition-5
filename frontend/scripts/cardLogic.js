// Crear mazo de cartas
function createDeck() {
    const deck = [];
    const colors = ['red', 'yellow', 'green', 'blue'];

    // Cartas numericas
    colors.forEach(color => {
        // Una carta 0 por color
        deck.push({ id: `${color}-0`, color, type: 'number', value: 0 });

        // Dos cartas de cada numero 1-9 por color
        for (let i = 1; i <= 9; i++) {
            deck.push({ id: `${color}-${i}-1`, color, type: 'number', value: i });
            deck.push({ id: `${color}-${i}-2`, color, type: 'number', value: i });
        }

        // Cartas de accion (2 de cada por color)
        ['skip', 'reverse', 'draw2'].forEach(action => {
            deck.push({ id: `${color}-${action}-1`, color, type: action });
            deck.push({ id: `${color}-${action}-2`, color, type: action });
        });
    });

    // Cartas comodin (4 de cada)
    for (let i = 1; i <= 4; i++) {
        deck.push({ id: `wild-${i}`, color: 'wild', type: 'wild' });
        deck.push({ id: `wild4-${i}`, color: 'wild', type: 'wild4' });
    }

    return shuffleDeck(deck);
}

function shuffleDeck(deck) {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

function dealCards(deck, numPlayers) {
    const playerHands = Array(numPlayers).fill(null).map(() => []);
    const remainingDeck = [...deck];

    // Repartir 7 cartas a cada jugador
    for (let i = 0; i < 7; i++) {
        for (let j = 0; j < numPlayers; j++) {
            const card = remainingDeck.pop();
            if (card) {
                playerHands[j].push(card);
            }
        }
    }

    return { playerHands, remainingDeck };
}

function canPlayCard(card, topCard, currentColor) {
    // Cartas comodin siempre se pueden jugar
    if (card.type === 'wild' || card.type === 'wild4') {
        return true;
    }

    // Verificar coincidencia de color actual
    if (currentColor && card.color === currentColor) {
        return true;
    }

    // Verificar coincidencia de color
    if (card.color === topCard.color) {
        return true;
    }

    // Verificar coincidencia de numero/tipo
    if (card.type === 'number' && topCard.type === 'number' && card.value === topCard.value) {
        return true;
    }

    if (card.type === topCard.type && card.type !== 'number') {
        return true;
    }

    return false;
}

function drawCards(deck, count) {
    const remainingDeck = [...deck];
    const drawnCards = [];

    for (let i = 0; i < count && remainingDeck.length > 0; i++) {
        const card = remainingDeck.pop();
        if (card) {
            drawnCards.push(card);
        }
    }

    return { drawnCards, remainingDeck };
}

function reshuffleDeck(discardPile) {
    const newDeck = discardPile.slice(0, -1); // Mantener carta superior
    return shuffleDeck(newDeck);
}