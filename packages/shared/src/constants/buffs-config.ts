import { BuffConfig } from '../types/buffs';

export const BUFFS: Record<string, BuffConfig> = {
  blessing_of_exp: {
    id: 'blessing_of_exp',
    name: 'Blessing of Experience',
    description: '+50% Experience gain',
    duration: 3600000, // 1 hora
    stackable: false,
    maxStacks: 1,
    effects: {
      expBonus: 50
    },
    visualColor: 0xffd700
  },
  
  goddess_of_war: {
    id: 'goddess_of_war',
    name: 'Goddess of War',
    description: 'Dominate the battlefield with increased power',
    duration: -1, // Permanente enquanto dominar área
    stackable: false,
    maxStacks: 1,
    effects: {
      damageBonus: 30,
      attackSpeedBonus: 20,
      defenseBonus: 15
    },
    visualColor: 0xff0000
  },
  
  merchant_fortune: {
    id: 'merchant_fortune',
    name: "Merchant's Fortune",
    description: 'Increased gold and item drops',
    duration: 1800000, // 30 minutos
    stackable: false,
    maxStacks: 1,
    effects: {
      goldBonus: 50
    },
    visualColor: 0xffd700
  },
  
  battle_frenzy: {
    id: 'battle_frenzy',
    name: 'Battle Frenzy',
    description: 'Rapid attacks at the cost of defense',
    duration: 300000, // 5 minutos
    stackable: false,
    maxStacks: 1,
    effects: {
      attackSpeedBonus: 40,
      speedBonus: 25,
      defenseBonus: -10
    },
    visualColor: 0xff4400
  },
  
  iron_skin: {
    id: 'iron_skin',
    name: 'Iron Skin',
    description: 'Greatly increased defense',
    duration: 600000, // 10 minutos
    stackable: false,
    maxStacks: 1,
    effects: {
      defenseBonus: 50,
      hpBonus: 20,
      speedBonus: -10
    },
    visualColor: 0x888888
  },
  
  mana_surge: {
    id: 'mana_surge',
    name: 'Mana Surge',
    description: 'Overwhelming magical power',
    duration: 600000, // 10 minutos
    stackable: false,
    maxStacks: 1,
    effects: {
      damageBonus: 25
    },
    visualColor: 0x4488ff
  }
};