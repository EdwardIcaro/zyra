import { Schema, type } from '@colyseus/schema';

export class ProjectileState extends Schema {
  @type('string') id!: string;
  @type('string') ownerId!: string;
  @type('number') x: number = 0;
  @type('number') y: number = 0;
  @type('number') vx: number = 0;
  @type('number') vy: number = 0;
  @type('number') damage: number = 10;
  @type('string') color: string = '#fff';
  @type('number') life: number = 80;
  @type('number') radius: number = 10;
}