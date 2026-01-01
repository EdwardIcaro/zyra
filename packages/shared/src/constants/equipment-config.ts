import { EquipmentData, EquipmentType } from '../types/equipment';
import { EquipSlot } from '../types/enums';

export const EQUIPMENT_DATABASE: Record<string, EquipmentData> = {
  // ==================== WEAPONS ====================
  
  'weapon_iron_sword': {
    id: 'weapon_iron_sword',
    name: 'Iron Sword',
    description: 'A basic iron sword for warriors',
    type: EquipmentType.SWORD,
    slot: EquipSlot.WEAPON,
    rarity: 'common',
    stats: { damage: 15, strength: 5 },
    requirements: { level: 1, strength: 10 },
    icon: '⚔️'
  },

  'weapon_blood_blade': {
    id: 'weapon_blood_blade',
    name: 'Blood Blade',
    description: 'A crimson sword forged in blood',
    type: EquipmentType.SWORD,
    slot: EquipSlot.WEAPON,
    rarity: 'rare',
    stats: { damage: 35, strength: 12, maxHp: 20 },
    requirements: { level: 10, strength: 25 },
    icon: '🗡️'
  },

  'weapon_apprentice_staff': {
    id: 'weapon_apprentice_staff',
    name: 'Apprentice Staff',
    description: 'A wooden staff for beginner mages',
    type: EquipmentType.STAFF,
    slot: EquipSlot.WEAPON,
    rarity: 'common',
    stats: { damage: 8, intelligence: 8, maxMana: 20 },
    requirements: { level: 1, intelligence: 10 },
    icon: '🪄'
  },

  'weapon_ink_staff': {
    id: 'weapon_ink_staff',
    name: 'Ink Staff',
    description: 'A staff channeling the power of ink',
    type: EquipmentType.STAFF,
    slot: EquipSlot.WEAPON,
    rarity: 'epic',
    stats: { damage: 25, intelligence: 20, maxMana: 50, critChance: 10 },
    requirements: { level: 15, intelligence: 40 },
    icon: '🖋️'
  },

  'weapon_hunting_bow': {
    id: 'weapon_hunting_bow',
    name: 'Hunting Bow',
    description: 'A reliable bow for hunting',
    type: EquipmentType.BOW,
    slot: EquipSlot.WEAPON,
    rarity: 'common',
    stats: { damage: 12, dexterity: 6, critChance: 5 },
    requirements: { level: 1, dexterity: 10 },
    icon: '🏹'
  },

  'weapon_shadow_bow': {
    id: 'weapon_shadow_bow',
    name: 'Shadow Bow',
    description: 'A bow crafted from shadows',
    type: EquipmentType.BOW,
    slot: EquipSlot.WEAPON,
    rarity: 'legendary',
    stats: { damage: 40, dexterity: 25, critChance: 25, critDamage: 50 },
    requirements: { level: 20, dexterity: 50 },
    icon: '🏹'
  },

  'weapon_rusty_dagger': {
    id: 'weapon_rusty_dagger',
    name: 'Rusty Dagger',
    description: 'A worn dagger',
    type: EquipmentType.DAGGER,
    slot: EquipSlot.WEAPON,
    rarity: 'common',
    stats: { damage: 10, dexterity: 5, attackSpeed: 10 },
    requirements: { level: 1, dexterity: 8 },
    icon: '🗡️'
  },

  // ==================== ARMOR ====================

  'armor_leather_chest': {
    id: 'armor_leather_chest',
    name: 'Leather Armor',
    description: 'Basic leather protection',
    type: EquipmentType.ARMOR,
    slot: EquipSlot.CHEST,
    rarity: 'common',
    stats: { defense: 8, maxHp: 15 },
    requirements: { level: 1 },
    icon: '🦺'
  },

  'armor_ink_chest': {
    id: 'armor_ink_chest',
    name: 'Ink Armor',
    description: 'Armor infused with magical ink',
    type: EquipmentType.ARMOR,
    slot: EquipSlot.CHEST,
    rarity: 'epic',
    stats: { defense: 25, maxHp: 50, maxMana: 30, intelligence: 10 },
    requirements: { level: 15 },
    icon: '🦺'
  },

  // ==================== HELMETS ====================

  'helmet_iron': {
    id: 'helmet_iron',
    name: 'Iron Helmet',
    description: 'Standard iron protection',
    type: EquipmentType.HELMET,
    slot: EquipSlot.HEAD,
    rarity: 'common',
    stats: { defense: 5, maxHp: 10 },
    requirements: { level: 3 },
    icon: '⛑️'
  },

  'helmet_blood': {
    id: 'helmet_blood',
    name: 'Blood Helmet',
    description: 'A helmet stained with blood',
    type: EquipmentType.HELMET,
    slot: EquipSlot.HEAD,
    rarity: 'rare',
    stats: { defense: 15, maxHp: 30, strength: 8 },
    requirements: { level: 12 },
    icon: '⛑️'
  },

  // ==================== LEGS ====================

  'legs_cloth': {
    id: 'legs_cloth',
    name: 'Cloth Pants',
    description: 'Simple cloth leg protection',
    type: EquipmentType.PANTS,
    slot: EquipSlot.LEGS,
    rarity: 'common',
    stats: { defense: 3, maxMana: 10 },
    requirements: { level: 1 },
    icon: '👖'
  },

  'legs_shadow': {
    id: 'legs_shadow',
    name: 'Shadow Leggings',
    description: 'Leggings woven from shadows',
    type: EquipmentType.PANTS,
    slot: EquipSlot.LEGS,
    rarity: 'epic',
    stats: { defense: 18, dexterity: 15, moveSpeed: 15 },
    requirements: { level: 18 },
    icon: '👖'
  },

  // ==================== ACCESSORIES ====================

  'ring_strength': {
    id: 'ring_strength',
    name: 'Ring of Strength',
    description: 'Increases physical power',
    type: EquipmentType.RING,
    slot: EquipSlot.RING1,
    rarity: 'uncommon',
    stats: { strength: 10, damage: 5 },
    requirements: { level: 5 },
    icon: '💍'
  },

  'ring_intelligence': {
    id: 'ring_intelligence',
    name: 'Ring of Intelligence',
    description: 'Increases magical power',
    type: EquipmentType.RING,
    slot: EquipSlot.RING1,
    rarity: 'uncommon',
    stats: { intelligence: 12, maxMana: 25 },
    requirements: { level: 5 },
    icon: '💍'
  },

  'necklace_hp': {
    id: 'necklace_hp',
    name: 'Necklace of Vitality',
    description: 'Grants increased health',
    type: EquipmentType.NECKLACE,
    slot: EquipSlot.AMULET,
    rarity: 'rare',
    stats: { maxHp: 50, vitality: 15 },
    requirements: { level: 8 },
    icon: '📿'
  },

  'boots_speed': {
    id: 'boots_speed',
    name: 'Boots of Speed',
    description: 'Lightweight boots',
    type: EquipmentType.BOOTS,
    slot: EquipSlot.BOOTS,
    rarity: 'uncommon',
    stats: { moveSpeed: 20, dexterity: 8 },
    requirements: { level: 6 },
    icon: '👢'
  }
};

export function getEquipmentData(itemId: string): EquipmentData | null {
  return EQUIPMENT_DATABASE[itemId] || null;
}

export function isEquipment(itemId: string): boolean {
  return itemId in EQUIPMENT_DATABASE;
}

export function canEquip(
  itemId: string,
  playerLevel: number,
  playerStats: {
    strength: number;
    dexterity: number;
    intelligence: number;
  },
  playerClass?: string
): boolean {
  const equipment = getEquipmentData(itemId);
  if (!equipment) return false;

  const req = equipment.requirements;

  if (playerLevel < req.level) return false;
  if (req.strength && playerStats.strength < req.strength) return false;
  if (req.dexterity && playerStats.dexterity < req.dexterity) return false;
  if (req.intelligence && playerStats.intelligence < req.intelligence) return false;
  if (req.classTypes && playerClass && !req.classTypes.includes(playerClass)) return false;

  return true;
}