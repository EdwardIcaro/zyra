import buffsData from '../data/buffs.json';

export class BuffRegistry {
    private static buffs: Map<string, any> = new Map();
    private static initialized: boolean = false;

    public static load() {
        if (this.initialized) return;
        if (buffsData) {
            Object.entries(buffsData).forEach(([key, val]) => {
                this.buffs.set(key, val);
            });
        }
        this.initialized = true;
    }

    public static get(id: string) {
        if (!this.initialized) this.load();
        return this.buffs.get(id);
    }
}