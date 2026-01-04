export enum ClassType {
  WARRIOR = 'warrior',
  MAGE = 'mage',
  ARCHER = 'archer',
  ASSASSIN = 'assassin',
  CLERIC = 'cleric'
}

export enum ItemRarity {
  COMMON = 'common',
  UNCOMMON = 'uncommon',
  RARE = 'rare',
  EPIC = 'epic',
  LEGENDARY = 'legendary'
}

export enum ItemType {
  WEAPON = 'weapon',
  ARMOR = 'armor',
  ACCESSORY = 'accessory',
  CONSUMABLE = 'consumable',
  MATERIAL = 'material'
}

// ✅ ESTE ENUM JÁ ESTÁ CORRETO NO DOCUMENTO ORIGINAL
export enum EquipSlot {
  WEAPON = 'weapon',
  HEAD = 'head',
  CHEST = 'chest',
  LEGS = 'legs',
  BOOTS = 'boots',
  RING1 = 'ring1',
  RING2 = 'ring2',
  AMULET = 'amulet'
}

export enum StatType {
  STRENGTH = 'strength',
  DEXTERITY = 'dexterity',
  INTELLIGENCE = 'intelligence',
  VITALITY = 'vitality',
  LUCK = 'luck'
}

// Novo: Labels amigáveis para UI
export const EQUIP_SLOT_LABELS: Record<EquipSlot, string> = {
  [EquipSlot.WEAPON]: 'Weapon',
  [EquipSlot.HEAD]: 'Head',
  [EquipSlot.CHEST]: 'Armor',    // ← UI mostra "Armor"
  [EquipSlot.LEGS]: 'Legs',
  [EquipSlot.BOOTS]: 'Boots',
  [EquipSlot.RING1]: 'Ring',
  [EquipSlot.RING2]: 'Ring',
  [EquipSlot.AMULET]: 'Neck'     // ← UI mostra "Neck"
};