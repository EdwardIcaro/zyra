import { PlayerState, EquippedItem, EquipSlot } from '@zyra/shared';
import { 
  getEquipmentData, 
  canEquip, ItemRegistry 
} from '@zyra/shared';


export class EquipmentManager {
  /**
   * Equipar um item do inventário
   * @param player - Estado do player
   * @param inventorySlotIndex - Índice do slot no inventário
   * @returns true se equipou com sucesso
   */
equipFromInventory(player: PlayerState, inventorySlotIndex: number): boolean {
    const invSlot = player.inventory.slots.get(inventorySlotIndex.toString());
    if (!invSlot) {
        console.warn(`[EquipmentManager] No item in inventory slot ${inventorySlotIndex}`);
        return false;
    }

    const itemId = invSlot.itemId;
    
    // ✅ NOVO: Buscar template completo com equipSlot
    const itemTemplate = ItemRegistry.getTemplate(itemId);
    if (!itemTemplate) {
        console.warn(`[EquipmentManager] Item ${itemId} not found in registry`);
        return false;
    }

    // ✅ NOVO: Validar se item é equipável
    if (!itemTemplate.isEquipable || !itemTemplate.equipSlot) {
        console.warn(`[EquipmentManager] Item ${itemId} is not equipable`);
        return false;
    }

    const equipmentData = getEquipmentData(itemId);
    if (!equipmentData) {
        console.warn(`[EquipmentManager] Item ${itemId} has no equipment data`);
        return false;
    }

    // ✅ NOVO: Usar equipSlot do template ao invés de hardcoded
    let targetSlot = itemTemplate.equipSlot as EquipSlot;

    // Caso especial: Rings (aceitar ring1 ou ring2)
    if (targetSlot === EquipSlot.RING1 || targetSlot === EquipSlot.RING2) {
        const ring1 = player.equipment.equipped.get(EquipSlot.RING1);
        const ring2 = player.equipment.equipped.get(EquipSlot.RING2);
        
        if (!ring1) {
            targetSlot = EquipSlot.RING1;
        } else if (!ring2) {
            targetSlot = EquipSlot.RING2;
        } else {
            // Ambos ocupados, substituir ring1
            this.unequipToInventory(player, EquipSlot.RING1);
            targetSlot = EquipSlot.RING1;
        }
    }

    // Verificar requisitos (nível, stats, classe)
    if (!canEquip(itemId, player.level, {
        strength: player.baseStrength,
        dexterity: player.baseDexterity,
        intelligence: player.baseIntelligence
    }, player.classType)) {
        console.warn(`[EquipmentManager] ${player.username} cannot equip ${itemId} - requirements not met`);
        return false;
    }

    // Se slot já ocupado, desequipar item atual
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

  /**
   * Desequipar item e colocar de volta no inventário
   */
  unequipToInventory(player: PlayerState, equipmentSlot: string): boolean {
    const equippedItem = player.equipment.equipped.get(equipmentSlot);
    if (!equippedItem) {
      console.warn(`[EquipmentManager] No item equipped in ${equipmentSlot}`);
      return false;
    }

    // 1. Encontrar slot vazio no inventário
    const emptySlot = this.findEmptyInventorySlot(player);
    if (emptySlot === -1) {
      console.warn(`[EquipmentManager] Inventory full - cannot unequip ${equippedItem.itemId}`);
      return false;
    }

    // 2. Criar slot no inventário
    const invSlot = new (require('@zyra/shared').InventorySlot)();
    invSlot.itemId = equippedItem.itemId;
    invSlot.quantity = 1;
    invSlot.slotIndex = emptySlot;
    invSlot.equipped = false;

    player.inventory.slots.set(emptySlot.toString(), invSlot);

    // 3. Remover do equipamento
    player.equipment.equipped.delete(equipmentSlot);

    // 4. Recalcular stats
    this.recalculateStats(player);

    console.info(`[EquipmentManager] ${player.username} unequipped ${equippedItem.itemId} from ${equipmentSlot}`);
    return true;
  }

  /**
   * Recalcular todos os stats baseado em equipamentos
   */
  recalculateStats(player: PlayerState): void {
    // 1. Resetar para base stats
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

    // 2. Aplicar bônus de cada equipamento
    player.equipment.equipped.forEach((equippedItem) => {
      const equipData = getEquipmentData(equippedItem.itemId);
      if (!equipData) return;

      const stats = equipData.stats;

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

    // 3. Garantir que HP/Mana atuais não ultrapassem o máximo
    if (player.currentHp > player.maxHp) {
      player.currentHp = player.maxHp;
    }
    if (player.currentMana > player.maxMana) {
      player.currentMana = player.maxMana;
    }

    console.info(`[EquipmentManager] ${player.username} stats recalculated - DMG: ${player.damage}, DEF: ${player.defense}, HP: ${player.maxHp}`);
  }

  /**
   * Encontrar slot vazio no inventário
   */
  private findEmptyInventorySlot(player: PlayerState): number {
    for (let i = 0; i < player.inventory.maxSlots; i++) {
      if (!player.inventory.slots.has(i.toString())) {
        return i;
      }
    }
    return -1;
  }

  /**
   * Obter todos os stats aplicados por equipamentos (para debug/UI)
   */
  getEquipmentBonuses(player: PlayerState): Record<string, number> {
    const bonuses: Record<string, number> = {
      damage: 0,
      defense: 0,
      maxHp: 0,
      maxMana: 0,
      strength: 0,
      dexterity: 0,
      intelligence: 0,
      vitality: 0,
      critChance: 0,
      critDamage: 0,
      attackSpeed: 0,
      moveSpeed: 0
    };

    player.equipment.equipped.forEach((equippedItem) => {
      const equipData = getEquipmentData(equippedItem.itemId);
      if (!equipData) return;

      const stats = equipData.stats;
      Object.keys(stats).forEach((key) => {
        if (key in bonuses) {
          bonuses[key] += stats[key as keyof typeof stats] || 0;
        }
      });
    });

    return bonuses;
  }

  /**
   * Verificar se player pode equipar um item (usado para UI)
   */
  canPlayerEquip(player: PlayerState, itemId: string): boolean {
    return canEquip(itemId, player.level, {
      strength: player.baseStrength,
      dexterity: player.baseDexterity,
      intelligence: player.baseIntelligence
    }, player.classType);
  }
}