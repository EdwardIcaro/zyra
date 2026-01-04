import { ITEMS } from '../constants/items-config';

export class ItemRegistry {
    private static items: Map<string, any> = new Map();
    private static initialized: boolean = false;

    /**
     * Agora aceita dados externos (do Banco de Dados)
     */
    public static setTemplates(templates: any[]) {
        this.items.clear();
        
        // 1. Opcional: Carregar itens fixos do código (items-config.ts)
        Object.entries(ITEMS).forEach(([key, val]) => {
            this.items.set(key, val);
        });

        // 2. Adicionar os itens vindos do Banco de Dados
        templates.forEach(item => {
        this.items.set(item.id, {
            ...item,
            equipSlot: item.equip_slot,      // ← NOVO
            itemType: item.item_type,         // ← NOVO
            isEquipable: item.is_equipable    // ← NOVO
        });
    });

        this.initialized = true;
        
        if (typeof process !== 'undefined' && process.release?.name === 'node') {
            console.log(`✅ [ItemRegistry] ${this.items.size} itens sincronizados do banco.`);
        }
    }

    /**
     * Mantemos o load() antigo apenas como fallback se você ainda usar o JSON
     * mas ele não deve tentar importar o JSON do server (causa erro de build)
     */
    public static load() {
        if (this.initialized) return;
        
        // Carrega apenas as constantes locais se o banco ainda não injetou nada
        Object.entries(ITEMS).forEach(([key, val]) => {
            this.items.set(key, val);
        });
        
        this.initialized = true;
    }

    public static getTemplate(itemId: string) {
        // Se ainda não foi inicializado pelo banco ou pelo config, tenta carregar locais
        if (!this.initialized) this.load();
        return this.items.get(itemId);
    }

    public static getAllTemplates() {
        if (!this.initialized) this.load();
        return Array.from(this.items.values());
    }
}