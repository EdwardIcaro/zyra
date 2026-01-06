export class ItemRegistry {
    private static items: Map<string, any> = new Map();
    private static initialized: boolean = false;

    /**
     * ✅ CORRIGIDO: Aceita apenas dados externos (do Banco de Dados)
     * NÃO carrega mais do arquivo items-config.ts
     */
    public static setTemplates(templates: any[]) {
        this.items.clear();
        
        // ❌ REMOVER COMPLETAMENTE - NÃO carregar do ITEMS
        // ❌ Esta linha estava causando o problema:
        // Object.entries(ITEMS).forEach(([key, val]) => {
        //     this.items.set(key, val);
        // });

        // ✅ Processar APENAS templates vindos do banco
        templates.forEach(item => {
            const id = item.id;
            
            // ✅ CRÍTICO: Usar os nomes CORRETOS dos campos
            const processedItem = {
                id: id,
                name: item.name,
                description: item.description,
                type: item.type,
                grade: item.grade,
                stackable: item.stackable === true,
                isEquipable: item.isEquipable === true,      // ✅ Já normalizado no loadGameDataFromDB
                equipSlot: item.equipSlot || null,            // ✅ Já normalizado no loadGameDataFromDB
                itemType: item.itemType || item.type,
                data: item.data || {}
            };
            
            this.items.set(id, processedItem);
        });

        this.initialized = true;
        
        // ✅ Log apenas no servidor
        if (typeof process !== 'undefined' && process.release?.name === 'node') {
            console.log(`✅ [ItemRegistry] ${this.items.size} itens sincronizados do banco.`);
            
            // ✅ NOVO: Log detalhado de CADA item
            this.items.forEach((item, id) => {
                console.log(`   • ${id}:`, {
                    isEquipable: item.isEquipable,
                    equipSlot: item.equipSlot,
                    itemType: item.itemType
                });
            });
            
            const equipCount = Array.from(this.items.values()).filter(i => i.isEquipable).length;
            console.log(`   Total equipáveis: ${equipCount}`);
        }
    }

    /**
     * ✅ CORRIGIDO: load() não carrega mais do arquivo
     */
    public static load() {
        if (this.initialized) return;
        
        // ❌ REMOVER - não carregar do ITEMS
        // Object.entries(ITEMS).forEach(([key, val]) => {
        //     this.items.set(key, val);
        // });
        
        this.initialized = true;
        console.log('[ItemRegistry] Inicializado (aguardando dados do banco)');
    }

    public static getTemplate(itemId: string) {
        if (!this.initialized) this.load();
        
        const template = this.items.get(itemId);
        
        // ✅ Log quando item não for encontrado
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