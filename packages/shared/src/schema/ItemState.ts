import { Schema, type } from '@colyseus/schema';
import { ItemRarity, ItemType } from '../types/enums';

export class ItemState extends Schema {
  @type('string') id!: string;
  @type('string') itemId!: string;
  @type('string') name!: string;
  @type('string') rarity!: ItemRarity;
  @type('string') type!: ItemType;
  @type('number') quantity: number = 1;
  @type('number') level: number = 1;
}