export const INITIAL_MONSTERS = [
  {
    id: 'ink_slime',
    name: 'Ink Slime',
    level: 1,
    type: 'passive',
    maxHp: 30,
    damage: 5,
    defense: 0,
    speed: 0.5,
    aggroRange: 0, // Passivo não agro
    chaseRange: 0,
    attackRange: 30,
    attackSpeed: 1.0,
    color: 0x2d1b3d,
    size: 18,
    experienceGrant: 10,
    goldGrant: { min: 1, max: 3 }
  },
  
  {
    id: 'blood_wolf',
    name: 'Blood Wolf',
    level: 5,
    type: 'aggressive',
    maxHp: 80,
    damage: 15,
    defense: 5,
    speed: 2.0,
    aggroRange: 300, // Detecta player a 300px
    chaseRange: 600, // Persegue até 600px
    attackRange: 40,
    attackSpeed: 1.5,
    color: 0x8b1a1a,
    size: 22,
    experienceGrant: 25,
    goldGrant: { min: 5, max: 12 }
  },
  
  {
    id: 'ink_guardian',
    name: 'Ink Guardian',
    level: 10,
    type: 'aggressive',
    maxHp: 200,
    damage: 30,
    defense: 15,
    speed: 1.5,
    aggroRange: 400,
    chaseRange: 800,
    attackRange: 50,
    attackSpeed: 1.2,
    color: 0x1a1a3d,
    size: 30,
    experienceGrant: 50,
    goldGrant: { min: 15, max: 30 }
  },
  
  {
    id: 'crimson_drake',
    name: 'Crimson Drake',
    level: 25,
    type: 'boss',
    maxHp: 1500,
    damage: 80,
    defense: 40,
    speed: 1.8,
    aggroRange: 500,
    chaseRange: 1000,
    attackRange: 100,
    attackSpeed: 0.8,
    color: 0xff1a1a,
    size: 50,
    experienceGrant: 500,
    goldGrant: { min: 100, max: 200 }
  }
];