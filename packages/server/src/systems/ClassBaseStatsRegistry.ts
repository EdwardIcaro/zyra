import { CLASSES, type ClassType } from '@zyra/shared';

export interface ClassBaseStats {
  classType: ClassType;
  maxHp: number;
  maxMana: number;
  strength: number;
  dexterity: number;
  intelligence: number;
  vitality: number;
  luck: number;
  baseDamage: number;
  baseDefense: number;
  attackSpeed: number;
  moveSpeed: number;
}

export class ClassBaseStatsRegistry {
  private static templates = new Map<ClassType, ClassBaseStats>();

  static setTemplates(rows: any[]) {
    this.templates.clear();
    rows.forEach(row => {
      this.templates.set(row.class_type as ClassType, {
        classType: row.class_type,
        maxHp: row.max_hp ?? 100,
        maxMana: row.max_mana ?? 50,
        strength: row.strength ?? 10,
        dexterity: row.dexterity ?? 10,
        intelligence: row.intelligence ?? 10,
        vitality: row.vitality ?? 10,
        luck: row.luck ?? 5,
        baseDamage: row.base_damage ?? 10,
        baseDefense: row.base_defense ?? 0,
        attackSpeed: row.attack_speed ?? 1.0,
        moveSpeed: row.move_speed ?? 4.0
      });
    });
  }

  static get(classType: ClassType): ClassBaseStats {
    const fromDb = this.templates.get(classType);
    if (fromDb) return fromDb;

    const fallback = CLASSES[classType];
    return {
      classType,
      maxHp: fallback.baseStats.maxHp,
      maxMana: fallback.baseStats.maxMana,
      strength: fallback.baseStats.strength,
      dexterity: fallback.baseStats.dexterity,
      intelligence: fallback.baseStats.intelligence,
      vitality: fallback.baseStats.vitality,
      luck: 5,
      baseDamage: fallback.combat.baseDamage,
      baseDefense: 0,
      attackSpeed: fallback.combat.attackSpeed,
      moveSpeed: fallback.movement.baseSpeed
    };
  }
}
