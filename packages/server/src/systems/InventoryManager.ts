import { PlayerState, InventorySlot } from '@zyra/shared';

export class InventoryManager {
  /**
   * Adicionar item ao inventário
   */
  addItem(player: PlayerState, itemId: string, quantity: number): boolean {
    // Gold é tratado separadamente
    if (itemId === 'gold') {
      player.gold += quantity;
      return true;
    }

    // Verificar se item é stackable e já existe
    const existingSlot = this.findItemSlot(player, itemId);
    
    if (existingSlot) {
      // Item já existe, aumentar quantidade
      existingSlot.quantity += quantity;
      return true;
    }

    // Procurar slot vazio
    const emptySlotIndex = this.findEmptySlot(player);
    if (emptySlotIndex === -1) {
      return false; // Inventário cheio
    }

    // Criar novo slot
    const slot = new InventorySlot();
    slot.itemId = itemId;
    slot.quantity = quantity;
    slot.slotIndex = emptySlotIndex;
    slot.equipped = false; // Sempre false - equipamentos são gerenciados pelo EquipmentManager

    player.inventory.slots.set(emptySlotIndex.toString(), slot);
    return true;
  }

  /**
   * Remover item do inventário
   */
  removeItem(player: PlayerState, itemId: string, quantity: number): boolean {
    const slot = this.findItemSlot(player, itemId);
    if (!slot) return false;

    if (slot.quantity < quantity) return false;

    slot.quantity -= quantity;

    if (slot.quantity <= 0) {
      player.inventory.slots.delete(slot.slotIndex.toString());
    }

    return true;
  }

  /**
   * Remover item por slot index
   */
  removeItemBySlot(player: PlayerState, slotIndex: number): boolean {
    const slot = player.inventory.slots.get(slotIndex.toString());
    if (!slot) return false;

    player.inventory.slots.delete(slotIndex.toString());
    return true;
  }

  /**
   * Mover item entre slots do inventário
   */
  moveItem(player: PlayerState, fromSlot: number, toSlot: number): boolean {
    const from = player.inventory.slots.get(fromSlot.toString());
    const to = player.inventory.slots.get(toSlot.toString());

    if (!from) return false;

    if (to) {
      // Trocar slots
      const tempItemId = from.itemId;
      const tempQuantity = from.quantity;

      from.itemId = to.itemId;
      from.quantity = to.quantity;

      to.itemId = tempItemId;
      to.quantity = tempQuantity;
    } else {
      // Mover para slot vazio
      player.inventory.slots.delete(fromSlot.toString());
      from.slotIndex = toSlot;
      player.inventory.slots.set(toSlot.toString(), from);
    }

    return true;
  }

  /**
   * Encontrar slot do item pelo itemId
   */
  findItemSlot(player: PlayerState, itemId: string): InventorySlot | null {
    for (const [_, slot] of player.inventory.slots) {
      if (slot.itemId === itemId) {
        return slot;
      }
    }
    return null;
  }

  /**
   * Encontrar slot vazio no inventário
   */
  findEmptySlot(player: PlayerState): number {
    for (let i = 0; i < player.inventory.maxSlots; i++) {
      if (!player.inventory.slots.has(i.toString())) {
        return i;
      }
    }
    return -1; // Inventário cheio
  }

  /**
   * Verificar se inventário está cheio
   */
  isInventoryFull(player: PlayerState): boolean {
    return player.inventory.slots.size >= player.inventory.maxSlots;
  }

  /**
   * Contar quantidade de um item
   */
  countItem(player: PlayerState, itemId: string): number {
    const slot = this.findItemSlot(player, itemId);
    return slot ? slot.quantity : 0;
  }

  /**
   * Obter item por slot index
   */
  getItemBySlot(player: PlayerState, slotIndex: number): InventorySlot | null {
    return player.inventory.slots.get(slotIndex.toString()) || null;
  }
}