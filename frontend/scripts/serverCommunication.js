// Comunicación con el servidor backend
class ServerCommunication {
  constructor() {
    this.baseURL = 'http://localhost:3001';
    this.ws = null;
    this.gameId = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  // Inicializar conexión WebSocket
  initWebSocket() {
    try {
      this.ws = new WebSocket('ws://localhost:3001');

      this.ws.onopen = () => {
        console.log('WebSocket conectado');
        this.isConnected = true;
        this.reconnectAttempts = 0;

        // Suscribirse al juego actual si existe
        if (this.gameId) {
          this.subscribeToGame(this.gameId);
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleWebSocketMessage(data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.ws.onclose = () => {
        console.log('WebSocket desconectado');
        this.isConnected = false;
        this.handleReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.isConnected = false;
      };

    } catch (error) {
      console.error('Error inicializando WebSocket:', error);
    }
  }

  // Manejar reconexión automática
  handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Intentando reconectar... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

      setTimeout(() => {
        this.initWebSocket();
      }, 2000 * this.reconnectAttempts);
    } else {
      showNotification('Error de conexión con el servidor', 'error');
    }
  }

  // Suscribirse a un juego específico
  subscribeToGame(gameId) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'subscribe',
        gameId: gameId
      }));
    }
  }

  // Manejar mensajes del WebSocket
  handleWebSocketMessage(data) {
    console.log('WebSocket message received:', data);

    switch (data.type) {
      case 'subscribed':
        console.log('Suscrito al juego:', data.gameId);
        break;

      case 'client_play':
        showNotification(`${data.player} jugó ${this.getCardName(data.card)}`, 'info');
        this.updateGameFromServer(data.gameState);
        break;

      case 'client_draw_from_deck':
        showNotification(`${data.player} robó una carta`, 'info');
        this.updateGameFromServer(data.gameState);
        break;

      case 'client_uno':
        showNotification(`¡${data.player} gritó UNO!`, 'success');
        this.updateGameFromServer(data.gameState);
        break;

      case 'bot_play':
        showNotification(`${data.player} jugó ${this.getCardName(data.card)}`, 'info');
        this.updateGameFromServer(data.gameState);
        break;

      case 'bot_draw_from_deck':
        showNotification(`${data.player} robó una carta`, 'info');
        this.updateGameFromServer(data.gameState);
        break;

      case 'bot_uno':
        showNotification(`¡${data.player} gritó UNO!`, 'success');
        this.updateGameFromServer(data.gameState);
        break;

      case 'uno_warning':
        showNotification(`¡${data.player} tiene 1 carta! ¡Di UNO!`, 'warning');
        this.updateGameFromServer(data.gameState);
        break;

      case 'uno_penalty':
        showNotification(`${data.player} no dijo UNO y debe robar 2 cartas`, 'error');
        this.updateGameFromServer(data.gameState);
        break;

      case 'draw_penalty':
        showNotification(`${data.player} debe robar ${data.amount} cartas`, 'warning');
        this.updateGameFromServer(data.gameState);
        break;

      case 'round_score':
        showNotification(`¡${data.winner} ganó la ronda con ${data.roundScore} puntos!`, 'success');
        this.updateGameFromServer(data.gameState);
        break;

      case 'new_round':
        showNotification('Nueva ronda iniciada', 'info');
        this.updateGameFromServer(data.gameState);
        break;

      case 'game_over':
        showNotification(`¡${data.winner} ganó el juego!`, 'success');
        this.updateGameFromServer(data.gameState);
        break;

      default:
        console.log('Mensaje WebSocket no manejado:', data);
    }
  }

  // Obtener nombre de carta para mostrar
  getCardName(card) {
    if (card.type === 'number') {
      return `el ${card.value}`;
    }

    const names = {
      skip: 'Salta',
      reverse: 'Reversa',
      draw2: 'Roba 2',
      wild: 'Comodín',
      wild4: 'Comodín +4'
    };

    return names[card.type] || 'carta';
  }

  // Iniciar nueva partida
  async startGame(playerName = null, numPlayers = null) {
    try {
      // Obtener el nombre del jugador si no se proporciona
      if (!playerName) {
        const playerNameInput = document.getElementById('player-name');
        playerName = playerNameInput ? playerNameInput.value.trim() || 'Jugador' : 'Jugador';
      }

      // Obtener el número de jugadores si no se proporciona
      if (!numPlayers) {
        const numPlayersInput = document.getElementById('num-players');
        numPlayers = numPlayersInput ? parseInt(numPlayersInput.value) || 4 : 4;
      }

      const response = await fetch(`${this.baseURL}/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          playerName: playerName,
          numPlayers: numPlayers
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const gameState = await response.json();
      this.gameId = gameState.gameId;

      // Suscribirse al juego
      this.subscribeToGame(this.gameId);

      // Actualizar el estado del juego
      this.updateGameFromServer(gameState);

      return gameState;
    } catch (error) {
      console.error('Error iniciando partida:', error);
      showNotification('Error conectando con el servidor', 'error');
      throw error;
    }
  }

  // Jugar carta
  async playCard(card, chosenColor = null) {
    try {
      const response = await fetch(`${this.baseURL}/play`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          gameId: this.gameId,
          card: card,
          chosenColor: chosenColor
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error jugando carta');
      }

      const gameState = await response.json();
      this.updateGameFromServer(gameState);
      return gameState;
    } catch (error) {
      console.error('Error jugando carta:', error);
      showNotification(error.message, 'error');
      throw error;
    }
  }

  // Robar carta
  async drawCard() {
    try {
      const response = await fetch(`${this.baseURL}/draw`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          gameId: this.gameId
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error robando carta');
      }

      const result = await response.json();
      this.updateGameFromServer(result.gameState);
      return result;
    } catch (error) {
      console.error('Error robando carta:', error);
      showNotification(error.message, 'error');
      throw error;
    }
  }

  // Decir UNO
  async sayUno() {
    try {
      const response = await fetch(`${this.baseURL}/uno`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          gameId: this.gameId
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error diciendo UNO');
      }

      const result = await response.json();
      this.updateGameFromServer(result.gameState);
      return result;
    } catch (error) {
      console.error('Error diciendo UNO:', error);
      showNotification(error.message, 'error');
      throw error;
    }
  }

  // Nueva ronda
  async newRound() {
    try {
      const response = await fetch(`${this.baseURL}/new-round`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          gameId: this.gameId
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error iniciando nueva ronda');
      }

      const gameState = await response.json();
      this.updateGameFromServer(gameState);
      return gameState;
    } catch (error) {
      console.error('Error iniciando nueva ronda:', error);
      showNotification(error.message, 'error');
      throw error;
    }
  }

  // Reiniciar partida
  async restartGame() {
    try {
      const response = await fetch(`${this.baseURL}/restart`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          gameId: this.gameId
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error reiniciando partida');
      }

      const gameState = await response.json();
      this.updateGameFromServer(gameState);
      return gameState;
    } catch (error) {
      console.error('Error reiniciando partida:', error);
      showNotification(error.message, 'error');
      throw error;
    }
  }

  // Actualizar el juego desde el servidor
  updateGameFromServer(serverGameState) {
    // Usar el nombre del jugador que viene del servidor o del input
    const playerName = serverGameState.playerName ||
      (document.getElementById('player-name') ? document.getElementById('player-name').value.trim() : 'Jugador') || 'Jugador';

    // Convertir el estado del servidor al formato del cliente
    const clientGameState = {
      players: [
        {
          id: '1',
          name: playerName,
          avatar: '👤',
          cards: serverGameState.clientCards || [],
          isBot: false,
          saidUno: false
        },
        ...serverGameState.otherPlayers.map((player, index) => ({
          id: (index + 2).toString(),
          name: player.name,
          avatar: AVATARS[index % AVATARS.length],
          cards: Array(player.count).fill({}),
          isBot: true,
          saidUno: false
        }))
      ],
      currentPlayerIndex: serverGameState.turn,
      direction: serverGameState.direction,
      deck: Array(serverGameState.deckCount || 0).fill({}),
      discardPile: serverGameState.discardPile ? [serverGameState.discardPile] : [],
      gamePhase: serverGameState.finished ? 'finished' : 'playing',
      winner: serverGameState.finished && serverGameState.winner ? { name: serverGameState.winner } : null,
      currentColor: serverGameState.currentColor,
      drawCount: 0,
      pendingWildCard: null,
      lastAction: null,
      gameStartTime: Date.now(),
      turnStartTime: Date.now(),
      scores: serverGameState.scores || [0, 0, 0, 0]
    };

    // Actualizar el estado global del juego
    Object.assign(gameState, clientGameState);

    // Actualizar la interfaz
    updateGameDisplay();

    // Mostrar mensaje si el juego termino
    if (serverGameState.finished) {
      showVictoryScreen();
    }
  }

  // Verificar conexion con el servidor
  async checkServerConnection() {
    try {
      const response = await fetch(`${this.baseURL}/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  // Cerrar conexion
  closeConnection() {
    if (this.ws) {
      this.ws.close();
    }
    this.isConnected = false;
    this.gameId = null;
  }
}

// Crear instancia global
const serverComm = new ServerCommunication();

// Exportar para uso global
window.serverComm = serverComm; 