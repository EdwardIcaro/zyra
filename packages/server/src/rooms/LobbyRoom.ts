import { Room, Client } from 'colyseus';
import { Schema, MapSchema, type } from '@zyra/shared';  // ← Importar do shared

class LobbyState extends Schema {
  @type({ map: 'string' }) players = new MapSchema<string>();
}

export class LobbyRoom extends Room<LobbyState> {
  onCreate(_options: any) {  // ← Adicionar _ antes de options
    this.setState(new LobbyState());
    console.info(`[LobbyRoom] Created room ${this.roomId}`);
  }

  onJoin(client: Client, options: { username: string }) {
    console.info(`[LobbyRoom] Player ${options.username} joined`);
    this.state.players.set(client.sessionId, options.username);
  }

  onLeave(client: Client, _consented: boolean) {  // ← Adicionar _ antes de consented
    console.info(`[LobbyRoom] Player ${client.sessionId} left`);
    this.state.players.delete(client.sessionId);
  }

  onDispose() {
    console.info(`[LobbyRoom] Room ${this.roomId} disposed`);
  }
}