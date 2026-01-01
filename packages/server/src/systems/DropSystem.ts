import { DROP_TABLES } from '@zyra/shared';
import type { DropTableEntry } from '@zyra/shared';

export class DropSystem {
  rollDrops(monsterId: string, playerLevel: number): { itemId: string; quantity: number }[] {
    const drops: { itemId: string; quantity: number }[] = [];
    
    // Encontrar drop table do monstro
    const dropTable = DROP_TABLES.find(dt => dt.monsterId === monsterId);
    if (!dropTable) return drops;

    // Rolar cada item
    for (const entry of dropTable.drops) {
      // Verificar condições
      if (entry.conditions?.minPlayerLevel && playerLevel < entry.conditions.minPlayerLevel) {
        continue;
      }

      // Rolar chance
      const roll = Math.random() * 100;
      if (roll <= entry.chance) {
        const quantity = Math.floor(
          entry.minQuantity + Math.random() * (entry.maxQuantity - entry.minQuantity + 1)
        );
        drops.push({ itemId: entry.itemId, quantity });
      }
    }

    return drops;
  }

  getDropTable(monsterId: string) {
    return DROP_TABLES.find(dt => dt.monsterId === monsterId);
  }
}