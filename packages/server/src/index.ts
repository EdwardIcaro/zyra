import { Server } from 'colyseus';
import { createServer } from 'http';
import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { WebSocketTransport } from '@colyseus/ws-transport';
import fs from 'fs';
import path from 'path';
import { ItemRegistry, MonsterRegistry, ZONES } from '@zyra/shared';  
import { VISUAL_CONFIGS } from '@zyra/shared/src/data/visualConfigs';
import { pool } from './database/db';
import { BuffTemplateRegistry } from './systems/BuffTemplateRegistry';
import { ClassBaseStatsRegistry } from './systems/ClassBaseStatsRegistry';


import { CombatRoom } from './rooms/CombatRoom';
import { WorldRoom } from './rooms/WorldRoom';
import { LobbyRoom } from './rooms/LobbyRoom';
import adminUsersRouter from './routes/admin-users';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use('/admin', express.static('public/admin.html'));
app.use('/api/admin', adminUsersRouter);
app.use('/assets/ui', express.static(path.join(__dirname, '../../client/public/assets/ui')));
app.use('/assets/fonts', express.static(path.join(__dirname, '../../client/public/assets/fonts')));
app.use('/assets/monsters', express.static(path.join(__dirname, '../../client/public/assets/monsters')));

app.get('/dashboard', (req, res) => {
    const adminPath = path.join(__dirname, '../public/admin.html');
    res.sendFile(adminPath);
});

app.use(express.static(path.join(__dirname, '../public')));

// ==================== ADMIN ROUTES ====================

// Listar Monstros
app.get('/api/admin/monsters', async (req: Request, res: Response): Promise<void> => {
    try {
        const result = await pool.query('SELECT * FROM monster_templates ORDER BY level ASC');
        const rows = result.rows.map(row => {
            const normalized = { ...row };
            try {
                if (typeof normalized.appearance === 'string') {
                    normalized.appearance = JSON.parse(normalized.appearance);
                }
            } catch {
                normalized.appearance = {};
            }
            try {
                if (typeof normalized.stats === 'string') {
                    normalized.stats = JSON.parse(normalized.stats);
                }
            } catch {
                normalized.stats = {};
            }
            try {
                if (typeof normalized.behavior === 'string') {
                    normalized.behavior = JSON.parse(normalized.behavior);
                }
            } catch {
                normalized.behavior = {};
            }
            try {
                if (typeof normalized.rewards === 'string') {
                    normalized.rewards = JSON.parse(normalized.rewards);
                }
            } catch {
                normalized.rewards = {};
            }
            return normalized;
        });
        res.json(rows);
    } catch (err) {
        console.error('[Admin] Error loading monsters:', err);
        res.status(500).json({ error: 'Failed to load monsters' });
    }
});

// Listar Drops de um Monstro
app.get('/api/admin/monsters/:id/drops', async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const result = await pool.query(`
            SELECT md.*, it.name as item_name 
            FROM monster_drops md
            JOIN item_templates it ON md.item_id = it.id
            WHERE md.monster_id = $1
        `, [id]);
        res.json(result.rows);
    } catch (err) {
        console.error('[Admin] Error loading drops:', err);
        res.status(500).json({ error: 'Failed to load drops' });
    }
});

// Listar arquivos de sprites
app.get('/api/admin/assets/:folder', (req: Request, res: Response): void => {
    const { folder } = req.params;
    let publicPath: string;
    let allowedExts = ['.png', '.jpg', '.jpeg'];
    const normalizePath = (p: string) => p.replace(/\\/g, '/');

    if (folder === 'ui' || folder === 'fonts') {
        publicPath = path.join(__dirname, '../../client/public/assets', folder);
        if (folder === 'fonts') {
            allowedExts = ['.fnt'];
        }
    } else if (folder === 'monsters') {
        publicPath = path.join(__dirname, '../../client/public/assets/monsters');
        allowedExts = ['.png'];
    } else {
        publicPath = path.join(__dirname, '../../client/public/assets/sprites', folder);
    }

    if (!fs.existsSync(publicPath)) {
        res.status(404).json({ error: 'Pasta n??o encontrada' });
        return;
    }

    if (folder === 'monsters') {
        const walk = (dir: string, base: string, acc: string[]) => {
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            entries.forEach(entry => {
                const full = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    walk(full, base, acc);
                } else {
                    const ext = path.extname(entry.name).toLowerCase();
                    if (allowedExts.includes(ext)) {
                        acc.push(normalizePath(path.relative(base, full)));
                    }
                }
            });
        };
        try {
            const files: string[] = [];
            walk(publicPath, publicPath, files);
            res.json(files);
        } catch (err) {
            console.error('[Admin] Error reading directory:', err);
            res.status(500).json({ error: 'Erro ao ler diret??rio' });
        }
        return;
    }

    fs.readdir(publicPath, (err, files) => {
        if (err) {
            console.error('[Admin] Error reading directory:', err);
            res.status(500).json({ error: 'Erro ao ler diret??rio' });
            return;
        }
        
        const filtered = files.filter(f => allowedExts.includes(path.extname(f).toLowerCase()));
        res.json(filtered);
    });
});

// UI Configs (Admin)
app.get('/api/admin/ui/configs', async (_req: Request, res: Response): Promise<void> => {
    try {
        const result = await pool.query(
            'SELECT ui_name, config_json, updated_at FROM ui_configs ORDER BY ui_name ASC'
        );
        res.json(result.rows);
    } catch (e) {
        console.error('[Admin] Error loading ui configs:', e);
        res.status(500).json({ error: 'Erro ao carregar UI configs' });
    }
});

app.get('/api/admin/ui/configs/:uiName', async (req: Request, res: Response): Promise<void> => {
    const { uiName } = req.params;
    try {
        const result = await pool.query(
            'SELECT ui_name, config_json, updated_at FROM ui_configs WHERE ui_name = $1',
            [uiName]
        );
        if (result.rows.length === 0) {
            res.json({ ui_name: uiName, config_json: null });
            return;
        }
        res.json(result.rows[0]);
    } catch (e) {
        console.error('[Admin] Error loading ui config:', e);
        res.status(500).json({ error: 'Erro ao carregar UI config' });
    }
});

app.post('/api/admin/ui/configs/save', async (req: Request, res: Response): Promise<void> => {
    const { uiName, config } = req.body;
    if (!uiName || !config) {
        res.status(400).json({ error: 'uiName e config sÇœo obrigatÇórios' });
        return;
    }
    try {
        await pool.query(
            `INSERT INTO ui_configs (ui_name, config_json)
             VALUES ($1, $2)
             ON CONFLICT (ui_name) DO UPDATE SET
                config_json = EXCLUDED.config_json,
                updated_at = now()`,
            [uiName, config]
        );
        res.json({ ok: true });
    } catch (e) {
        console.error('[Admin] Error saving ui config:', e);
        res.status(500).json({ error: 'Erro ao salvar UI config' });
    }
});

app.post('/api/admin/ui/configs/reset', async (req: Request, res: Response): Promise<void> => {
    const { uiName } = req.body;
    if (!uiName) {
        res.status(400).json({ error: 'uiName Ç­ obrigatÇório' });
        return;
    }
    try {
        await pool.query('DELETE FROM ui_configs WHERE ui_name = $1', [uiName]);
        res.json({ ok: true });
    } catch (e) {
        console.error('[Admin] Error resetting ui config:', e);
        res.status(500).json({ error: 'Erro ao resetar UI config' });
    }
});

// UI Configs (Public)
app.get('/api/ui/configs', async (_req: Request, res: Response): Promise<void> => {
    try {
        const result = await pool.query(
            'SELECT ui_name, config_json FROM ui_configs ORDER BY ui_name ASC'
        );
        res.json(result.rows);
    } catch (e) {
        console.error('[Public] Error loading ui configs:', e);
        res.status(500).json({ error: 'Erro ao carregar UI configs' });
    }
});

app.get('/api/ui/configs/:uiName', async (req: Request, res: Response): Promise<void> => {
    const { uiName } = req.params;
    try {
        const result = await pool.query(
            'SELECT ui_name, config_json FROM ui_configs WHERE ui_name = $1',
            [uiName]
        );
        if (result.rows.length === 0) {
            res.json({ ui_name: uiName, config_json: null });
            return;
        }
        res.json(result.rows[0]);
    } catch (e) {
        console.error('[Public] Error loading ui config:', e);
        res.status(500).json({ error: 'Erro ao carregar UI config' });
    }
});

// Listar tileset local (recursivo)
app.get('/api/admin/tileset', async (_req: Request, res: Response): Promise<void> => {
    const tilesetPath = path.join(__dirname, '../public/assets/tileset');
    if (!fs.existsSync(tilesetPath)) {
        res.json([]);
        return;
    }

    const results: string[] = [];
    const walk = (dir: string, base: string) => {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        entries.forEach(entry => {
            const full = path.join(dir, entry.name);
            const rel = path.relative(base, full).replace(/\\/g, '/');
            if (entry.isDirectory()) {
                walk(full, base);
            } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.png')) {
                results.push(rel);
            }
        });
    };

    walk(tilesetPath, tilesetPath);
    res.json(results);
});

// Salvar/Atualizar Monstro
app.post('/api/admin/monsters/save', async (req: Request, res: Response): Promise<void> => {
    const { id, name, level, type, stats, behavior, rewards, appearance, attackSpeed, defense, aggroType, scale } = req.body;
    try {
        await pool.query(`
            INSERT INTO monster_templates (id, name, level, type, stats, behavior, rewards, appearance, attack_speed, defense, aggro_type, scale)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name,
                level = EXCLUDED.level,
                type = EXCLUDED.type,
                stats = EXCLUDED.stats,
                behavior = EXCLUDED.behavior,
                rewards = EXCLUDED.rewards,
                appearance = EXCLUDED.appearance,
                attack_speed = EXCLUDED.attack_speed,
                defense = EXCLUDED.defense,
                aggro_type = EXCLUDED.aggro_type,
                scale = EXCLUDED.scale
        `, [
            id, name, level, type, 
            JSON.stringify(stats), 
            JSON.stringify(behavior), 
            JSON.stringify(rewards),
            JSON.stringify(appearance),
            attackSpeed,
            defense,
            aggroType || 'aggressive',
            scale || 1.0
        ]);
        
        await loadGameDataFromDB();

res.json({ success: true });
    } catch (err) {
        console.error('[Admin] Error saving monster:', err);
        res.status(500).json({ error: 'Failed to save monster' });
    }
});

app.delete('/api/admin/monsters/:id', async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM monster_spawns WHERE monster_id = $1', [id]);
        await pool.query('DELETE FROM monster_drops WHERE monster_id = $1', [id]);
        await pool.query('DELETE FROM monster_templates WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (err) {
        console.error('[Admin] Error deleting monster:', err);
        res.status(500).json({ error: 'Failed to delete monster' });
    }
});

// Listar Buffs/Debuffs
app.get('/api/admin/buffs', async (_req: Request, res: Response): Promise<void> => {
    try {
        const result = await pool.query('SELECT * FROM buff_templates ORDER BY id ASC');
        res.json(result.rows);
    } catch (err) {
        console.error('[Admin] Error loading buffs:', err);
        res.status(500).json({ error: 'Failed to load buffs' });
    }
});

// Salvar/Atualizar Buff/Debuff
app.post('/api/admin/buffs/save', async (req: Request, res: Response): Promise<void> => {
    const { id, name, kind, description, durationMs, stackable, maxStacks, effects, visualColor } = req.body;
    try {
        await pool.query(`
            INSERT INTO buff_templates (id, name, kind, description, duration_ms, stackable, max_stacks, effects, visual_color)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9)
            ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name,
                kind = EXCLUDED.kind,
                description = EXCLUDED.description,
                duration_ms = EXCLUDED.duration_ms,
                stackable = EXCLUDED.stackable,
                max_stacks = EXCLUDED.max_stacks,
                effects = EXCLUDED.effects,
                visual_color = EXCLUDED.visual_color
        `, [
            id,
            name,
            kind,
            description || '',
            durationMs ?? 0,
            stackable === true,
            maxStacks ?? 1,
            JSON.stringify(effects || {}),
            visualColor ?? null
        ]);

        res.json({ success: true });
    } catch (err) {
        console.error('[Admin] Error saving buff:', err);
        res.status(500).json({ error: 'Failed to save buff' });
    }
});

app.delete('/api/admin/buffs/:id', async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM character_buffs WHERE buff_id = $1', [id]);
        await pool.query('DELETE FROM buff_templates WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (err) {
        console.error('[Admin] Error deleting buff:', err);
        res.status(500).json({ error: 'Failed to delete buff' });
    }
});

// Listar buffs (público para HUD)
app.get('/api/buffs', async (_req: Request, res: Response): Promise<void> => {
    try {
        const result = await pool.query('SELECT * FROM buff_templates ORDER BY id ASC');
        res.json(result.rows);
    } catch (err) {
        console.error('[Buffs] Error loading buffs:', err);
        res.status(500).json({ error: 'Failed to load buffs' });
    }
});

// Conceder Buff para um personagem
app.post('/api/admin/buffs/grant', async (req: Request, res: Response): Promise<void> => {
    const { characterId, characterName, buffId, stacks, durationMs } = req.body;
    try {
        let resolvedCharacterId: number | null = characterId ?? null;
        if (!resolvedCharacterId && characterName) {
            const charRes = await pool.query('SELECT id FROM characters WHERE char_name = $1', [characterName]);
            resolvedCharacterId = charRes.rows[0]?.id ?? null;
        }
        if (!resolvedCharacterId) {
            res.status(400).json({ error: 'Character not found' });
            return;
        }

        const startedAt = new Date();
        const expiresAt = durationMs && durationMs > 0 ? new Date(Date.now() + durationMs) : null;
        await pool.query(`
            INSERT INTO character_buffs (character_id, buff_id, stacks, started_at, expires_at)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (character_id, buff_id) DO UPDATE SET
                stacks = EXCLUDED.stacks,
                started_at = EXCLUDED.started_at,
                expires_at = EXCLUDED.expires_at
        `, [resolvedCharacterId, buffId, stacks ?? 1, startedAt, expiresAt]);

        res.json({ success: true });
    } catch (err) {
        console.error('[Admin] Error granting buff:', err);
        res.status(500).json({ error: 'Failed to grant buff' });
    }
});

// Listar base stats de classes
app.get('/api/admin/class-stats', async (_req: Request, res: Response): Promise<void> => {
    try {
        const result = await pool.query('SELECT * FROM class_base_stats ORDER BY class_type ASC');
        res.json(result.rows);
    } catch (err) {
        console.error('[Admin] Error loading class stats:', err);
        res.status(500).json({ error: 'Failed to load class stats' });
    }
});

// Salvar/Atualizar base stats de classe
app.post('/api/admin/class-stats/save', async (req: Request, res: Response): Promise<void> => {
    const {
        classType,
        displayName,
        description,
        maxHp,
        maxMana,
        strength,
        dexterity,
        intelligence,
        vitality,
        luck,
        baseDamage,
        baseDefense,
        attackSpeed,
        moveSpeed,
        isActive,
        isRanged
    } = req.body;

    try {
        await pool.query(`
            INSERT INTO class_base_stats (
                class_type, display_name, description, max_hp, max_mana, strength, dexterity, intelligence, vitality, luck,
                base_damage, base_defense, attack_speed, move_speed, is_active, is_ranged
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
            ON CONFLICT (class_type) DO UPDATE SET
                display_name = EXCLUDED.display_name,
                description = EXCLUDED.description,
                max_hp = EXCLUDED.max_hp,
                max_mana = EXCLUDED.max_mana,
                strength = EXCLUDED.strength,
                dexterity = EXCLUDED.dexterity,
                intelligence = EXCLUDED.intelligence,
                vitality = EXCLUDED.vitality,
                luck = EXCLUDED.luck,
                base_damage = EXCLUDED.base_damage,
                base_defense = EXCLUDED.base_defense,
                attack_speed = EXCLUDED.attack_speed,
                move_speed = EXCLUDED.move_speed,
                is_active = EXCLUDED.is_active,
                is_ranged = EXCLUDED.is_ranged
        `, [
            classType,
            displayName || null,
            description || null,
            maxHp,
            maxMana,
            strength,
            dexterity,
            intelligence,
            vitality,
            luck,
            baseDamage,
            baseDefense,
            attackSpeed,
            moveSpeed,
            isActive !== false,
            isRanged === true
        ]);

        res.json({ success: true });
    } catch (err) {
        console.error('[Admin] Error saving class stats:', err);
        res.status(500).json({ error: 'Failed to save class stats' });
    }
});

app.delete('/api/admin/class-stats/:classType', async (req: Request, res: Response): Promise<void> => {
    const { classType } = req.params;
    try {
        await pool.query('DELETE FROM class_base_stats WHERE class_type = $1', [classType]);
        res.json({ success: true });
    } catch (err) {
        console.error('[Admin] Error deleting class stats:', err);
        res.status(500).json({ error: 'Failed to delete class stats' });
    }
});

// Classes ativas (para selecao no client)
app.get('/api/classes', async (_req: Request, res: Response): Promise<void> => {
    try {
        const result = await pool.query(`
            SELECT class_type, display_name, description, is_ranged
            FROM class_base_stats
            WHERE is_active = true
            ORDER BY class_type ASC
        `);
        res.json(result.rows);
    } catch (err) {
        console.error('[Classes] Error loading active classes:', err);
        res.status(500).json({ error: 'Failed to load classes' });
    }
});

// Listar zonas (para editor de mapa)
app.get('/api/admin/zones', async (_req: Request, res: Response): Promise<void> => {
    try {
        const zones = Object.values(ZONES);
        const mapsRes = await pool.query('SELECT * FROM zone_maps');
        const mapByZone = new Map(mapsRes.rows.map((z: any) => [z.zone_id, z]));

        res.json(zones.map(zone => ({
            id: zone.id,
            name: zone.name,
            width: zone.size.width,
            height: zone.size.height,
            imageUrl: mapByZone.get(zone.id)?.image_url || ''
        })));
    } catch (err) {
        console.error('[Admin] Error loading zones:', err);
        res.status(500).json({ error: 'Failed to load zones' });
    }
});

// Salvar imagem de mapa da zona
app.post('/api/admin/zone-map/save', async (req: Request, res: Response): Promise<void> => {
    const { zoneId, imageUrl } = req.body;
    try {
        await pool.query(`
            INSERT INTO zone_maps (zone_id, image_url)
            VALUES ($1, $2)
            ON CONFLICT (zone_id) DO UPDATE SET
                image_url = EXCLUDED.image_url,
                updated_at = NOW()
        `, [zoneId, imageUrl || null]);
        res.json({ success: true });
    } catch (err) {
        console.error('[Admin] Error saving zone map:', err);
        res.status(500).json({ error: 'Failed to save zone map' });
    }
});

// Spawn inicial por zona (apenas para novos personagens)
app.get('/api/admin/player-spawns', async (req: Request, res: Response): Promise<void> => {
    const zoneId = req.query.zoneId as string;
    if (!zoneId) {
        res.status(400).json({ error: 'zoneId required' });
        return;
    }
    try {
        const result = await pool.query('SELECT * FROM spawn_points WHERE zone_id = $1', [zoneId]);
        res.json(result.rows[0] || null);
    } catch (err) {
        console.error('[Admin] Error loading player spawn:', err);
        res.status(500).json({ error: 'Failed to load player spawn' });
    }
});

app.post('/api/admin/player-spawns', async (req: Request, res: Response): Promise<void> => {
    const { zoneId, x, y } = req.body;
    if (!zoneId || x === undefined || y === undefined) {
        res.status(400).json({ error: 'zoneId, x, y required' });
        return;
    }
    try {
        await pool.query(`
            INSERT INTO spawn_points (zone_id, x, y)
            VALUES ($1, $2, $3)
            ON CONFLICT (zone_id) DO UPDATE SET
                x = EXCLUDED.x,
                y = EXCLUDED.y,
                updated_at = NOW()
        `, [zoneId, x, y]);
        res.json({ success: true });
    } catch (err) {
        console.error('[Admin] Error saving player spawn:', err);
        res.status(500).json({ error: 'Failed to save player spawn' });
    }
});

app.delete('/api/admin/player-spawns', async (req: Request, res: Response): Promise<void> => {
    const zoneId = req.query.zoneId as string;
    if (!zoneId) {
        res.status(400).json({ error: 'zoneId required' });
        return;
    }
    try {
        await pool.query('DELETE FROM spawn_points WHERE zone_id = $1', [zoneId]);
        res.json({ success: true });
    } catch (err) {
        console.error('[Admin] Error deleting player spawn:', err);
        res.status(500).json({ error: 'Failed to delete player spawn' });
    }
});

// Listar spawns por zona
app.get('/api/admin/spawns', async (req: Request, res: Response): Promise<void> => {
    const zoneId = req.query.zoneId as string;
    if (!zoneId) {
        res.status(400).json({ error: 'zoneId required' });
        return;
    }
    try {
        const result = await pool.query('SELECT * FROM monster_spawns WHERE zone_id = $1 ORDER BY id ASC', [zoneId]);
        res.json(result.rows);
    } catch (err) {
        console.error('[Admin] Error loading spawns:', err);
        res.status(500).json({ error: 'Failed to load spawns' });
    }
});

// Carregar tilemap por zona
app.get('/api/admin/map', async (req: Request, res: Response): Promise<void> => {
    const zoneId = req.query.zoneId as string;
    if (!zoneId) {
        res.status(400).json({ error: 'zoneId required' });
        return;
    }
    try {
        const result = await pool.query('SELECT * FROM zone_tiles WHERE zone_id = $1 ORDER BY id ASC', [zoneId]);
        res.json(result.rows);
    } catch (err) {
        console.error('[Admin] Error loading map tiles:', err);
        res.status(500).json({ error: 'Failed to load map tiles' });
    }
});

// Salvar tilemap por zona
app.post('/api/admin/map/save', async (req: Request, res: Response): Promise<void> => {
    const { zoneId, tiles } = req.body;
    if (!zoneId) {
        res.status(400).json({ error: 'zoneId required' });
        return;
    }
    try {
        await pool.query('DELETE FROM zone_tiles WHERE zone_id = $1', [zoneId]);
        if (Array.isArray(tiles) && tiles.length > 0) {
            for (const tile of tiles) {
                await pool.query(`
                    INSERT INTO zone_tiles (zone_id, layer, tile_path, x, y)
                    VALUES ($1, $2, $3, $4, $5)
                `, [zoneId, tile.layer, tile.tilePath, tile.x, tile.y]);
            }
        }
        res.json({ success: true });
    } catch (err) {
        console.error('[Admin] Error saving map tiles:', err);
        res.status(500).json({ error: 'Failed to save map tiles' });
    }
});

// Salvar/Atualizar spawn
app.post('/api/admin/spawns/save', async (req: Request, res: Response): Promise<void> => {
    const { id, zoneId, monsterId, x, y, levelOverride, respawnTime } = req.body;
    try {
        if (id) {
            await pool.query(`
                UPDATE monster_spawns
                SET zone_id = $1, monster_id = $2, x = $3, y = $4, level_override = $5, respawn_time = $6
                WHERE id = $7
            `, [zoneId, monsterId, x, y, levelOverride ?? null, respawnTime ?? null, id]);
        } else {
            await pool.query(`
                INSERT INTO monster_spawns (zone_id, monster_id, x, y, level_override, respawn_time)
                VALUES ($1, $2, $3, $4, $5, $6)
            `, [zoneId, monsterId, x, y, levelOverride ?? null, respawnTime ?? null]);
        }
        res.json({ success: true });
    } catch (err) {
        console.error('[Admin] Error saving spawn:', err);
        res.status(500).json({ error: 'Failed to save spawn' });
    }
});

// Remover spawn
app.delete('/api/admin/spawns/:id', async (req: Request, res: Response): Promise<void> => {
    try {
        await pool.query('DELETE FROM monster_spawns WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        console.error('[Admin] Error deleting spawn:', err);
        res.status(500).json({ error: 'Failed to delete spawn' });
    }
});

// Adicionar/Atualizar Drop
app.post('/api/admin/drops/save', async (req: Request, res: Response): Promise<void> => {
    const { monster_id, item_id, chance, min_quantity, max_quantity } = req.body;
    try {
        await pool.query(`
            INSERT INTO monster_drops (monster_id, item_id, chance, min_quantity, max_quantity)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (monster_id, item_id) DO UPDATE SET
                chance = EXCLUDED.chance,
                min_quantity = EXCLUDED.min_quantity,
                max_quantity = EXCLUDED.max_quantity
        `, [monster_id, item_id, chance, min_quantity, max_quantity]);
        res.json({ success: true });
    } catch (err) {
        console.error('[Admin] Error saving drop:', err);
        res.status(500).json({ error: 'Failed to save drop' });
    }
});

// Remover Drop
app.delete('/api/admin/drops/:id', async (req: Request, res: Response): Promise<void> => {
    try {
        await pool.query('DELETE FROM monster_drops WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        console.error('[Admin] Error deleting drop:', err);
        res.status(500).json({ error: 'Failed to delete drop' });
    }
});

// Hot Reload
app.post('/api/admin/reload', async (req: Request, res: Response): Promise<void> => {
    try {
        await loadGameDataFromDB();

res.json({ success: true, message: 'Game data reloaded!' });
    } catch (err) {
        console.error('[Admin] Error reloading data:', err);
        res.status(500).json({ error: 'Failed to reload data' });
    }
});

/**
 * ✅ NOVO: Salvar configuração visual de um item específico
 */
app.post('/api/admin/visual/migrate-item-visuals', async (_req: Request, res: Response): Promise<void> => {
    try {
        const itemsRes = await pool.query(`
            SELECT id, type, item_type, data
            FROM item_templates
            WHERE visual_config_id IS NULL
              AND data ? 'visualLayers'
              AND jsonb_typeof(data->'visualLayers') = 'array'
              AND jsonb_array_length(data->'visualLayers') > 0
            ORDER BY id ASC
        `);

        const nextTargetByType = new Map<string, number>();
        const getNextTargetId = async (type: string) => {
            if (!nextTargetByType.has(type)) {
                const maxRes = await pool.query(
                    'SELECT COALESCE(MAX(target_id), 0) as max FROM visual_configs WHERE type = $1',
                    [type]
                );
                nextTargetByType.set(type, Number(maxRes.rows[0]?.max || 0));
            }
            const next = (nextTargetByType.get(type) || 0) + 1;
            nextTargetByType.set(type, next);
            return next;
        };

        const toVisualType = (itemType: string) => {
            const t = String(itemType || '').toLowerCase();
            if (t === 'weapon') return 'WEAPON';
            if (t === 'armor') return 'ARMOR';
            if (t === 'accessory') return 'HAT';
            return 'ARMOR';
        };

        let migrated = 0;
        for (const row of itemsRes.rows) {
            const layers = row?.data?.visualLayers;
            if (!Array.isArray(layers) || layers.length === 0) continue;

            const vt = toVisualType(row.item_type || row.type);
            const targetId = await getNextTargetId(vt);
            const insertRes = await pool.query(
                `INSERT INTO visual_configs (type, target_id, layers, overrides)
                 VALUES ($1, $2, $3::jsonb, '{}'::jsonb)
                 RETURNING id`,
                [vt, targetId, JSON.stringify(layers)]
            );

            const visualConfigId = insertRes.rows[0]?.id;
            if (!visualConfigId) continue;

            await pool.query('UPDATE item_templates SET visual_config_id = $1 WHERE id = $2', [visualConfigId, row.id]);
            migrated++;
        }

        if (migrated > 0) {
            await loadGameDataFromDB();

}

        res.json({ success: true, migrated });
    } catch (err) {
        console.error('[Admin] Error migrating item visuals:', err);
        res.status(500).json({ error: 'Failed to migrate item visuals' });
    }
});

/**
 * ✅ NOVO: Carregar configuração visual de um item
 */
app.get('/api/admin/visual/item/:itemId', async (req: Request, res: Response): Promise<void> => {
    try {
        const { itemId } = req.params;
        const result = await pool.query('SELECT visual_config_id FROM item_templates WHERE id = $1', [itemId]);
        if (result.rows.length === 0) {
            res.status(404).json({ error: 'Item not found' });
            return;
        }
        const visualConfigId = result.rows[0].visual_config_id ?? null;
        if (!visualConfigId) {
            res.json({ visualConfigId: null, layers: [] });
            return;
        }
        const configRes = await pool.query('SELECT layers FROM visual_configs WHERE id = $1', [visualConfigId]);
        const layers = configRes.rows[0]?.layers || [];
        res.json({ visualConfigId, layers });
    } catch (err) {
        console.error('[Admin] Error loading item visual:', err);
        res.status(500).json({ error: 'Failed to load' });
    }
});

// ==================== ITEMS ROUTES ====================

// Listar Items
app.get('/api/admin/items', async (req: Request, res: Response): Promise<void> => {
    try {
        const result = await pool.query('SELECT * FROM item_templates ORDER BY id ASC');
        res.json(result.rows);
    } catch (err) {
        console.error('[Admin] Error loading items:', err);
        res.status(500).json({ error: 'Failed to load items' });
    }
});

// Salvar/Atualizar Item
// ✅ SUBSTITUIR endpoint completamente
app.post('/api/admin/items/save', async (req: Request, res: Response): Promise<void> => {
    const { 
        id, name, description, type, grade, stackable, 
        is_equipable, equip_slot, item_type, visual_config_id
    } = req.body;
    
    // ✅ NOVO: Log detalhado ANTES de salvar
    console.log(`💾 Salvando item ${id}:`, {
        is_equipable,
        equip_slot,
        stackable,
        item_type
    });
    
    // ✅ VALIDAÇÃO: Equipável sem slot é inválido
    if (is_equipable && !equip_slot) {
        res.status(400).json({ 
            error: 'Item equipável precisa ter um slot definido' 
        });
        return;
    }
    
    try {
        const result = await pool.query(`
            INSERT INTO item_templates (
                id, name, description, type, grade, stackable, 
                is_equipable, equip_slot, item_type, visual_config_id
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name,
                description = EXCLUDED.description,
                type = EXCLUDED.type,
                grade = EXCLUDED.grade,
                stackable = EXCLUDED.stackable,
                is_equipable = EXCLUDED.is_equipable,
                equip_slot = EXCLUDED.equip_slot,
                item_type = EXCLUDED.item_type,
                visual_config_id = EXCLUDED.visual_config_id
            RETURNING *
        `, [
            id, 
            name, 
            description, 
            type, 
            grade || null,          // ✅ MUDOU: null se vazio
            stackable || false,     // ✅ MUDOU: sempre boolean
            is_equipable || false,  // ✅ MUDOU: sempre boolean
            equip_slot || null,     // ✅ MUDOU: null se vazio
            item_type || type,      // ✅ MUDOU: fallback para type
            visual_config_id || null
        ]);
        
        // ✅ NOVO: Log do que foi salvo
        console.log('✅ Item salvo no banco:', result.rows[0]);
        
        // ✅ NOVO: Hot reload automático
        await loadGameDataFromDB();

res.json({ 
            success: true, 
            item: result.rows[0]  // ✅ NOVO: retornar o item salvo
        });
    } catch (err: any) {
        console.error('[Admin] Erro ao salvar item:', err.message);
        res.status(500).json({ error: 'Falha ao salvar no banco de dados' });
    }
});

app.get('/api/items', async (req: Request, res: Response): Promise<void> => {
    try {
        const visualConfigsRes = await pool.query('SELECT id, layers FROM visual_configs');
        const visualConfigMap = new Map<number, any>();
        visualConfigsRes.rows.forEach(row => {
            if (row?.id) visualConfigMap.set(row.id, row.layers);
        });

        const result = await pool.query(`
            SELECT 
                id,
                name,
                description,
                type,
                grade,
                stackable,
                is_equipable,
                equip_slot,
                item_type,
                data,
                visual_config_id
            FROM item_templates
            ORDER BY id ASC
        `);
        
        // ✅ Formatar para o client
        const formattedItems = result.rows.map(item => ({
            visualConfigId: item.visual_config_id ?? null,
            id: item.id,
            name: item.name,
            description: item.description,
            type: item.type,
            grade: item.grade,
            stackable: item.stackable === true,
            isEquipable: item.is_equipable === true,
            equipSlot: item.equip_slot || null,
            itemType: item.item_type || item.type,
            data: (() => {
                const base = item.data || {};
                const visualConfigId = item.visual_config_id ?? null;
                if (visualConfigId && visualConfigMap.has(visualConfigId)) {
                    return { ...base, visualLayers: visualConfigMap.get(visualConfigId) || [] };
                }
                return base;
            })()
        }));
        
        console.log(`[API] Enviando ${formattedItems.length} templates de itens para o cliente.`);
        res.json(formattedItems);
    } catch (err) {
        console.error('[API] Erro ao buscar itens:', err);
        res.status(500).json({ error: 'Erro ao carregar itens' });
    }
});

// ==================== VISUAL LAYER SYSTEM ====================

/**
 * Salvar configuração global de camadas visuais
 */
async function loadGlobalLayersFromDB(): Promise<any[]> {
    const res = await pool.query('SELECT * FROM global_visual_layers ORDER BY z_index ASC');
    if (res.rows.length > 0) return res.rows;

    const configPath = path.join(__dirname, '../../shared/src/data/visualLayers.json');
    if (!fs.existsSync(configPath)) return [];

    const data = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(data);
    const layers = Array.isArray(config?.layers) ? config.layers : [];
    if (layers.length === 0) return [];

    await pool.query('DELETE FROM global_visual_layers');
    for (let i = 0; i < layers.length; i++) {
        const layer = layers[i];
        await pool.query(`
            INSERT INTO global_visual_layers
              (layer_type, asset_file, x_offset, y_offset, scale, rotation, z_index, width, height)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [
            layer.type,
            layer.asset,
            layer.offsetX || 0,
            layer.offsetY || 0,
            layer.scale || 1.0,
            layer.rotation || 0,
            i,
            layer.width || 58,
            layer.height || 58
        ]);
    }

    const migrated = await pool.query('SELECT * FROM global_visual_layers ORDER BY z_index ASC');
    return migrated.rows;
}

app.post('/api/admin/visual/save-global-layers', async (req: Request, res: Response): Promise<void> => {
    const { layers } = req.body;

    if (!layers || !Array.isArray(layers)) {
        res.status(400).json({ error: 'Invalid layers data' });
        return;
    }

    try {
        await pool.query('DELETE FROM global_visual_layers');
        for (let i = 0; i < layers.length; i++) {
            const layer = layers[i];
            await pool.query(`
                INSERT INTO global_visual_layers
                  (layer_type, asset_file, x_offset, y_offset, scale, rotation, z_index, width, height)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            `, [
                layer.type,
                layer.asset,
                layer.offsetX || 0,
                layer.offsetY || 0,
                layer.scale || 1.0,
                layer.rotation || 0,
                i,
                layer.width || 58,
                layer.height || 58
            ]);
        }

        console.info(`✅ [Admin] Configuração global de camadas salva: ${layers.length} camadas`);
        res.json({ success: true, layersCount: layers.length });
    } catch (err) {
        console.error('[Admin] Error saving visual layers:', err);
        res.status(500).json({ error: 'Failed to save configuration' });
    }
});

/**
 * Carregar configuração global de camadas
 */
app.get('/api/admin/visual/global-layers', async (_req: Request, res: Response): Promise<void> => {
    try {
        const rows = await loadGlobalLayersFromDB();
        const layers = rows.map((row: any) => ({
            type: row.layer_type,
            asset: row.asset_file,
            offsetX: row.x_offset ?? 0,
            offsetY: row.y_offset ?? 0,
            scale: Number(row.scale ?? 1),
            rotation: Number(row.rotation ?? 0),
            width: row.width ?? 58,
            height: row.height ?? 58,
            zIndex: row.z_index ?? 0
        }));
        res.json({ layers });
    } catch (err) {
        console.error('[Admin] Error loading visual layers:', err);
        res.status(500).json({ error: 'Failed to load configuration' });
    }
});

app.get('/api/visual/global-layers', async (_req: Request, res: Response): Promise<void> => {
    try {
        const rows = await loadGlobalLayersFromDB();
        const layers = rows.map((row: any) => ({
            type: row.layer_type,
            asset: row.asset_file,
            offsetX: row.x_offset ?? 0,
            offsetY: row.y_offset ?? 0,
            scale: Number(row.scale ?? 1),
            rotation: Number(row.rotation ?? 0),
            width: row.width ?? 58,
            height: row.height ?? 58,
            zIndex: row.z_index ?? 0
        }));
        res.json({ layers });
    } catch (err) {
        console.error('[Visual] Error loading global layers:', err);
        res.status(500).json({ error: 'Failed to load global layers' });
    }
});

// ==================== VISUAL SETTINGS ROUTES ====================

// Salvar Configurações Visuais (vinculado a item)
app.post('/api/admin/visual/save', async (req: Request, res: Response): Promise<void> => {
    const { itemId, layerType, assetFile, yOffset, xOffset, scale, rotation } = req.body;
    
    try {
        const itemRes = await pool.query('SELECT data FROM item_templates WHERE id = $1', [itemId]);
        
        if (itemRes.rows.length === 0) {
            res.status(404).json({ error: 'Item não encontrado' });
            return;
        }

        const currentData = itemRes.rows[0].data || {};
        const visualConfig = {
            ...currentData,
            visual: {
                layerType,
                assetFile,
                yOffset: yOffset || 0,
                xOffset: xOffset || 0,
                scale: scale || 1.0,
                rotation: rotation || 0
            }
        };

        await pool.query(
            'UPDATE item_templates SET data = $1 WHERE id = $2',
            [JSON.stringify(visualConfig), itemId]
        );

        console.info(`[Admin] Visual settings saved for item: ${itemId}`);
        res.json({ success: true });
    } catch (err) {
        console.error('[Admin] Error saving visual settings:', err);
        res.status(500).json({ error: 'Failed to save visual settings' });
    }
});

// Salvar Configurações Visuais Globais (sem item)
app.post('/api/admin/visual/save-global', async (req: Request, res: Response): Promise<void> => {
    const { bodyType, layerType, assetFile, yOffset, xOffset, scale, rotation } = req.body;
    
    try {
        await pool.query(`
            INSERT INTO global_visual_settings (body_type, layer_type, asset_file, y_offset, x_offset, scale, rotation)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (body_type, layer_type) DO UPDATE SET
                asset_file = EXCLUDED.asset_file,
                y_offset = EXCLUDED.y_offset,
                x_offset = EXCLUDED.x_offset,
                scale = EXCLUDED.scale,
                rotation = EXCLUDED.rotation
        `, [bodyType, layerType, assetFile, yOffset || 0, xOffset || 0, scale || 1.0, rotation || 0]);

        console.info(`[Admin] Global visual settings saved: ${bodyType} - ${layerType}`);
        res.json({ success: true });
    } catch (err) {
        console.error('[Admin] Error saving global visual:', err);
        res.status(500).json({ error: 'Failed to save global visual settings' });
    }
});

// Listar Configurações Visuais Globais
app.get('/api/admin/visual/global', async (req: Request, res: Response): Promise<void> => {
    try {
        const result = await pool.query('SELECT * FROM global_visual_settings ORDER BY body_type, layer_type');
        res.json(result.rows);
    } catch (err) {
        console.error('[Admin] Error loading global visuals:', err);
        res.status(500).json({ error: 'Failed to load global visual settings' });
    }
});

// Salvar Visual do Player (para CombatRoom usar)
app.post('/api/admin/player/save-visual', async (req: Request, res: Response): Promise<void> => {
    const { charName, visualBody, visualFace, visualHat } = req.body;
    
    try {
        await pool.query(`
            UPDATE characters 
            SET visual_body = $1, visual_face = $2, visual_hat = $3
            WHERE char_name = $4
        `, [visualBody, visualFace, visualHat, charName]);
        
        console.info(`[Admin] Visual updated for ${charName}`);
        res.json({ success: true });
    } catch (err) {
        console.error('[Admin] Error saving player visual:', err);
        res.status(500).json({ error: 'Failed to save visual' });
    }
});

// Listar todos os personagens
app.get('/api/admin/characters', async (req: Request, res: Response): Promise<void> => {
    try {
        const result = await pool.query(`
            SELECT char_name, level, class_type, 
                   visual_body, visual_face, visual_hat,
                   face_offset_x, face_offset_y, face_scale,
                   hat_offset_x, hat_offset_y, hat_scale
            FROM characters 
            ORDER BY char_name ASC
        `);
        res.json(result.rows);
    } catch (err) {
        console.error('[Admin] Error loading characters:', err);
        res.status(500).json({ error: 'Failed' });
    }
});

// Buscar visuais de um personagem específico
app.get('/api/admin/characters/:charName/visuals', async (req: Request, res: Response): Promise<void> => {
    try {
        const { charName } = req.params;
        const result = await pool.query(`
            SELECT visual_body, visual_face, visual_hat,
                   face_offset_x, face_offset_y, face_scale, face_rotation, face_width, face_height,
                   hat_offset_x, hat_offset_y, hat_scale, hat_rotation, hat_width, hat_height
            FROM characters 
            WHERE char_name = $1
        `, [charName]);
        
        if (result.rows.length === 0) {
            res.status(404).json({ error: 'Character not found' });
            return;
        }
        
        res.json(result.rows[0]);
    } catch (err) {
        console.error('[Admin] Error:', err);
        res.status(500).json({ error: 'Failed' });
    }
});

// Resetar visuais
app.post('/api/admin/player/reset-visuals', async (req: Request, res: Response): Promise<void> => {
    const { charName } = req.body;
    
    try {
        if (charName === 'ALL') {
            await pool.query(`
                UPDATE characters SET
                    visual_body = 'ball_red',
                    visual_face = 'eyes_determined',
                    visual_hat = 'none',
                    face_offset_x = 0,
                    face_offset_y = 5,
                    face_scale = 1.0,
                    face_rotation = 0,
                    face_width = 35,
                    face_height = 18,
                    hat_offset_x = 0,
                    hat_offset_y = -20,
                    hat_scale = 1.0,
                    hat_rotation = 0,
                    hat_width = 60,
                    hat_height = 45
            `);
            console.info('[Admin] All characters visual reset');
        } else {
            await pool.query(`
                UPDATE characters SET
                    visual_body = 'ball_red',
                    visual_face = 'eyes_determined',
                    visual_hat = 'none',
                    face_offset_x = 0,
                    face_offset_y = 5,
                    face_scale = 1.0,
                    face_rotation = 0,
                    face_width = 35,
                    face_height = 18,
                    hat_offset_x = 0,
                    hat_offset_y = -20,
                    hat_scale = 1.0,
                    hat_rotation = 0,
                    hat_width = 60,
                    hat_height = 45
                WHERE char_name = $1
            `, [charName]);
            console.info(`[Admin] Visual reset for ${charName}`);
        }
        
        res.json({ success: true });
    } catch (err) {
        console.error('[Admin] Error:', err);
        res.status(500).json({ error: 'Failed' });
    }
});

app.post('/api/admin/player/save-visual-detailed', async (req: Request, res: Response): Promise<void> => {
    const { 
        charName, 
        visualField, 
        assetFile, 
        offsetXField, 
        offsetXValue, 
        offsetYField, 
        offsetYValue,
        scaleField,
        scaleValue,
        rotationField,
        rotationValue
    } = req.body;
    
    try {
        const updates: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        if (visualField && assetFile) {
            updates.push(`${visualField} = $${paramIndex++}`);
            values.push(assetFile.replace('.png', ''));
        }

        if (offsetXField !== undefined) {
            updates.push(`${offsetXField} = $${paramIndex++}`);
            values.push(offsetXValue);
        }

        if (offsetYField !== undefined) {
            updates.push(`${offsetYField} = $${paramIndex++}`);
            values.push(offsetYValue);
        }

        if (scaleField !== undefined) {
            updates.push(`${scaleField} = $${paramIndex++}`);
            values.push(scaleValue);
        }

        if (rotationField !== undefined) {
            updates.push(`${rotationField} = $${paramIndex++}`);
            values.push(rotationValue);
        }

        values.push(charName);

        await pool.query(`
            UPDATE characters 
            SET ${updates.join(', ')}
            WHERE char_name = $${paramIndex}
        `, values);
        
        console.info(`[Admin] Visual updated for ${charName}`);
        res.json({ success: true });
    } catch (err) {
        console.error('[Admin] Error:', err);
        res.status(500).json({ error: 'Failed' });
    }
});

// ==================== VISUAL CONFIGS API ====================

app.get('/api/admin/visual/configs', async (_req: Request, res: Response): Promise<void> => {
    try {
        const result = await pool.query('SELECT * FROM visual_configs ORDER BY id ASC');
        res.json(result.rows);
    } catch (err) {
        console.error('[Admin] Error loading visual configs:', err);
        res.status(500).json({ error: 'Failed to load visual configs' });
    }
});

app.post('/api/admin/visual/configs/save', async (req: Request, res: Response): Promise<void> => {
    const { id, type, targetId, layers, overrides } = req.body;
    if (!type || targetId === undefined || !Array.isArray(layers)) {
        res.status(400).json({ error: 'Invalid visual config data' });
        return;
    }

    try {
        if (id) {
            await pool.query(
                `UPDATE visual_configs
                 SET type = $1, target_id = $2, layers = $3::jsonb, overrides = $4::jsonb, updated_at = NOW()
                 WHERE id = $5`,
                [type, targetId, JSON.stringify(layers), JSON.stringify(overrides || {}), id]
            );
        } else {
            await pool.query(
                `INSERT INTO visual_configs (type, target_id, layers, overrides)
                 VALUES ($1, $2, $3::jsonb, $4::jsonb)`,
                [type, targetId, JSON.stringify(layers), JSON.stringify(overrides || {})]
            );
        }
        res.json({ success: true });
    } catch (err) {
        console.error('[Admin] Error saving visual config:', err);
        res.status(500).json({ error: 'Failed to save visual config' });
    }
});

app.delete('/api/admin/visual/configs/:id', async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    try {
        await pool.query('UPDATE item_templates SET visual_config_id = NULL WHERE visual_config_id = $1', [id]);
        await pool.query('DELETE FROM visual_configs WHERE id = $1', [id]);
        await loadGameDataFromDB();

res.json({ success: true });
    } catch (err) {
        console.error('[Admin] Error deleting visual config:', err);
        res.status(500).json({ error: 'Failed to delete visual config' });
    }
});

app.post('/api/admin/visual/items/assign', async (req: Request, res: Response): Promise<void> => {
    const { itemId, visualConfigId } = req.body;
    if (!itemId) {
        res.status(400).json({ error: 'itemId required' });
        return;
    }
    try {
        await pool.query('UPDATE item_templates SET visual_config_id = $1 WHERE id = $2', [
            visualConfigId ?? null,
            itemId
        ]);
        await loadGameDataFromDB();

res.json({ success: true });
    } catch (err) {
        console.error('[Admin] Error assigning visual config:', err);
        res.status(500).json({ error: 'Failed to assign visual config' });
    }
});




/**
 * ✅ Retornar configs visuais para o client
 */
app.get('/api/visual/configs', async (_req: Request, res: Response): Promise<void> => {
    try {
        const result = await pool.query('SELECT * FROM visual_configs');
        if (result.rows.length === 0) {
            res.json(VISUAL_CONFIGS);
            return;
        }
        const configs: Record<string, any> = {};
        result.rows.forEach(row => {
            const key = `${String(row.type).toUpperCase()}_${row.target_id}`;
            configs[key] = {
                id: row.id,
                type: String(row.type).toUpperCase(),
                targetId: row.target_id,
                layers: row.layers || [],
                overrides: row.overrides || {}
            };
        });
        res.json({ version: 'db', lastUpdated: new Date().toISOString(), configs });
    } catch (err) {
        console.error('[Visual] Error loading configs:', err);
        res.status(500).json({ error: 'Failed to load visual configs' });
    }
});

/**
 * ?o. Buscar config espec??fica
 */
app.get('/api/visual/config/:type/:targetId', async (req: Request, res: Response): Promise<void> => {
    const { type, targetId } = req.params;
    try {
        const result = await pool.query('SELECT * FROM visual_configs WHERE type = $1 AND target_id = $2', [
            type.toUpperCase(),
            Number(targetId)
        ]);
        if (result.rows.length === 0) {
            const key = `${type.toUpperCase()}_${targetId}`;
            const fallback = VISUAL_CONFIGS.configs[key];
            if (!fallback) {
                res.status(404).json({ error: 'Config not found' });
                return;
            }
            res.json(fallback);
            return;
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error('[Visual] Error loading config:', err);
        res.status(500).json({ error: 'Failed to load visual config' });
    }
});


// ==================== AUTH ROUTES ====================

/**
 * ✅ CORRIGIDO: Endpoint de Login
 */
app.post("/api/login", async (req: Request, res: Response): Promise<void> => {
    const { username } = req.body;
    
    if (!username) {
        res.status(400).json({ error: 'Username is required' });
        return;
    }

    try {
        // Verificar se a conta existe
        let accountRes = await pool.query(
            "SELECT id, username FROM accounts WHERE username = $1", 
            [username]
        );

        // Se não existir, criar nova conta
        if (accountRes.rows.length === 0) {
            accountRes = await pool.query(
                "INSERT INTO accounts (username) VALUES ($1) RETURNING *", 
                [username]
            );
        }

        const account = accountRes.rows[0];

        // Buscar personagens da conta
        const charRes = await pool.query(
            "SELECT id, char_name, class_type, level FROM characters WHERE account_id = $1",
            [account.id]
        );

        res.json({ 
            exists: charRes.rows.length > 0, 
            accountId: account.id,
            characters: charRes.rows 
        });
    } catch (error: any) {
        console.error('[Auth] Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * ✅ Health Check Endpoint
 */
app.get('/health', (_req, res) => {
    res.json({ 
        status: 'ok', 
        uptime: process.uptime(),
        database: pool.totalCount > 0 ? 'connected' : 'connecting' 
    });
});

/**
 * ✅ Root Endpoint (para evitar "Cannot GET /")
 */
app.get('/', (_req, res) => {
    res.json({
        name: 'ZYRA Server',
        version: '1.0.0',
        endpoints: {
            health: '/health',
            login: '/api/login',
            admin: '/admin',
            dashboard: '/dashboard'
        }
    });
});

// ==================== GAME SERVER ====================

const port = parseInt(process.env.PORT || '2567');
const httpServer = createServer(app);

const gameServer = new Server({
  transport: new WebSocketTransport({
    server: httpServer,
    pingInterval: 5000,
    pingMaxRetries: 3,
  })
});

gameServer.define('lobby', LobbyRoom);
gameServer.define('world', WorldRoom);
gameServer.define('combat', CombatRoom);

app.get('/health', (_req, res) => {
  res.json({ 
    status: 'ok', 
    uptime: process.uptime(),
    database: pool.totalCount > 0 ? 'connected' : 'connecting' 
  });
});

// ==================== DATA LOADING ====================

// ✅ SUBSTITUIR função completamente
async function loadGameDataFromDB() {
    console.info("📦 Loading game templates from database...");

    // Carregar Monstros
    const monstersRes = await pool.query('SELECT * FROM monster_templates');
    const dropsRes = await pool.query('SELECT * FROM monster_drops');

    const fullMonsterTemplates = monstersRes.rows.map(m => {
        return {
            ...m,
            rewards: {
                ...m.rewards,
                drops: dropsRes.rows
                    .filter(d => d.monster_id === m.id)
                    .map(d => ({
                        itemId: d.item_id,
                        chance: parseFloat(d.chance),
                        min: d.min_quantity,
                        max: d.max_quantity
                    }))
            }
        };
    });

    MonsterRegistry.setTemplates(fullMonsterTemplates);

    // Carregar Buffs/Debuffs (templates)
    const buffsRes = await pool.query('SELECT * FROM buff_templates');
    BuffTemplateRegistry.setTemplates(buffsRes.rows);

    // Carregar base stats de classes (apenas para novos chars)
    const classStatsRes = await pool.query('SELECT * FROM class_base_stats');
    ClassBaseStatsRegistry.setTemplates(classStatsRes.rows);

    // ✅ CRÍTICO: Query explícita de TODOS os campos
    const itemsRes = await pool.query(`
        SELECT 
            id,
            name,
            description,
            type,
            grade,
            stackable,
            is_equipable,
            equip_slot,
            item_type,
            data,
            visual_config_id
        FROM item_templates
        ORDER BY id ASC
    `);
    
    console.info(`📦 Carregados ${itemsRes.rowCount} itens do banco`);
    
    // ✅ NOVO: Log CADA item para ver o que está vindo
    const visualConfigsRes = await pool.query('SELECT id, layers FROM visual_configs');
    const visualConfigMap = new Map<number, any>();
    visualConfigsRes.rows.forEach(row => {
        if (row?.id) visualConfigMap.set(row.id, row.layers);
    });

    const formattedItems = itemsRes.rows.map(item => {
        // ✅ CRÍTICO: Normalizar nomes de campos
        const normalized = {
            id: item.id,
            name: item.name,
            description: item.description,
            type: item.type,
            grade: item.grade,
            stackable: item.stackable === true,           // ✅ Forçar boolean
            isEquipable: item.is_equipable === true,      // ✅ Forçar boolean
            equipSlot: item.equip_slot || null,           // ✅ Garantir null se vazio
            itemType: item.item_type || item.type,
            data: item.data || {},
            visualConfigId: item.visual_config_id ?? null
        };

        if (normalized.visualConfigId && visualConfigMap.has(normalized.visualConfigId)) {
            const layers = visualConfigMap.get(normalized.visualConfigId);
            normalized.data = {
                ...(normalized.data || {}),
                visualLayers: layers || []
            };
        }
        
        // ✅ NOVO: Log de cada item equipável
        if (normalized.isEquipable) {
            console.info(`   ✓ ${normalized.id} → equipSlot: ${normalized.equipSlot}, type: ${normalized.itemType}`);
        }
        
        return normalized;
    });
    
    ItemRegistry.setTemplates(formattedItems);

    console.info(`✅ Game data loaded: ${monstersRes.rowCount} monsters, ${formattedItems.length} items.`);
    
    // ✅ NOVO: Log final de itens equipáveis
    const equipableCount = formattedItems.filter(i => i.isEquipable).length;
    console.info(`   📌 Total de itens equipáveis: ${equipableCount}`);
}

// ==================== BOOTSTRAP ====================

async function bootstrap() {
  try {
    console.info("⚙️  Initializing systems...");

    await pool.query('SELECT NOW()');
    console.info("🐘 Database connection established.");

    await loadGameDataFromDB();


    const maxPort = 2575;
    const findFreePort = async (startPort: number): Promise<number> => {
        for (let p = startPort; p <= maxPort; p += 1) {
            const isFree = await new Promise<boolean>((resolve) => {
                const tester = require('net').createServer();
                tester.once('error', (err: any) => {
                    if (err?.code === 'EADDRINUSE') resolve(false);
                    else resolve(false);
                });
                tester.once('listening', () => {
                    tester.close(() => resolve(true));
                });
                tester.listen(p, '0.0.0.0');
            });
            if (isFree) return p;
            if (p < maxPort) {
                console.warn(`Port ${p} in use, trying ${p + 1}...`);
            }
        }
        throw new Error(`No free port found between ${startPort} and ${maxPort}`);
    };

    const boundPort = await findFreePort(port);
    await gameServer.listen(boundPort);
    console.info(`\nZYRA Server is live!`);
    console.info(`Port: ${boundPort}`);
    console.info(`Mode: ${process.env.NODE_ENV || 'development'}\n`);

  } catch (err) {
    console.error('[Admin] Error reloading data:', err);
    
    console.error("❌ Fatal error during server bootstrap:");
    console.error(err);
    process.exit(1); 
  }
}

bootstrap();
