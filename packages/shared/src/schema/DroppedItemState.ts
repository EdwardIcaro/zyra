import { Schema, type } from '@colyseus/schema';

export class DroppedItemState extends Schema {
  @type('string') id!: string;
  @type('string') itemId!: string; // ✅ ESTE CAMPO JÁ EXISTE
  @type('number') quantity: number = 1;
  @type('number') x: number = 0;
  @type('number') y: number = 0;
  @type('number') despawnTime: number = 60000; // 60 segundos
  @type('number') spawnedAt: number = 0;
}