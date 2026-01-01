import { Room, Client } from 'colyseus';
import { WorldRoomState, PlayerState, GAME_CONFIG, CLASSES } from '@zyra/shared';

interface JoinOptions {
  username: string;
  classType: string;
}

interface MoveMessage {
  dx: number;
  dy: number;
}

export class WorldRoom extends Room<WorldRoomState> {
  maxClients = GAME_CONFIG.MAX_PLAYERS_WORLD;

  onCreate(options: any) {
    this.setState(new WorldRoomState());
    console.info(`[WorldRoom] Created room ${this.roomId}`);

    this.onMessage('move', (client, message: MoveMessage) => {
      this.handleMove(client, message);
    });

    this.onMessage('chat', (client, message: { text: string }) => {
      this.broadcast('chat', { 
        playerId: client.sessionId, 
        text: message.text 
      });
    });
  }

  onJoin(client: Client, options: JoinOptions) {
    console.info(`[WorldRoom] Player ${options.username} joined`);

    const classConfig = CLASSES[options.classType as keyof typeof CLASSES];
    if (!classConfig) {
      console.error(`Invalid class type: ${options.classType}`);
      return;
    }

    const player = new PlayerState();
    player.playerId = client.sessionId;
    player.username = options.username;
    player.classType = classConfig.type;
    player.x = Math.random() * this.state.width;
    player.y = Math.random() * this.state.height;

    // Apply class stats
    player.maxHp = classConfig.baseStats.maxHp;
    player.currentHp = classConfig.baseStats.maxHp;
    player.maxMana = classConfig.baseStats.maxMana;
    player.currentMana = classConfig.baseStats.maxMana;
    
    this.state.players.set(client.sessionId, player);
  }

  onLeave(client: Client, consented: boolean) {
    console.info(`[WorldRoom] Player ${client.sessionId} left`);
    this.state.players.delete(client.sessionId);
  }

  onDispose() {
    console.info(`[WorldRoom] Room ${this.roomId} disposed`);
  }

  private handleMove(client: Client, message: MoveMessage) {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;

    const classConfig = CLASSES[player.classType];
    const speed = classConfig.movement.baseSpeed;

    // Normalize diagonal movement
    const magnitude = Math.hypot(message.dx, message.dy);
    if (magnitude > 0) {
      const normalizedDx = (message.dx / magnitude) * speed;
      const normalizedDy = (message.dy / magnitude) * speed;

      player.x += normalizedDx;
      player.y += normalizedDy;

      // Clamp to bounds
      const radius = GAME_CONFIG.PLAYER.RADIUS;
      player.x = Math.max(radius, Math.min(this.state.width - radius, player.x));
      player.y = Math.max(radius, Math.min(this.state.height - radius, player.y));
    }
  }
}
