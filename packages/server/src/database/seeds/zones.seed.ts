export const INITIAL_ZONES = [
  {
    id: 'bleeding_pages',
    name: 'The Bleeding Pages',
    displayName: 'The Bleeding Pages',
    biome: 'forest',
    levelRange: { min: 1, max: 10 },
    width: 3200,
    height: 2400,
    backgroundColor: 0xf4e4bc,
    isPvPEnabled: false,
    isDominationZone: false,
    description: 'A starting area where ink flows like water'
  },
  
  {
    id: 'inkwell_desert',
    name: 'Inkwell Desert',
    displayName: 'Inkwell Desert',
    biome: 'desert',
    levelRange: { min: 11, max: 20 },
    width: 4000,
    height: 3000,
    backgroundColor: 0xe8d4a0,
    isPvPEnabled: false,
    isDominationZone: false,
    description: 'Vast dunes of dried ink'
  },
  
  {
    id: 'crimson_swamp',
    name: 'Crimson Swamp',
    displayName: 'Crimson Swamp',
    biome: 'swamp',
    levelRange: { min: 21, max: 30 },
    width: 3500,
    height: 2800,
    backgroundColor: 0x4a2c2a,
    isPvPEnabled: false,
    isDominationZone: false,
    description: 'Where blood pools in ancient marshes'
  },
  
  {
    id: 'blood_valley',
    name: 'Blood Valley',
    displayName: 'Blood Valley (PvP)',
    biome: 'mountain',
    levelRange: { min: 25, max: 35 },
    width: 4500,
    height: 3500,
    backgroundColor: 0x2a1a1a,
    isPvPEnabled: true,
    isDominationZone: true, // Pode ser dominada
    description: 'A dangerous valley where the strongest prevail'
  }
];