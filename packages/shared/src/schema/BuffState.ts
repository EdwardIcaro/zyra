import { Schema, type } from '@colyseus/schema';

export class BuffState extends Schema {
  @type('string') id!: string;
  @type('string') buffId!: string;
  @type('number') stacks: number = 1;
  @type('number') startedAt: number = 0;
  @type('number') expiresAt: number = 0;
}