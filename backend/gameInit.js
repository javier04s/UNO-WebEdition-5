// gameInit.js
// Funciones para inicializar una partida de UNO

export const COLORS = ['red', 'yellow', 'green', 'blue'];
export const NUMBERS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
export const SPECIALS = ['skip', 'reverse', 'draw2'];
export const WILDS = ['wild', 'wild4'];
export const PLAYERS = ['Player 1', 'Player 2', 'Player 3', 'Player 4'];

// Crea un mazo de UNO estándar (108 cartas)
export function createDeck() {
  const deck = [];
  let cardId = 0;
  for (const color of COLORS) {
    deck.push({ id: String(cardId++), color, type: 'number', value: '0' }); // Solo un 0 por color
    for (let n = 1; n <= 9; n++) {
      deck.push({ id: String(cardId++), color, type: 'number', value: String(n) });
      deck.push({ id: String(cardId++), color, type: 'number', value: String(n) });
    }
    // Cartas especiales por color
    for (let i = 0; i < 2; i++) {
      deck.push({ id: String(cardId++), color, type: 'skip', value: 'skip' });
      deck.push({ id: String(cardId++), color, type: 'reverse', value: 'reverse' });
      deck.push({ id: String(cardId++), color, type: 'draw2', value: 'draw2' });
    }
  }
  // Comodines
  for (let i = 0; i < 4; i++) {
    deck.push({ id: String(cardId++), color: 'wild', type: 'wild', value: 'wild' });
    deck.push({ id: String(cardId++), color: 'wild', type: 'wild4', value: 'wild4' });
  }
  return deck;
}

// Baraja un array (Fisher-Yates)
export function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// Reparte cartas a los jugadores
export function dealHands(deck, numPlayers, cardsPerPlayer) {
  const hands = Array.from({ length: numPlayers }, () => []);
  for (let c = 0; c < cardsPerPlayer; c++) {
    for (let j = 0; j < numPlayers; j++) {
      hands[j].push(deck.pop());
    }
  }
  return hands;
}

// Inicializa el estado de una partida nueva
export function initGameState(numPlayers = 4) {
  const deck = shuffle(createDeck());
  const hands = dealHands(deck, numPlayers, 7);
  let discardPile = deck.pop();
  while (discardPile.type !== 'number') discardPile = deck.pop(); // Solo carta numérica al inicio
  return {
    deck,
    hands,
    pile: [discardPile],
    currentColor: discardPile.color,
    turn: 0, // Player 1
    direction: 1, // Horario
    finished: false
  };
} 