import { Schema, type, MapSchema } from '@colyseus/schema';

export class InventorySlot extends Schema {
  @type('string') itemId: string = ''; // ID do template
  @type('number') quantity: number = 0;
  @type('number') slotIndex: number = 0;
  @type('boolean') equipped: boolean = false;
}

export class InventoryState extends Schema {
  @type({ map: InventorySlot }) slots = new MapSchema<InventorySlot>();
  @type('number') maxSlots: number = 40; // 5x8 grid
}