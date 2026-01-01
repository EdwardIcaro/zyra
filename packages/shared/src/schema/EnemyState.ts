import { Schema, type } from '@colyseus/schema';

export class EnemyState extends Schema {
  @type('string') id!: string;
  @type('number') x: number = 0;
  @type('number') y: number = 0;
  @type('number') currentHp: number = 40;
  @type('number') maxHp: number = 40;
  @type('number') speed: number = 0.9;
  @type('number') radius: number = 22;
}