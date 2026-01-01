import { ItemRarity, ItemType, EquipSlot, StatType } from '../types/enums';
import type { ItemConfig } from '../types/items';

export const ITEMS: Record<string, ItemConfig> = {
  // Materials
  'mat_ink': {
    id: 'mat_ink',
    name: 'Ink',
    description: 'Raw ink essence. Used for crafting.',
    rarity: ItemRarity.COMMON,
    type: ItemType.MATERIAL,
    level: 1,
    stats: {},
    stackable: true,
    maxStack: 999,
    sellValue: 1
  },
  
  'mat_blood': {
    id: 'mat_blood',
    name: 'Blood',
    description: 'Crimson blood essence. Rare crafting material.',
    rarity: ItemRarity.RARE,
    type: ItemType.MATERIAL,
    level: 1,
    stats: {},
    stackable: true,
    maxStack: 999,
    sellValue: 10
  },
  
  // Weapons
  'weapon_ink_blade': {
    id: 'weapon_ink_blade',
    name: 'Ink Blade',
    description: 'A blade forged from solidified ink.',
    rarity: ItemRarity.COMMON,
    type: ItemType.WEAPON,
    slot: EquipSlot.WEAPON,
    level: 1,
    stats: {
      damage: 10,
      [StatType.STRENGTH]: 2
    },
    stackable: false,
    maxStack: 1,
    sellValue: 25
  },
  
  'weapon_blood_staff': {
    id: 'weapon_blood_staff',
    name: 'Blood Staff',
    description: 'A staff pulsing with crimson energy.',
    rarity: ItemRarity.RARE,
    type: ItemType.WEAPON,
    slot: EquipSlot.WEAPON,
    level: 10,
    stats: {
      damage: 35,
      [StatType.INTELLIGENCE]: 12,
      critChance: 5
    },
    stackable: false,
    maxStack: 1,
    sellValue: 250
  }
};