// packages/shared/src/types/equipment.ts

import { EquipSlot } from './enums';

export enum EquipmentType {
  HELMET = 'helmet',
  ARMOR = 'armor',
  PANTS = 'pants',
  GLOVES = 'gloves',
  BOOTS = 'boots',
  SWORD = 'sword',
  STAFF = 'staff',
  BOW = 'bow',
  DAGGER = 'dagger',
  SHIELD = 'shield',
  RING = 'ring',
  NECKLACE = 'necklace',
  BELT = 'belt',
  CAPE = 'cape'
}

export interface EquipmentStats {
  damage?: number;
  defense?: number;
  maxHp?: number;
  maxMana?: number;
  strength?: number;
  dexterity?: number;
  intelligence?: number;
  vitality?: number;
  critChance?: number;
  critDamage?: number;
  attackSpeed?: number;
  moveSpeed?: number;
}

export interface EquipmentRequirements {
  level: number;
  strength?: number;
  dexterity?: number;
  intelligence?: number;
  classTypes?: string[];
}

export interface EquipmentData {
  id: string;
  name: string;
  description: string;
  type: EquipmentType;
  slot: EquipSlot; // Usando EquipSlot do enums.ts
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  stats: EquipmentStats;
  requirements: EquipmentRequirements;
  icon: string;
  sprite?: string;
}

// Mapeamento de tipo para slot
export const EQUIPMENT_SLOT_MAP: Record<EquipmentType, EquipSlot> = {
  [EquipmentType.HELMET]: EquipSlot.HEAD,
  [EquipmentType.ARMOR]: EquipSlot.CHEST,
  [EquipmentType.PANTS]: EquipSlot.LEGS,
  [EquipmentType.GLOVES]: EquipSlot.LEGS, // Temporário (seu enum não tem HANDS)
  [EquipmentType.BOOTS]: EquipSlot.BOOTS,
  [EquipmentType.SWORD]: EquipSlot.WEAPON,
  [EquipmentType.STAFF]: EquipSlot.WEAPON,
  [EquipmentType.BOW]: EquipSlot.WEAPON,
  [EquipmentType.DAGGER]: EquipSlot.WEAPON,
  [EquipmentType.SHIELD]: EquipSlot.WEAPON, // Offhand não existe no seu enum
  [EquipmentType.RING]: EquipSlot.RING1,
  [EquipmentType.NECKLACE]: EquipSlot.AMULET,
  [EquipmentType.BELT]: EquipSlot.CHEST, // Temporário (seu enum não tem BELT)
  [EquipmentType.CAPE]: EquipSlot.CHEST // Temporário (seu enum não tem CAPE)
};