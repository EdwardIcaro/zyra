import { Schema, type } from '@colyseus/schema';

export class ZoneTileState extends Schema {
  @type('string') layer: string = 'ground';
  @type('string') tilePath: string = '';
  @type('number') x: number = 0;
  @type('number') y: number = 0;
}
