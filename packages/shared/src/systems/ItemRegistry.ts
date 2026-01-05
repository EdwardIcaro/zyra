

export class ItemRegistry {
    private static items: Map<string, any> = new Map();
    private static initialized: boolean = false;

    /**
     * Agora aceita dados externos (do Banco de Dados)
     */

public static setTemplates(templates: any[]) {
    this.items.clear();   

    templates.forEach(item => {
        const id = item.id;
        
        // ✅ CRÍTICO: Garantir que campos estejam corretos
            const processedItem = {
            id: id,
            name: item.name,
            description: item.description,
            type: item.type,
            grade: item.grade,
            stackable: item.stackable === true,
            isEquipable: item.isEquipable === true,
            equipSlot: item.equipSlot || null,
            itemType: item.itemType || item.type,
            data: item.data || {}
            };
        
        this.items.set(id, processedItem);
    });

    this.initialized = true;
    
    if (typeof process !== 'undefined' && process.release?.name === 'node') {
        console.log(`✅ [ItemRegistry] ${this.items.size} itens sincronizados do banco.`);
        
        // ✅ Log de itens equipáveis
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
        
        
        this.initialized = true;
        console.log('[ItemRegistry] Inicializado (aguardando dados do banco)');
    }

    public static getTemplate(itemId: string) {
        if (!this.initialized) this.load();
        
        const template = this.items.get(itemId);
        
        // ✅ NOVO: Log quando item não for encontrado
        if (!template && typeof process !== 'undefined') {
            console.warn(`⚠️ [ItemRegistry] Item "${itemId}" não encontrado no registry`);
        }
        
        return template;
    }

    public static getAllTemplates() {
        if (!this.initialized) this.load();
        return Array.from(this.items.values());
    }
}