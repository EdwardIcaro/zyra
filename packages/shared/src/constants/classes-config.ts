import { ClassType } from '../types/enums';
import type { ClassConfig } from '../types/classes';

export const CLASSES: Record<ClassType, ClassConfig> = {
  [ClassType.WARRIOR]: {
    type: ClassType.WARRIOR,
    name: 'Warrior',
    description: 'A melee tank with high HP and lifesteal',
    color: '#c44',
    baseStats: {
      maxHp: 150,
      maxMana: 50,
      strength: 15,
      dexterity: 8,
      intelligence: 5,
      vitality: 18
    },
    combat: {
      attackRange: 70,
      attackSpeed: 1.2,
      baseDamage: 45,
      isRanged: false
    },
    movement: {
      baseSpeed: 4.0
    }
  },
  
  [ClassType.MAGE]: {
    type: ClassType.MAGE,
    name: 'Mage',
    description: 'A ranged caster with powerful AOE spells',
    color: '#44f',
    baseStats: {
      maxHp: 80,
      maxMana: 150,
      strength: 5,
      dexterity: 8,
      intelligence: 20,
      vitality: 10
    },
    combat: {
      attackRange: 999,
      attackSpeed: 0.8,
      baseDamage: 22,
      isRanged: true,
      projectileSpeed: 12
    },
    movement: {
      baseSpeed: 4.2
    }
  },
  
  [ClassType.ARCHER]: {
    type: ClassType.ARCHER,
    name: 'Archer',
    description: 'A ranged DPS with high critical chance',
    color: '#4c4',
    baseStats: {
      maxHp: 100,
      maxMana: 80,
      strength: 8,
      dexterity: 18,
      intelligence: 8,
      vitality: 12
    },
    combat: {
      attackRange: 999,
      attackSpeed: 1.5,
      baseDamage: 16,
      isRanged: true,
      projectileSpeed: 15
    },
    movement: {
      baseSpeed: 5.0
    }
  },
  
  [ClassType.ASSASSIN]: {
    type: ClassType.ASSASSIN,
    name: 'Assassin',
    description: 'A melee burst damage dealer with stealth',
    color: '#848',
    baseStats: {
      maxHp: 90,
      maxMana: 100,
      strength: 12,
      dexterity: 20,
      intelligence: 10,
      vitality: 10
    },
    combat: {
      attackRange: 85,
      attackSpeed: 2.0,
      baseDamage: 35,
      isRanged: false
    },
    movement: {
      baseSpeed: 5.5
    }
  },
  
  [ClassType.CLERIC]: {
    type: ClassType.CLERIC,
    name: 'Cleric',
    description: 'A support class with healing abilities',
    color: '#fc4',
    baseStats: {
      maxHp: 110,
      maxMana: 120,
      strength: 8,
      dexterity: 10,
      intelligence: 15,
      vitality: 15
    },
    combat: {
      attackRange: 300,
      attackSpeed: 1.0,
      baseDamage: 18,
      isRanged: true,
      projectileSpeed: 10
    },
    movement: {
      baseSpeed: 4.3
    }
  }
};