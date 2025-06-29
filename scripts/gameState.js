// Estado del juego
let gameState = {
    players: [],
    currentPlayerIndex: 0,
    direction: 1, // 1 para horario, -1 para antihorario
    deck: [],
    discardPile: [],
    gamePhase: 'welcome', // 'welcome', 'playing', 'finished'
    winner: null,
    currentColor: null,
    drawCount: 0,
    pendingWildCard: null
};

// Avatares para bots
const AVATARS = ['🤖', '👾', '🎮', '🎯', '🎪', '🎨', '🎭', '🎬'];

// Exportar para uso global
window.gameState = gameState;
window.AVATARS = AVATARS;