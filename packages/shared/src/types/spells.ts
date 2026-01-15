export enum SpellType {
  FIREBALL = 'fireball',         // ○ Círculo
  LIGHTNING = 'lightning',        // ⚡ Zigue-zague
  SHIELD = 'shield',              // △ Triângulo
  ICE_LANCE = 'ice_lance',        // | Linha vertical
  BASIC_ATTACK = 'basic_attack'   // — Corte horizontal (melee básico)
}

export interface SpellConfig {
  id: SpellType;
  name: string;
  description: string;
  gesture: string; // Visual do gesto (para tutorial)
  
  // Dano e Efeitos
  baseDamage: number;
  damageType: 'magic' | 'physical';
  aoeRadius?: number;      // Se for área (0 = single target)
  duration?: number;       // Para buffs/debuffs (ms)
  
  // Custos e Cooldowns
  manaCost: number;
  cooldown: number;        // ms
  castTime: number;        // ms (0 = instantâneo)
  
  // Visuais
  projectileSpeed?: number; // pixels/frame (se tiver projétil)
  color: number;            // Cor do efeito (hex)
  particleCount: number;    // Intensidade de partículas
  
  // Requisitos
  requiresTarget: boolean;  // Precisa de inimigo selecionado
  minRange?: number;
  maxRange?: number;
}

export const SPELLS: Record<SpellType, SpellConfig> = {
  [SpellType.FIREBALL]: {
    id: SpellType.FIREBALL,
    name: 'Bola de Fogo',
    description: 'Projétil explosivo de alto dano',
    gesture: '○',
    baseDamage: 45,
    damageType: 'magic',
    aoeRadius: 60,
    manaCost: 25,
    cooldown: 3000,
    castTime: 500,
    projectileSpeed: 10,
    color: 0xff4400,
    particleCount: 20,
    requiresTarget: true,
    maxRange: 600
  },

  [SpellType.LIGHTNING]: {
    id: SpellType.LIGHTNING,
    name: 'Relâmpago',
    description: 'Ataque instantâneo de raio',
    gesture: '⚡',
    baseDamage: 30,
    damageType: 'magic',
    aoeRadius: 0,
    manaCost: 20,
    cooldown: 1500,
    castTime: 0, // Instantâneo!
    color: 0xffff00,
    particleCount: 30,
    requiresTarget: true,
    maxRange: 500
  },

  [SpellType.SHIELD]: {
    id: SpellType.SHIELD,
    name: 'Escudo Arcano',
    description: 'Barreira protetora temporária',
    gesture: '△',
    baseDamage: 0,
    damageType: 'magic',
    duration: 5000, // 5 segundos
    manaCost: 15,
    cooldown: 8000,
    castTime: 300,
    color: 0x4488ff,
    particleCount: 15,
    requiresTarget: false, // Self-cast
    maxRange: 0
  },

  [SpellType.ICE_LANCE]: {
    id: SpellType.ICE_LANCE,
    name: 'Lança de Gelo',
    description: 'Projétil perfurante congelante',
    gesture: '|',
    baseDamage: 35,
    damageType: 'magic',
    aoeRadius: 0,
    manaCost: 18,
    cooldown: 2000,
    castTime: 400,
    projectileSpeed: 15,
    color: 0x00ffff,
    particleCount: 12,
    requiresTarget: true,
    maxRange: 700
  },

  [SpellType.BASIC_ATTACK]: {
    id: SpellType.BASIC_ATTACK,
    name: 'Ataque Básico',
    description: 'Golpe corpo-a-corpo com bastão',
    gesture: '—',
    baseDamage: 15,
    damageType: 'physical',
    aoeRadius: 0,
    manaCost: 0,
    cooldown: 800,
    castTime: 0,
    color: 0xcccccc,
    particleCount: 5,
    requiresTarget: true,
    maxRange: 80 // Melee range
  }
};

// Helper para pegar config por ID
export function getSpellConfig(spellId: SpellType): SpellConfig | null {
  return SPELLS[spellId] || null;
}

// ✅ Mapeamento Gesto → Magia (EXPORTADO)
export const GESTURE_TO_SPELL: Record<string, SpellType> = {
  'circle': SpellType.FIREBALL,
  'zigzag': SpellType.LIGHTNING,
  'triangle': SpellType.SHIELD,
  'line': SpellType.ICE_LANCE,
  'slash': SpellType.BASIC_ATTACK
};

// ✅ Helper para mapear gesto string → spell
export function getSpellFromGesture(gestureType: string): SpellType | null {
  return GESTURE_TO_SPELL[gestureType] || null;
}