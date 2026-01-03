import { Schema, type } from '@colyseus/schema';

export class MonsterState extends Schema {
  @type('string') id!: string;
  @type('string') templateId!: string;
  @type('string') name!: string; // ✅ ESTE CAMPO JÁ EXISTE
  @type('number') level: number = 1;
  
  @type('number') x: number = 0;
  @type('number') y: number = 0;
  @type('number') spawnX: number = 0;
  @type('number') spawnY: number = 0;
  
  @type('number') currentHp: number = 100;
  @type('number') maxHp: number = 100;
  @type('number') damage: number = 10;
  @type('number') speed: number = 1;
  
  @type('string') aggroType!: string; // 'passive' | 'aggressive' | 'defensive'
  @type('number') aggroRange: number = 0;
  @type('number') leashRange: number = 200;
  
  @type('string') targetPlayerId: string = '';
  @type('number') respawnTimer: number = 0;
  @type('boolean') isDead: boolean = false;
}