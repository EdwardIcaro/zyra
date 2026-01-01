import { Schema, type, MapSchema } from '@colyseus/schema';
import { PlayerState } from './PlayerState';
import { EnemyState } from './EnemyState';
import { ProjectileState } from './ProjectileState';

export class CombatRoomState extends Schema {
  @type({ map: PlayerState }) players = new MapSchema<PlayerState>();
  @type({ map: EnemyState }) enemies = new MapSchema<EnemyState>();
  @type({ map: ProjectileState }) projectiles = new MapSchema<ProjectileState>();
  
  @type('number') wave: number = 1;
  @type('number') enemiesKilled: number = 0;
  @type('number') width: number = 1920;
  @type('number') height: number = 1080;
}