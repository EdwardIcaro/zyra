// packages/shared/src/schema/PlayerState.ts

import { Schema, type, MapSchema } from '@colyseus/schema';
import { ClassType } from '../types/enums';
import { BuffState } from './BuffState';
import { InventoryState } from './InventoryState';
import { EquipmentState } from './EquipmentState';

export class PlayerState extends Schema {
  @type('string') playerId!: string;
  @type('string') username!: string;
  @type('string') classType!: ClassType;
  
  // ==================== VISUAL CONFIG ====================
  // Sprites
  @type('string') visualBody: string = 'ball_red';
  @type('string') visualFace: string = 'eyes_determined';
  @type('string') visualHat: string = 'none';
  
  // Face (Olhos) - Offsets
  @type('number') faceOffsetX: number = 0;
  @type('number') faceOffsetY: number = 5;
  @type('number') faceScale: number = 1.0;
  @type('number') faceRotation: number = 0;
  @type('number') faceWidth: number = 35;
  @type('number') faceHeight: number = 18;
  
  // Hat (Chapéu) - Offsets
  @type('number') hatOffsetX: number = 0;
  @type('number') hatOffsetY: number = -20;
  @type('number') hatScale: number = 1.0;
  @type('number') hatRotation: number = 0;
  @type('number') hatWidth: number = 60;
  @type('number') hatHeight: number = 45;
  
  // Position
  @type('number') x: number = 0;
  @type('number') y: number = 0;
  
  // Progression
  @type('number') level: number = 1;
  @type('number') experience: number = 0;
  @type('number') experienceToNext: number = 100;
  
  // Health & Mana (Current)
  @type('number') currentHp: number = 100;
  @type('number') currentMana: number = 50;
  
  // ==================== BASE STATS (SEM EQUIPAMENTOS) ====================
  @type('number') baseMaxHp: number = 100;
  @type('number') baseMaxMana: number = 50;
  @type('number') baseStrength: number = 10;
  @type('number') baseDexterity: number = 10;
  @type('number') baseIntelligence: number = 10;
  @type('number') baseVitality: number = 10;
  @type('number') baseLuck: number = 5;
  @type('number') baseDamage: number = 10;
  @type('number') baseDefense: number = 0;
  @type('number') baseCritChance: number = 5;
  @type('number') baseCritDamage: number = 150;
  @type('number') baseAttackSpeed: number = 100;
  @type('number') baseMoveSpeed: number = 100;
  
  // ==================== FINAL STATS (BASE + EQUIPAMENTOS) ====================
  @type('number') maxHp: number = 100;
  @type('number') maxMana: number = 50;
  @type('number') strength: number = 10;
  @type('number') dexterity: number = 10;
  @type('number') intelligence: number = 10;
  @type('number') vitality: number = 10;
  @type('number') luck: number = 5;
  @type('number') damage: number = 10;
  @type('number') defense: number = 0;
  @type('number') critChance: number = 5;
  @type('number') critDamage: number = 150;
  @type('number') attackSpeed: number = 100;
  @type('number') moveSpeed: number = 100;
  
  // State
  @type('boolean') isAlive: boolean = true;
  @type('number') respawnTime: number = 0;
  
  // Buffs
  @type({ map: BuffState }) buffs = new MapSchema<BuffState>();
  
  // Inventory
  @type(InventoryState) inventory: InventoryState = new InventoryState();
  
  // Equipment
  @type(EquipmentState) equipment: EquipmentState = new EquipmentState();
  
  // Gold
  @type('number') gold: number = 0;
}