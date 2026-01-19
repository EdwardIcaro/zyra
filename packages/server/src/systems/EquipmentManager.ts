import { PlayerState, EquippedItem, EquipSlot } from '@zyra/shared';
import { 
  getEquipmentData, 
  canEquip, 
  ItemRegistry // ✅ ADICIONAR este import
} from '@zyra/shared';
import { BuffTemplateRegistry } from './BuffTemplateRegistry';

export class EquipmentManager {
  equipFromInventory(player: PlayerState, inventorySlotIndex: number): boolean {
    const invSlot = player.inventory.slots.get(inventorySlotIndex.toString());
    if (!invSlot) {
        console.warn(`[EquipmentManager] No item in inventory slot ${inventorySlotIndex}`);
        return false;
    }

    const itemId = invSlot.itemId;
    
    // ✅ Buscar template do ItemRegistry
    const itemTemplate = ItemRegistry.getTemplate(itemId);
    
    console.log(`[EquipmentManager] Tentando equipar "${itemId}":`, {
        found: !!itemTemplate,
        isEquipable: itemTemplate?.isEquipable,
        equipSlot: itemTemplate?.equipSlot,
        itemType: itemTemplate?.itemType
    });
    
    if (!itemTemplate) {
        console.warn(`[EquipmentManager] Item ${itemId} not found in registry`);
        return false;
    }

    // ✅ Validar se item é equipável
    if (!itemTemplate.isEquipable) {
        console.warn(`[EquipmentManager] Item ${itemId} is not equipable`);
        return false;
    }

    if (!itemTemplate.equipSlot) {
        console.warn(`[EquipmentManager] Item ${itemId} has no equipSlot`);
        return false;
    }

    // ✅ MUDANÇA: Tentar pegar do equipment-config primeiro, senão usar template
    let equipmentData = getEquipmentData(itemId);
    
    // ✅ NOVO: Se não encontrar no equipment-config, usar dados do template
    if (!equipmentData) {
        console.log(`[EquipmentManager] Using template data for ${itemId} (not in equipment-config)`);
        
        // ✅ Criar dados de equipamento a partir do template
        equipmentData = {
            id: itemTemplate.id,
            name: itemTemplate.name,
            description: itemTemplate.description || '',
            type: itemTemplate.itemType as any,
            slot: itemTemplate.equipSlot as EquipSlot,
            rarity: (itemTemplate.grade?.toLowerCase() || 'common') as any,
            stats: itemTemplate.data?.stats || {},  // ✅ Stats vem do campo 'data'
            requirements: {
                level: itemTemplate.data?.requiredLevel || 1,
                strength: itemTemplate.data?.requiredStrength,
                dexterity: itemTemplate.data?.requiredDexterity,
                intelligence: itemTemplate.data?.requiredIntelligence,
                classTypes: itemTemplate.data?.requiredClasses
            },
            icon: itemTemplate.data?.icon || '📦'
        };
    }

    // ✅ Usar equipSlot do template
    let targetSlot = itemTemplate.equipSlot as EquipSlot;

    // Caso especial: Rings
    if (targetSlot === EquipSlot.RING1 || targetSlot === EquipSlot.RING2) {
        const ring1 = player.equipment.equipped.get(EquipSlot.RING1);
        const ring2 = player.equipment.equipped.get(EquipSlot.RING2);
        
        if (!ring1) {
            targetSlot = EquipSlot.RING1;
        } else if (!ring2) {
            targetSlot = EquipSlot.RING2;
        } else {
            this.unequipToInventory(player, EquipSlot.RING1);
            targetSlot = EquipSlot.RING1;
        }
    }

    // ✅ SIMPLIFICAR verificação de requisitos (opcional por enquanto)
    // if (!canEquip(itemId, player.level, {
    //     strength: player.baseStrength,
    //     dexterity: player.baseDexterity,
    //     intelligence: player.baseIntelligence
    // }, player.classType)) {
    //     console.warn(`[EquipmentManager] Requirements not met`);
    //     return false;
    // }

    // Se slot já ocupado, desequipar
    const currentEquipped = player.equipment.equipped.get(targetSlot);
    if (currentEquipped) {
        this.unequipToInventory(player, targetSlot);
    }

    // Equipar novo item
    const equippedItem = new EquippedItem();
    equippedItem.itemId = itemId;
    equippedItem.slot = targetSlot;
    player.equipment.equipped.set(targetSlot, equippedItem);

    // Remover do inventário
    player.inventory.slots.delete(inventorySlotIndex.toString());

    // Recalcular stats
    this.recalculateStats(player);

    console.info(`[EquipmentManager] ${player.username} equipped ${itemId} in ${targetSlot}`);
    return true;
  }

  unequipToInventory(player: PlayerState, equipmentSlot: string): boolean {
    const equippedItem = player.equipment.equipped.get(equipmentSlot);
    if (!equippedItem) {
      console.warn(`[EquipmentManager] No item equipped in ${equipmentSlot}`);
      return false;
    }

    // Encontrar slot vazio
    const emptySlot = this.findEmptyInventorySlot(player);
    if (emptySlot === -1) {
      console.warn(`[EquipmentManager] Inventory full`);
      return false;
    }

    // Criar slot no inventário
    const invSlot = new (require('@zyra/shared').InventorySlot)();
    invSlot.itemId = equippedItem.itemId;
    invSlot.quantity = 1;
    invSlot.slotIndex = emptySlot;
    invSlot.equipped = false;

    player.inventory.slots.set(emptySlot.toString(), invSlot);

    // Remover do equipamento
    player.equipment.equipped.delete(equipmentSlot);

    // Recalcular stats
    this.recalculateStats(player);

    console.info(`[EquipmentManager] Unequipped ${equippedItem.itemId}`);
    return true;
  }

  recalculateStats(player: PlayerState): void {
    // Resetar para base
    player.maxHp = player.baseMaxHp;
    player.maxMana = player.baseMaxMana;
    player.strength = player.baseStrength;
    player.dexterity = player.baseDexterity;
    player.intelligence = player.baseIntelligence;
    player.vitality = player.baseVitality;
    player.luck = player.baseLuck;
    player.damage = player.baseDamage;
    player.defense = player.baseDefense;
    player.critChance = player.baseCritChance;
    player.critDamage = player.baseCritDamage;
    player.attackSpeed = player.baseAttackSpeed;
    player.moveSpeed = player.baseMoveSpeed;

    // Aplicar bônus de equipamentos
    player.equipment.equipped.forEach((equippedItem) => {
      // ✅ Buscar do ItemRegistry primeiro
      const template = ItemRegistry.getTemplate(equippedItem.itemId);
      
      // ✅ Tentar equipment-config como fallback
      const equipData = getEquipmentData(equippedItem.itemId);
      
      // ✅ Usar stats do template.data ou do equipData
      const stats = equipData?.stats || template?.data?.stats || {};

      if (stats.maxHp) player.maxHp += stats.maxHp;
      if (stats.maxMana) player.maxMana += stats.maxMana;
      if (stats.strength) player.strength += stats.strength;
      if (stats.dexterity) player.dexterity += stats.dexterity;
      if (stats.intelligence) player.intelligence += stats.intelligence;
      if (stats.vitality) player.vitality += stats.vitality;
      if (stats.damage) player.damage += stats.damage;
      if (stats.defense) player.defense += stats.defense;
      if (stats.critChance) player.critChance += stats.critChance;
      if (stats.critDamage) player.critDamage += stats.critDamage;
      if (stats.attackSpeed) player.attackSpeed += stats.attackSpeed;
      if (stats.moveSpeed) player.moveSpeed += stats.moveSpeed;
    });

    // Aplicar bÃ´nus/debuffs ativos
    const applyBonus = (current: number, bonus: number, stacks: number) => {
      const total = bonus * stacks;
      if (Math.abs(total) <= 5) return current + total;
      return current * (1 + total / 100);
    };

    player.buffs.forEach((buff) => {
      const template = BuffTemplateRegistry.get(buff.buffId);
      if (!template?.effects) return;

      const stacks = buff.stacks || 1;
      const effects = template.effects;
      if (typeof effects.hpBonus === 'number') player.maxHp = applyBonus(player.maxHp, effects.hpBonus, stacks);
      if (typeof effects.damageBonus === 'number') player.damage = applyBonus(player.damage, effects.damageBonus, stacks);
      if (typeof effects.defenseBonus === 'number') player.defense = applyBonus(player.defense, effects.defenseBonus, stacks);
      if (typeof effects.speedBonus === 'number') player.moveSpeed = applyBonus(player.moveSpeed, effects.speedBonus, stacks);
      if (typeof effects.attackSpeedBonus === 'number') player.attackSpeed = applyBonus(player.attackSpeed, effects.attackSpeedBonus, stacks);
      if (typeof effects.critChanceBonus === 'number') player.critChance = applyBonus(player.critChance, effects.critChanceBonus, stacks);
    });

    // Garantir que HP/Mana não ultrapassem
    if (player.currentHp > player.maxHp) {
      player.currentHp = player.maxHp;
    }
    if (player.currentMana > player.maxMana) {
      player.currentMana = player.maxMana;
    }

    console.info(`[EquipmentManager] Stats recalculated - DMG: ${player.damage}, DEF: ${player.defense}`);
  }

  private findEmptyInventorySlot(player: PlayerState): number {
    for (let i = 0; i < player.inventory.maxSlots; i++) {
      if (!player.inventory.slots.has(i.toString())) {
        return i;
      }
    }
    return -1;
  }
}
