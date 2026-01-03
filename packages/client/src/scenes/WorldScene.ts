// packages/client/src/scenes/WorldScene.ts
import { Container, Graphics } from 'pixi.js';
import type { Game } from '../game/Game';
import type { NetworkManager } from '../game/NetworkManager';
import { Player } from '../entities/Player'; // ✅ CORRIGIDO: era PlayerEntity
import { InputSystem } from '../systems/InputSystem';
import type { PlayerState } from '@zyra/shared';

export class WorldScene extends Container {
  private network: NetworkManager;
  private inputSystem: InputSystem;
  
  private players = new Map<string, Player>(); // ✅ CORRIGIDO
  private mySessionId: string | null = null;

  private camera = { x: 0, y: 0 };

  constructor(_game: Game, network: NetworkManager) {
    super();
    this.network = network;
    this.inputSystem = new InputSystem();
    
    this.setupRoom();
    this.drawBackground();
  }

  private drawBackground() {
    const bg = new Graphics()
      .rect(0, 0, 3200, 2400)
      .fill(0xf4e4bc);
    this.addChild(bg);

    for (let x = 0; x < 3200; x += 100) {
      const line = new Graphics()
        .moveTo(x, 0)
        .lineTo(x, 2400)
        .stroke({ width: 1, color: 0xd4c4ac });
      this.addChild(line);
    }
    for (let y = 0; y < 2400; y += 100) {
      const line = new Graphics()
        .moveTo(0, y)
        .lineTo(3200, y)
        .stroke({ width: 1, color: 0xd4c4ac });
      this.addChild(line);
    }
  }

  private async setupRoom() {
    const room = this.network.getCurrentRoom();
    if (!room) return;

    this.mySessionId = room.sessionId;

    room.state.players.onAdd((player: PlayerState, sessionId: string) => {
      const playerEntity = new Player(player, sessionId === this.mySessionId); // ✅ CORRIGIDO
      this.players.set(sessionId, playerEntity);
      this.addChild(playerEntity);
    });

    room.state.players.onRemove((_player: PlayerState, sessionId: string) => {
      const playerEntity = this.players.get(sessionId);
      if (playerEntity) {
        this.removeChild(playerEntity);
        this.players.delete(sessionId);
      }
    });

    room.onMessage('chat', (message: { playerId: string; text: string }) => {
      console.info(`[Chat] ${message.playerId}: ${message.text}`);
    });
  }

  update(deltaTime: number) {
    const input = this.inputSystem.getMovementInput();
    if (input.dx !== 0 || input.dy !== 0) {
      this.network.sendMove(input.dx, input.dy);
    }

    if (this.mySessionId) {
      const localPlayer = this.players.get(this.mySessionId);
      if (localPlayer) {
        this.camera.x = localPlayer.x - window.innerWidth / 2;
        this.camera.y = localPlayer.y - window.innerHeight / 2;
        
        this.position.set(-this.camera.x, -this.camera.y);
      }
    }

    this.players.forEach(player => player.update(deltaTime));
  }
}