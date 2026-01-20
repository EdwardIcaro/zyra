import { Schema, type } from '@colyseus/schema';

export class MonsterState extends Schema {
  @type('string') id!: string;
  @type('string') templateId!: string;
  @type('string') name!: string; // ✅ ESTE CAMPO JÁ EXISTE
  @type('number') level: number = 1;
  @type('string') type: string = '';
  
  @type('number') x: number = 0;
  @type('number') y: number = 0;
  @type('number') spawnX: number = 0;
  @type('number') spawnY: number = 0;
  
  @type('number') currentHp: number = 100;
  @type('number') maxHp: number = 100;
  @type('number') damage: number = 10;
  @type('number') defense: number = 0;
  @type('number') attackSpeed: number = 1.5;
  @type('number') speed: number = 1;
  @type('string') spriteFilename: string = '';
  @type('number') scale: number = 1;
  @type('string') visualEffect: string = 'none';
  @type('boolean') shadowEnabled: boolean = false;
  @type('number') shadowAlpha: number = 0.35;
  @type('number') shadowOffset: number = 18;
  @type('number') shadowScale: number = 1;
  @type('number') sandboxScale: number = 1;
  
  @type('string') aggroType!: string; // 'passive' | 'aggressive' | 'defensive'
  @type('number') aggroRange: number = 0;
  @type('number') leashRange: number = 200;
  
  @type('string') targetPlayerId: string = '';
  @type('number') lastAttackAt: number = 0;
  @type('number') respawnTimer: number = 0;
  @type('boolean') isDead: boolean = false;
}
