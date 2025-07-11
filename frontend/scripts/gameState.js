// Estado del juego
let gameState = {
    players: [],
    currentPlayerIndex: 0,
    direction: 1, // 1 para horario, -1 para antihorario
    deck: [],
    discardPile: [],
    gamePhase: 'welcome', // 'welcome', 'playing', 'finished', 'paused'
    winner: null,
    currentColor: null,
    drawCount: 0,
    pendingWildCard: null,
    lastAction: null, // Para animaciones y efectos
    gameStartTime: null,
    turnStartTime: null
};

// Avatares para bots
const AVATARS = ['☆', '▣', '㋡', '☠', '⊕', '⍩', '◆', 'Ω'];

// Configuración de colores
const CARD_COLORS = {
    red: '#a2124f',
    yellow: '#e5c71e',
    green: '#9ce450',
    blue: '#2b8cad',
    wild: '#44065c'
};

// Exportar para uso global
window.gameState = gameState;
window.AVATARS = AVATARS;
window.CARD_COLORS = CARD_COLORS;