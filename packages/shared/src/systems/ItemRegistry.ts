import { ITEMS } from '../constants/items-config';

export class ItemRegistry {
    private static items: Map<string, any> = new Map();
    private static initialized: boolean = false;

    /**
     * Agora aceita dados externos (do Banco de Dados)
     */
public static setTemplates(templates: any[]) {
    this.items.clear();
    
    // NÃO carregue mais do arquivo ITEMS (JSON) se quiser usar apenas o Banco
    // Object.entries(ITEMS).forEach(([key, val]) => { ... }); 

    templates.forEach(item => {
        const id = item.item_id || item.itemId || item.id;
        this.items.set(id, {
            ...item,
            id: id,
           // Garante que as propriedades existam mesmo que o JSON venha com nomes diferentes
            isEquipable: item.isEquipable ?? item.is_equipable ?? false,
            equipSlot: item.equipSlot ?? item.equip_slot ?? null,
            grade: item.grade ?? item.item_grade // Resolve a confusão de nomes de grade
        });
    });

        this.initialized = true;
        
        if (typeof process !== 'undefined' && process.release?.name === 'node') {
            console.log(`✅ [ItemRegistry] ${this.items.size} itens sincronizados do banco.`);
        // Log de itens equipáveis
        let equipCount = 0;
        this.items.forEach((item, id) => {
            if (item.isEquipable) {
                equipCount++;
                console.log(`   📌 ${id} → slot: ${item.equipSlot}, type: ${item.itemType}`);
            }
        });
        console.log(`   Total equipáveis: ${equipCount}`);
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