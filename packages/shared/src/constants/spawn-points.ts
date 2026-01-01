import { SpawnPoint } from '../types/zones';

export const SPAWN_POINTS: Record<string, SpawnPoint[]> = {
  bleeding_plains: [
    // Ink Slimes (20 spawns)
    { id: 'bp_slime_1', monsterId: 'ink_slime', x: 400, y: 400, respawnTime: 30 },
    { id: 'bp_slime_2', monsterId: 'ink_slime', x: 800, y: 600, respawnTime: 30 },
    { id: 'bp_slime_3', monsterId: 'ink_slime', x: 1200, y: 400, respawnTime: 30 },
    { id: 'bp_slime_4', monsterId: 'ink_slime', x: 1600, y: 800, respawnTime: 30 },
    { id: 'bp_slime_5', monsterId: 'ink_slime', x: 2000, y: 600, respawnTime: 30 },
    // ... mais 15 spawns
    
    // Blood Bats (10 spawns)
    { id: 'bp_bat_1', monsterId: 'blood_bat', x: 600, y: 300, respawnTime: 45 },
    { id: 'bp_bat_2', monsterId: 'blood_bat', x: 1000, y: 700, respawnTime: 45 },
    { id: 'bp_bat_3', monsterId: 'blood_bat', x: 1400, y: 500, respawnTime: 45 },
    // ... mais 7 spawns
  ],
  
  inkwell_forest: [
    // Dark Wolves (15 spawns)
    { id: 'if_wolf_1', monsterId: 'dark_wolf', x: 500, y: 500, respawnTime: 60 },
    { id: 'if_wolf_2', monsterId: 'dark_wolf', x: 1000, y: 800, respawnTime: 60 },
    // ... mais spawns
    
    // Ink Treants (5 spawns - mini-bosses)
    { id: 'if_treant_1', monsterId: 'ink_treant', x: 2000, y: 1500, respawnTime: 90 },
    // ... mais spawns
  ],
  
  crimson_desert: [
    // Blood Scorpions (20 spawns)
    { id: 'cd_scorp_1', monsterId: 'blood_scorpion', x: 800, y: 600, respawnTime: 120 },
    // ... mais spawns
    
    // Sand Golems (8 spawns)
    { id: 'cd_golem_1', monsterId: 'sand_golem', x: 2500, y: 1800, respawnTime: 180 },
    // ... mais spawns
  ]
};