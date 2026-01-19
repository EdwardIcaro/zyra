export interface BuffEffect {
  hpBonus?: number;
  damageBonus?: number;
  defenseBonus?: number;
  speedBonus?: number;
  expBonus?: number;
  goldBonus?: number;
  attackSpeedBonus?: number;
  critChanceBonus?: number;
  effectType?: 'dot';
  damagePerTick?: number;
  tickInterval?: number;
}

export interface BuffConfig {
  id: string;
  name: string;
  description: string;
  duration: number; // -1 = permanente, em ms
  stackable: boolean;
  maxStacks: number;
  effects: BuffEffect;
  visualColor: number;
}
