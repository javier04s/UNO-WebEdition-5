import cors from 'cors';
import express from 'express';
import http from 'http';
import { v4 as uuidv4 } from 'uuid';
import { WebSocketServer } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import { PLAYERS, initGameState } from './gameInit.js';
import { calculateHandScore, drawCard, getValidCards, isCardValid, nextTurnWithDirection, sleep } from './gameUtils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Servir archivos estáticos del frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// Ruta principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Estado en memoria
const games = {}; // Estado de cada partida por id
const wsClients = {}; // Clientes WebSocket por id de partida
const unoTimers = {}; // Timers para penalización de UNO por partida
const MAX_SCORE = 200;

// --- Funciones de utilidades ---

// Envía una actualización por WebSocket al cliente de la partida
function sendWsUpdate(gameId, data) {
  const ws = wsClients[gameId];
  if (ws && ws.readyState === 1) {
    ws.send(JSON.stringify(data));
  }
}

// Aplica los efectos de una carta especial (skip, reverse, draw2, wild4)
function applySpecialEffects(game, playedCard) {
  let skip = false, draw = 0;
  if (playedCard.type === 'skip') skip = true;
  if (playedCard.type === 'reverse') game.direction *= -1;
  if (playedCard.type === 'draw2') draw = 2;
  if (playedCard.type === 'wild4') draw = 4;
  return { skip, draw };
}

// Aplica penalización de robo de cartas y avanza turno
function applyDrawPenalty(game, gameId, draw, currentTurn, sendUpdate = true,) {
  for (let i = 0; i < draw; i++) {
    drawCard(game, currentTurn);
  }
  if (sendUpdate) {
    // Determinar el nombre del jugador afectado
    let playerName;
    if (currentTurn === 0) {
      playerName = game.playerName || PLAYERS[0];
    } else {
      playerName = PLAYERS[currentTurn];
    }

    sendWsUpdate(gameId, {
      type: 'draw_penalty',
      player: playerName,
      amount: draw,
      gameState: getGameState(game, gameId)
    });
  }
  // Bandera para que el bot penalizado pierda su turno
  // game.skipBotTurn = true;
}

// Aplica penalización por no decir UNO
function applyUnoPenalty(game, gameId) {
  // El cliente debe robar 2 cartas
  for (let i = 0; i < 2; i++) {
    drawCard(game, 0);
  }
  sendWsUpdate(gameId, {
    type: 'uno_penalty',
    player: game.playerName || PLAYERS[0],
    amount: 2,
    gameState: getGameState(game, gameId)
  });
}

// Inicia el timer para que el cliente diga UNO
function startUnoTimer(gameId) {
  // Limpiar timer anterior si existe
  if (unoTimers[gameId]) {
    clearTimeout(unoTimers[gameId]);
  }

  unoTimers[gameId] = setTimeout(async () => {
    const game = games[gameId];
    if (game && game.hands[0].length === 1) {
      applyUnoPenalty(game, gameId);
      // Continuar el juego con los bots después de la penalización
      await simulateBotsWithDelay(game, gameId);
    }
    delete unoTimers[gameId];
  }, 4000); // 4 segundos
}

// Cancela el timer de UNO
function cancelUnoTimer(gameId) {
  if (unoTimers[gameId]) {
    clearTimeout(unoTimers[gameId]);
    delete unoTimers[gameId];
  }
}

// Inicializa o reinicia los puntajes si no existen
function ensureScores(game) {
  const numPlayers = game.numPlayers || 4;
  if (!game.scores) {
    game.scores = Array(numPlayers).fill(0);
  }
}

// Calcula y suma los puntos de la ronda al ganador
function handleRoundEnd(game, gameId, winnerIdx) {
  ensureScores(game);
  let roundScore = 0;
  const numPlayers = game.numPlayers || 4;

  for (let i = 0; i < numPlayers; i++) {
    if (i !== winnerIdx && game.hands[i] && Array.isArray(game.hands[i])) {
      roundScore += calculateHandScore(game.hands[i]);
    }
  }
  game.scores[winnerIdx] += roundScore;

  // Determinar el nombre del ganador
  let winnerName;
  if (winnerIdx === 0) {
    winnerName = game.playerName || PLAYERS[0];
  } else {
    winnerName = PLAYERS[winnerIdx];
  }

  // Marcar el juego como terminado y guardar el índice del ganador
  game.finished = true;
  game.winnerIdx = winnerIdx;

  // Enviar notificación de fin de juego
  sendWsUpdate(gameId, {
    type: 'game_over',
    winner: winnerName,
    winnerIdx,
    roundScore,
    scores: game.scores,
    gameState: getGameState(game, gameId)
  });
}

// Devuelve el estado actual de la partida para el frontend
function getGameState(game, gameId) {
  const numPlayers = game.numPlayers || 4;
  const playerNames = ['Player 1', 'Player 2', 'Player 3', 'Player 4'];

  // Determinar el ganador si el juego terminó
  let winner = null;
  if (game.finished && game.winnerIdx !== undefined) {
    if (game.winnerIdx === 0) {
      winner = game.playerName || 'Jugador';
    } else {
      winner = playerNames[game.winnerIdx];
    }
  }

  return {
    finished: game.finished,
    // el deck no se manda al cliente
    clientCards: game.hands[0],
    discardPile: game.pile[game.pile.length - 1],
    currentColor: game.currentColor,
    otherPlayers: playerNames.slice(1, numPlayers).map((player, i) => {
      return { name: player, count: game.hands[i + 1].length }
    }),
    turn: game.turn,
    direction: game.direction,
    message: game.finished ? 'Game finished!' : undefined,
    gameId,
    scores: game.scores || Array(numPlayers).fill(0),
    playerName: game.playerName || 'Jugador',
    numPlayers: numPlayers,
    deckCount: game.deck.length,
    winner: winner
  };
}

// Simula los turnos de los bots con delays y aplica reglas
async function simulateBotsWithDelay(game, gameId) {
  const numPlayers = game.numPlayers || 4;
  const playerNames = ['Player 1', 'Player 2', 'Player 3', 'Player 4'];

  while (game.turn !== 0 && !game.finished) {
    const botIdx = game.turn;
    const botHand = game.hands[botIdx];
    const discardPile = game.pile[game.pile.length - 1];
    const currentColor = game.currentColor;
    let validIndexes = getValidCards(botHand, discardPile, currentColor);
    let playedCard = null;
    let chosenColor = null;
    if (validIndexes.length > 0) {
      await sleep(2500); // Simula tiempo de "pensar"
      const idx = validIndexes[0];
      playedCard = botHand.splice(idx, 1)[0];
      game.pile.push(playedCard);
      // Si es comodín, elige color
      if (playedCard.color === 'wild') {
        const colorsInHand = botHand.filter(c => c.color !== 'wild').map(c => c.color);
        chosenColor = colorsInHand.length ? colorsInHand.sort((a, b) => colorsInHand.filter(x => x === a).length - colorsInHand.filter(x => x === b).length).pop() : 'red';
        game.currentColor = chosenColor;
      } else {
        game.currentColor = playedCard.color;
      }
      // Aplica efectos especiales
      const { skip, draw } = applySpecialEffects(game, playedCard);
      game.turn = nextTurnWithDirection(game.turn, numPlayers, game.direction);
      const currentTurn = game.turn
      if (skip || draw > 0) game.turn = nextTurnWithDirection(game.turn, numPlayers, game.direction);
      if (draw > 0) {
        applyDrawPenalty(game, gameId, draw, currentTurn);
      }
      sendWsUpdate(gameId, {
        type: 'bot_play',
        player: playerNames[botIdx],
        card: playedCard,
        gameState: getGameState(game, gameId)
      });

      // Verificar si el bot tiene solo una carta después de jugar
      if (botHand.length === 1) {
        sendWsUpdate(gameId, {
          type: 'bot_uno',
          player: playerNames[botIdx],
          gameState: getGameState(game, gameId)
        });
      }
      // Si el bot se queda sin cartas, termina la partida y notifica
      if (botHand.length === 0) {
        game.finished = true;
        handleRoundEnd(game, gameId, botIdx);
        break;
      }
    } else {
      await sleep(2000); // Simula tiempo de "robar"
      const drawn = drawCard(game, botIdx);
      if (isCardValid(drawn, discardPile, currentColor)) {
        playedCard = botHand.pop();
        game.pile.push(playedCard);
        if (playedCard.color === 'wild') {
          const colorsInHand = botHand.filter(c => c.color !== 'wild').map(c => c.color);
          chosenColor = colorsInHand.length ? colorsInHand.sort((a, b) => colorsInHand.filter(x => x === a).length - colorsInHand.filter(x => x === b).length).pop() : 'red';
          game.currentColor = chosenColor;
        } else {
          game.currentColor = playedCard.color;
        }
        const { skip, draw } = applySpecialEffects(game, playedCard);
        const currentTurn = game.turn
        game.turn = nextTurnWithDirection(game.turn, numPlayers, game.direction);
        if (skip) game.turn = nextTurnWithDirection(game.turn, numPlayers, game.direction);
        if (draw > 0) {
          applyDrawPenalty(game, gameId, draw, currentTurn);
        }
        sendWsUpdate(gameId, {
          type: 'bot_play',
          player: playerNames[botIdx],
          card: playedCard,
          chosenColor,
          gameState: getGameState(game, gameId)
        });

        // Verificar si el bot tiene solo una carta después de jugar
        if (botHand.length === 1) {
          sendWsUpdate(gameId, {
            type: 'bot_uno',
            player: playerNames[botIdx],
            gameState: getGameState(game, gameId)
          });
        }
        // Si el bot se queda sin cartas, termina la partida y notifica
        if (botHand.length === 0) {
          game.finished = true;
          handleRoundEnd(game, gameId, botIdx);
          break;
        }
      } else {
        game.turn = nextTurnWithDirection(game.turn, numPlayers, game.direction);
        sendWsUpdate(gameId, {
          type: 'bot_draw_from_deck',
          player: playerNames[botIdx],
          card: drawn,
          gameState: getGameState(game, gameId)
        });
      }
    }
  }
}

// --- Endpoints HTTP ---

// Inicia una nueva partida
app.post('/start', (req, res) => {
  const { playerName, numPlayers } = req.body;
  const totalPlayers = numPlayers || 4; // Por defecto 4 jugadores
  const gameState = initGameState(totalPlayers);
  gameState.scores = Array(totalPlayers).fill(0); // Asegura que siempre haya scores
  gameState.playerName = playerName || 'Jugador'; // Guardar el nombre del jugador
  gameState.numPlayers = totalPlayers; // Guardar el número de jugadores
  const gameId = uuidv4();
  games[gameId] = gameState;
  res.json(getGameState(games[gameId], gameId));
});

// Jugar una carta o robar si no hay jugada válida
app.post('/play', async (req, res) => {
  const { gameId, card, chosenColor } = req.body;
  const game = games[gameId];
  if (!game) return res.status(400).json({ error: 'Game not found or finished' });
  if (game.finished) return res.status(400).json({ error: 'Game not found or finished' });
  if (game.turn !== 0) return res.status(400).json({ error: 'Not your turn' });
  const discardPile = game.pile[game.pile.length - 1];
  const currentColor = game.currentColor;
  // Validación de carta
  if (!card || typeof card !== 'object' || !('color' in card) || !isCardValid(card, discardPile, currentColor)) {
    return res.status(400).json({ error: 'Invalid Card' });
  }
  // Si la jugada es válida
  if (isCardValid(card, discardPile, currentColor)) {
    // Añadimos la carta seleccionada a la zona de descarte
    game.pile.push(card);
    // Y la eliminamos de la mano del cliente
    game.hands[0] = game.hands[0].filter(el => el.id !== card.id)
    // Cambiamos el color si es un comodín
    if (card.color === 'wild') {
      game.currentColor = chosenColor || 'red';
    } else {
      game.currentColor = card.color;
    }
    // Aplica efectos especiales
    const currentTurn = game.turn
    const { skip, draw } = applySpecialEffects(game, card);
    const numPlayers = game.numPlayers || 4;
    game.turn = nextTurnWithDirection(game.turn, numPlayers, game.direction);
    if (draw > 0) {
      applyDrawPenalty(game, gameId, draw, game.turn);
    }
    if (skip || draw > 0) game.turn = nextTurnWithDirection(game.turn, numPlayers, game.direction);
    sendWsUpdate(gameId, {
      type: 'client_play',
      player: game.playerName || PLAYERS[0],
      card: card,
      chosenColor: card.color === 'wild' ? game.currentColor : null,
      gameState: getGameState(game, gameId)
    });

    // Verificar si el cliente tiene solo una carta después de jugar
    if (game.hands[0].length === 1) {
      sendWsUpdate(gameId, {
        type: 'uno_warning',
        player: game.playerName || PLAYERS[0],
        gameState: getGameState({ ...game, turn: currentTurn }, gameId)
      });
      startUnoTimer(gameId);
      // No continuar con los bots, esperar a que el cliente diga UNO
      res.json(getGameState({ ...game, turn: currentTurn }, gameId));
      return;
    }
    // Si el cliente se queda sin cartas, termina la partida y notifica
    if (game.hands[0].length === 0) {
      game.finished = true;
      handleRoundEnd(game, gameId, 0);
      res.json(getGameState(game, gameId));
      return;
    }
  }
  // Simula los turnos de los bots solo si no se activó el timer de UNO
  await simulateBotsWithDelay(game, gameId);
  res.json(getGameState(game, gameId));
});

// Endpoint para robar carta manualmente
app.post('/draw', async (req, res) => {
  const { gameId } = req.body;
  const game = games[gameId];
  if (!game || game.finished) return res.status(400).json({ error: 'Game not found or finished' });
  if (game.turn !== 0) return res.status(400).json({ error: 'Not your turn' });

  const discardPile = game.pile[game.pile.length - 1];
  const currentColor = game.currentColor;
  const card = drawCard(game, 0);

  // Verificar si la carta robada es válida
  if (!isCardValid(card, discardPile, currentColor)) {
    // Si la carta robada no es válida, pasa el turno automáticamente
    const numPlayers = game.numPlayers || 4;
    game.turn = nextTurnWithDirection(game.turn, numPlayers, game.direction);
  }

  sendWsUpdate(gameId, {
    type: 'client_draw_from_deck',
    player: game.playerName || PLAYERS[0],
    card,
    gameState: getGameState(game, gameId)
  });
  await simulateBotsWithDelay(game, gameId);

  res.json({ card, clientCards: game.hands[0], gameState: getGameState(game, gameId) });
});

// Endpoint para decir UNO
app.post('/uno', async (req, res) => {
  const { gameId } = req.body;
  const game = games[gameId];
  if (!game || game.finished) return res.status(400).json({ error: 'Game not found or finished' });
  if (game.hands[0].length !== 1) return res.status(400).json({ error: 'You must have exactly 1 card to say UNO' });

  // Cancelar el timer de penalización
  cancelUnoTimer(gameId);

  sendWsUpdate(gameId, {
    type: 'client_uno',
    player: game.playerName || PLAYERS[0],
    gameState: getGameState(game, gameId)
  });
  await simulateBotsWithDelay(game, gameId);
  res.json({ success: true, gameState: getGameState(game, gameId) });
});

// Endpoint para iniciar una nueva ronda manteniendo los puntajes
app.post('/new-round', (req, res) => {
  const { gameId } = req.body;
  const oldGame = games[gameId];
  if (!oldGame) return res.status(400).json({ error: 'Game not found' });
  // Crear nuevo estado de juego
  const numPlayers = oldGame.numPlayers || 4;
  const newGame = initGameState(numPlayers);
  newGame.scores = oldGame.scores ? [...oldGame.scores] : Array(numPlayers).fill(0);
  newGame.playerName = oldGame.playerName;
  newGame.numPlayers = numPlayers;
  games[gameId] = newGame;
  res.json(getGameState(newGame, gameId));
});

// Endpoint para reiniciar la partida actual
app.post('/restart', (req, res) => {
  const { gameId } = req.body;
  const oldGame = games[gameId];
  if (!oldGame) return res.status(400).json({ error: 'Game not found' });

  // Crear nuevo estado de juego con los mismos parámetros
  const numPlayers = oldGame.numPlayers || 4;
  const newGame = initGameState(numPlayers);
  newGame.playerName = oldGame.playerName;
  newGame.numPlayers = numPlayers;
  // No mantener los puntajes para un reinicio completo
  newGame.scores = Array(numPlayers).fill(0);

  games[gameId] = newGame;
  res.json(getGameState(newGame, gameId));
});

// --- WebSocket Server ---

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Maneja conexiones WebSocket para notificaciones en tiempo real
wss.on('connection', (ws, req) => {
  ws.on('message', (msg) => {
    try {
      const data = JSON.parse(msg);
      if (data.type === 'subscribe' && data.gameId) {
        wsClients[data.gameId] = ws;
        ws.send(JSON.stringify({ type: 'subscribed', gameId: data.gameId }));
      }
    } catch (e) {
      ws.send(JSON.stringify({ error: 'Invalid message' }));
    }
  });
  ws.on('close', () => {
    for (const [gameId, client] of Object.entries(wsClients)) {
      if (client === ws) delete wsClients[gameId];
    }
  });
});

// Inicia el servidor HTTP y WebSocket
server.listen(PORT, () => {
  console.log(`UNO server listening at http://localhost:${PORT}`);
}); 