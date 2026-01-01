import { ZoneConfig } from '../types/zones';

export const ZONES: Record<string, ZoneConfig> = {
  bleeding_plains: {
    id: 'bleeding_plains',
    name: 'Bleeding Plains',
    description: 'A vast plain stained with ink and blood.',
    biome: 'plains',
    levelRange: { min: 1, max: 10 },
    size: { width: 3200, height: 2400 },
    backgroundColor: 0xf4e4bc,
    isPvP: false,
    isDomainable: false
  },
  
  inkwell_forest: {
    id: 'inkwell_forest',
    name: 'Inkwell Forest',
    description: 'A dark forest where ink flows like water.',
    biome: 'forest',
    levelRange: { min: 11, max: 20 },
    size: { width: 4000, height: 3000 },
    backgroundColor: 0x2d4a2f,
    isPvP: false,
    isDomainable: false
  },
  
  crimson_desert: {
    id: 'crimson_desert',
    name: 'Crimson Desert',
    description: 'A scorching desert where blood sand never settles.',
    biome: 'desert',
    levelRange: { min: 21, max: 30 },
    size: { width: 5000, height: 3500 },
    backgroundColor: 0xd4a574,
    isPvP: false,
    isDomainable: false
  },
  
  shadow_marsh: {
    id: 'shadow_marsh',
    name: 'Shadow Marsh',
    description: 'A dangerous swamp filled with dark creatures.',
    biome: 'marsh',
    levelRange: { min: 31, max: 40 },
    size: { width: 4500, height: 3200 },
    backgroundColor: 0x3a4a3a,
    isPvP: false,
    isDomainable: false
  },
  
  void_mountains: {
    id: 'void_mountains',
    name: 'Void Mountains',
    description: 'The highest peaks where reality breaks.',
    biome: 'mountain',
    levelRange: { min: 41, max: 50 },
    size: { width: 6000, height: 4000 },
    backgroundColor: 0x4a4a5a,
    isPvP: false,
    isDomainable: false
  }
};
