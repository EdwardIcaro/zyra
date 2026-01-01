import { pool } from '../database/db';
import monstersData from '../../../shared/src/data/monsters.json';
import itemsData from '../../../shared/src/data/items.json';

async function migrate() {
    console.info("🚀 Iniciando migração profissional para o PostgreSQL...");

    try {
        // 1. Migrar Itens Primeiro (Essencial para as Chaves Estrangeiras dos Drops)
        console.info("📦 Migrando itens...");
        for (const [key, item] of Object.entries(itemsData)) {
            const i = item as any;
            const id = i.itemId || i.id || key; // Garante que pegamos o ID correto

            // Extraímos campos de combate para a coluna JSONB 'data'
            const extraData = {
                slot: i.slot,
                requiredLevel: i.requiredLevel,
                requiredClass: i.requiredClass,
                baseStats: i.baseStats
            };

            await pool.query(`
                INSERT INTO item_templates (id, name, description, type, grade, stackable, data)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                ON CONFLICT (id) DO UPDATE SET
                    name = EXCLUDED.name,
                    grade = EXCLUDED.grade,
                    data = EXCLUDED.data;
            `, [
                id,
                i.name,
                i.description || '',
                i.type || 'material',
                i.grade || null, // Se não tiver grade no JSON, vai como null
                i.stackable ?? (i.type === 'material'), // Materiais são stackable por padrão
                JSON.stringify(extraData)
            ]);
        }

        // 2. Migrar Monstros
        console.info("👾 Migrando monstros...");
        for (const [id, monster] of Object.entries(monstersData)) {
            const m = monster as any;
            
            await pool.query(`
                INSERT INTO monster_templates (id, name, level, type, appearance, stats, behavior, rewards)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                ON CONFLICT (id) DO UPDATE SET
                    name = EXCLUDED.name,
                    stats = EXCLUDED.stats,
                    rewards = EXCLUDED.rewards;
            `, [
                id,
                m.name,
                m.level || 1,
                m.type || 'beast',
                JSON.stringify(m.appearance || {}),
                JSON.stringify(m.stats || {}),
                JSON.stringify(m.behavior || {}),
                JSON.stringify({
                    baseExp: m.rewards?.baseExp || 0,
                    goldMin: m.rewards?.goldMin || 0,
                    goldMax: m.rewards?.goldMax || 0
                })
            ]);

            // 3. Migrar Drops (Agora os itens já existem no banco)
            if (m.rewards?.drops) {
                await pool.query('DELETE FROM monster_drops WHERE monster_id = $1', [id]);
                for (const drop of m.rewards.drops) {
                    await pool.query(`
                        INSERT INTO monster_drops (monster_id, item_id, chance, min_quantity, max_quantity)
                        VALUES ($1, $2, $3, $4, $5)
                    `, [
                        id,
                        drop.itemId,
                        drop.chance,
                        drop.min || 1,
                        drop.max || 1
                    ]);
                }
            }
        }

        console.info("\n✅ Migração concluída! Itens e Monstros estão no Postgres.");
    } catch (err) {
        console.error("❌ Erro fatal na migração:", err);
    } finally {
        await pool.end();
        process.exit();
    }
}

migrate();