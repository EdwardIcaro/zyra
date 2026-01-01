export type BiomeType = 'plains' | 'forest' | 'desert' | 'marsh' | 'mountain';
export type MonsterType = 'beast' | 'undead' | 'demon' | 'elemental' | 'humanoid';
export type AggroType = 'passive' | 'aggressive' | 'defensive';

export interface ZoneConfig {
  id: string;
  name: string;
  description: string;
  biome: BiomeType;
  levelRange: { min: number; max: number };
  size: { width: number; height: number };
  backgroundColor: number;
  isPvP: boolean;
  isDomainable: boolean;
}

export interface MonsterDrop {
    itemId: string;
    chance: number;
    min?: number;
    max?: number;
}

export interface MonsterTemplate {
  id: string;
  name: string;
  type: MonsterType;
  level: number;
  
  
  appearance: {
    color: number;
    size: number;
  };
  
  stats: {
    maxHp: number;
    damage: number;
    defense: number;
    speed: number;
    attackRange: number;
  };
  
  behavior: {
    aggroType: AggroType;
    aggroRange: number;
    leashRange: number;
    respawnTime: number;
  };
  
  rewards: {
    baseExp: number;
    goldMin: number;
    goldMax: number;
    drops?: MonsterDrop[];
  };
}

export interface SpawnPoint {
  id: string;
  monsterId: string;
  x: number;
  y: number;
  respawnTime: number;
}