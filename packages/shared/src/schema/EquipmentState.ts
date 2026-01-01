// packages/shared/src/schema/EquipmentState.ts

import { Schema, type, MapSchema } from '@colyseus/schema';

export class EquippedItem extends Schema {
  @type('string') itemId: string = '';
  @type('string') slot: string = ''; // head, chest, weapon, etc.
}

export class EquipmentState extends Schema {
  @type({ map: EquippedItem }) 
  equipped = new MapSchema<EquippedItem>();

  // Os 12 slots possíveis são:
  // - head
  // - chest
  // - legs
  // - hands
  // - feet
  // - weapon
  // - offhand
  // - ring1
  // - ring2
  // - necklace
  // - belt
  // - cape
}