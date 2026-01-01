export const LEVEL_TABLE: Record<number, number> = {
    1: 100,
    2: 250,
    3: 500,
    4: 1000,
    5: 2000,
    // Você pode expandir isso ou usar uma fórmula matemática
};

export const getRequiredXP = (level: number): number => {
    return LEVEL_TABLE[level] || level * level * 100; 
};