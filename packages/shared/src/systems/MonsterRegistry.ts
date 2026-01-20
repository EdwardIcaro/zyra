import { MonsterTemplate } from '../types/zones';

export class MonsterRegistry {
    // Agora o mapa armazena apenas o que vem do JSON
    private static monsters: Map<string, MonsterTemplate> = new Map();
    private static initialized: boolean = false;

    /**
     * Inicializa o registro carregando os dados do arquivo JSON centralizado
     */
    public static load() {
        if (this.initialized) return;

        // Carrega diretamente do JSON (monstersData já é um objeto chave-valor)
        // if (monstersData) {
        //     Object.entries(monstersData).forEach(([key, val]) => {
        //         this.monsters.set(key, val as unknown as MonsterTemplate);
        //     });
        // }

        this.initialized = true;
        

    }

    public static setTemplates(templates: MonsterTemplate[]) {
        this.monsters.clear();
        templates.forEach(t => this.monsters.set(t.id, t));
        const sample = templates.slice(0, 3).map(t => ({
            id: t.id,
            sprite: (t as any).appearance?.sprite || null,
            scale: (t as any).scale ?? null,
            aggro: (t as any).aggro_type ?? (t as any).aggroType ?? null
        }));
        console.log(`? [MonsterRegistry] ${this.monsters.size} monstros carregados do Banco de Dados.`, sample);
    }

    /**
     * Busca um monstro específico pelo ID
     */
    public static getTemplate(monsterId: string): MonsterTemplate | undefined {
        if (!this.initialized) this.load();
        return this.monsters.get(monsterId);
    }

    /**
     * Retorna todos os monstros cadastrados (útil para sistemas de spawn global)
     */
    public static getAllTemplates(): MonsterTemplate[] {
        if (!this.initialized) this.load();
        return Array.from(this.monsters.values());
    }
}