import { Client, Room } from 'colyseus.js';
import { CombatRoomState, WorldRoomState } from '@zyra/shared';

export class NetworkManager {
  private client: Client;
  private currentRoom: Room | null = null;

  constructor() {
    this.client = new Client('ws://localhost:2567');
  }

  /**
   * Conecta ao mundo (WorldRoom)
   */
  async connectToWorld(username: string, classType: string): Promise<Room<WorldRoomState>> {
    try {
      const room = await this.client.joinOrCreate<WorldRoomState>('world', {
        username,
        classType
      });

      this.currentRoom = room;
      console.info('[NetworkManager] Connected to WorldRoom');
      
      return room;
    } catch (error) {
      console.error('[NetworkManager] Failed to connect to world:', error);
      throw error;
    }
  }

  /**
   * Conecta ao combate (CombatRoom) com suporte ao novo sistema de personagens
   * @param charName Nome do personagem escolhido ou criado
   * @param classType Classe do personagem
   * @param isNew Define se o personagem precisa ser criado no banco
   * @param dbId ID da Conta (se novo) ou ID do Personagem (se antigo)
   */
  async connectToCombat(
    charName: string, 
    classType: string, 
    isNew: boolean = false, 
    dbId?: number
  ): Promise<Room<CombatRoomState>> {
    try {
      // Enviamos os metadados para o servidor processar no onJoin
      const room = await this.client.joinOrCreate<CombatRoomState>('combat', {
        charName,
        classType,
        isNew,
        dbId
      });

      this.currentRoom = room;
      console.info(`[NetworkManager] Connected to CombatRoom as ${charName}`);
      
      return room;
    } catch (error) {
      console.error('[NetworkManager] Failed to connect to combat:', error);
      throw error;
    }
  }

  /**
   * Envia comando de movimento
   */
  sendMove(dx: number, dy: number) {
    if (this.currentRoom && this.currentRoom.connection.isOpen) {
      this.currentRoom.send('move', { dx, dy });
    }
  }

  /**
   * Envia comando de parada
   */
  sendStop() {
    if (this.currentRoom && this.currentRoom.connection.isOpen) {
      this.currentRoom.send('stop');
    }
  }

  /**
   * Envia comando de ataque
   */
  sendAttack(targetX: number, targetY: number) {
    if (this.currentRoom && this.currentRoom.connection.isOpen) {
      this.currentRoom.send('attack', { targetX, targetY });
    }
  }

  /**
   * Envia mensagem de chat
   */
  sendChat(text: string) {
    if (this.currentRoom && this.currentRoom.connection.isOpen) {
      this.currentRoom.send('chat', { text });
    }
  }

  /**
   * Desconecta da sala atual
   */
  disconnect() {
    if (this.currentRoom) {
      this.currentRoom.leave();
      this.currentRoom = null;
      console.info('[NetworkManager] Disconnected');
    }
  }

  /**
   * Retorna a sala ativa
   */
  getCurrentRoom(): Room | null {
    return this.currentRoom;
  }
}