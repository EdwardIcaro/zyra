// Schemas
export * from './schema/PlayerState';
export * from './schema/CombatRoomState';
export * from './schema/WorldRoomState';
export * from './schema/ItemState';
export * from './schema/InventoryState';
export * from './schema/EnemyState';
export * from './schema/ProjectileState';
export * from './schema/BuffState';
export * from './schema/MonsterState';
export * from './schema/ZoneRoomState';
export * from './schema/DroppedItemState';
export * from './schema/EquipmentState'; // ← NOVO

// Types
export * from './types/classes';
export * from './types/items';
export * from './types/skills';
export * from './types/enums';
export * from './types/zones';
export * from './types/buffs';
export * from './types/drops';
export * from './types/equipment'; // ← NOVO

// Constants
export * from './constants/game-config';
export * from './constants/classes-config';
export * from './constants/items-config';
export * from './constants/zones-config';
//export * from './constants/monsters-config';
export * from './constants/spawn-points';
export * from './constants/buffs-config';
//export * from './constants/drop-tables';
export * from './constants/equipment-config';
export * from './constants/level-table'; // ← NOVO


// Systems (Adicione esta seção)
export * from './systems/ItemRegistry';
export * from './systems/MonsterRegistry';
export * from './systems/SkillRegistry'; // ← NOVO
export * from './systems/ZoneRegistry'; // ← NOVO
export * from './systems/BuffRegistry'; // ← NOVO

    
// Re-export Schema from colyseus
export { Schema, MapSchema, type } from '@colyseus/schema';