import { ClassType } from './enums';

export interface ClassConfig {
  type: ClassType;
  name: string;
  description: string;
  color: string;
  baseStats: {
    maxHp: number;
    maxMana: number;
    strength: number;
    dexterity: number;
    intelligence: number;
    vitality: number;
  };
  combat: {
    attackRange: number;
    attackSpeed: number;
    baseDamage: number;
    isRanged: boolean;
    projectileSpeed?: number;
  };
  movement: {
    baseSpeed: number;
  };
}
