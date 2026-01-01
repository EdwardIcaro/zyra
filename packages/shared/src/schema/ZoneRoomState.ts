import { Schema, type, MapSchema } from '@colyseus/schema';
import { PlayerState } from './PlayerState';
import { MonsterState } from './MonsterState';
import { ProjectileState } from './ProjectileState';
import { DroppedItemState } from './DroppedItemState'; // ← ADICIONAR

export class ZoneRoomState extends Schema {
  @type('string') zoneId!: string;
  @type('string') zoneName!: string;
  @type('number') width: number = 3200;
  @type('number') height: number = 2400;
  
  @type({ map: PlayerState }) players = new MapSchema<PlayerState>();
  @type({ map: MonsterState }) monsters = new MapSchema<MonsterState>();
  @type({ map: ProjectileState }) projectiles = new MapSchema<ProjectileState>();
  @type({ map: DroppedItemState }) droppedItems = new MapSchema<DroppedItemState>(); // ← ADICIONAR
}
