export interface DropTableEntry {
  itemId: string;
  chance: number; // 0-100
  minQuantity: number;
  maxQuantity: number;
  conditions?: {
    minPlayerLevel?: number;
  };
}

export interface MonsterDropTable {
  monsterId: string;
  drops: DropTableEntry[];
}