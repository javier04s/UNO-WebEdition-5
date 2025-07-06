// gameUtils.js
// Funciones utilitarias generales para la lógica de UNO

// Valida si una carta se puede jugar sobre la carta de la pila
export function isCardValid(card, discardPile, currentColor) {
  if (!card) return false;
  // 1. Wild sobre cualquier carta
  if (card.color === 'wild') return true;
  // 2. Mismo color
  if (card.color === currentColor) return true;
  // 3. Número sobre mismo número
  if (card.type === 'number' && discardPile.type === 'number' && card.value === discardPile.value) return true;
  // 4. Especiales sobre sí mismas (sin importar color)
  if (["skip", "reverse", "draw2"].includes(card.type) && card.type === discardPile.type) return true;
  // 5. Especiales sobre otras especiales de distinto tipo SOLO si el color coincide
  if (
    ["skip", "reverse", "draw2"].includes(card.type) &&
    ["skip", "reverse", "draw2"].includes(discardPile.type) &&
    card.type !== discardPile.type &&
    card.color === discardPile.color
  ) return true;
  return false;
}

// Calcula el siguiente turno según la dirección
export function nextTurnWithDirection(turn, numPlayers, direction) {
  return (turn + direction + numPlayers) % numPlayers;
}

// Devuelve los índices de cartas válidas en la mano
export function getValidCards(hand, discardPile, currentColor) {
  return hand.map((c, i) => isCardValid(c, discardPile, currentColor) ? i : -1).filter(i => i !== -1);
}

// Roba una carta del mazo para un jugador
export function drawCard(game, playerIdx) {
  console.log(`Player ${playerIdx+1} roba carta del mazo` )
  if (game.deck.length === 0) return null;
  const card = game.deck.pop();
  game.hands[playerIdx].push(card);
  return card;
}

// Pausa asíncrona (para simular turnos de bots)
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Calcula la puntuación de una mano de cartas según las reglas de UNO
export function calculateHandScore(hand) {
  let score = 0;
  for (const card of hand) {
    if (card.type === 'number') {
      score += parseInt(card.value, 10);
    } else if (card.type === 'draw2' || card.type === 'reverse' || card.type === 'skip') {
      score += 20;
    } else if (card.type === 'wild' || card.type === 'wild4') {
      score += 50;
    }
  }
  return score;
} 