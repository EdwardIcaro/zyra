import zonesData from '../data/zones.json';

export class ZonesRegistry {
    private static zones: Map<string, any> = new Map();
    private static initialized: boolean = false;

    public static load() {
        if (this.initialized) return;
        if (zonesData) {
            Object.entries(zonesData).forEach(([key, val]) => {
                this.zones.set(key, val);
            });
        }
        this.initialized = true;
    }

    public static get(id: string) {
        if (!this.initialized) this.load();
        return this.zones.get(id);
    }
}