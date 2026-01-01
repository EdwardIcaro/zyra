import { Schema, type, MapSchema } from '@colyseus/schema';
import { PlayerState } from './PlayerState';

export class WorldRoomState extends Schema {
  @type({ map: PlayerState }) players = new MapSchema<PlayerState>();
  @type('number') width: number = 3200;
  @type('number') height: number = 2400;
}