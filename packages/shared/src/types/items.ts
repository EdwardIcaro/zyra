import { ItemRarity, ItemType, EquipSlot, StatType } from './enums';

export interface ItemStats {
  [StatType.STRENGTH]?: number;
  [StatType.DEXTERITY]?: number;
  [StatType.INTELLIGENCE]?: number;
  [StatType.VITALITY]?: number;
  [StatType.LUCK]?: number;
  damage?: number;
  defense?: number;
  critChance?: number;
  critDamage?: number;
}

export interface ItemConfig {
  id: string;
  name: string;
  description: string;
  rarity: ItemRarity;
  type: ItemType;
  slot?: EquipSlot;
  level: number;
  stats: ItemStats;
  stackable: boolean;
  maxStack: number;
  sellValue: number;
  icon?: string;
}