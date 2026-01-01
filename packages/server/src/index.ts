import { Server } from 'colyseus';
import { createServer } from 'http';
import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { WebSocketTransport } from '@colyseus/ws-transport';
import fs from 'fs';
import path from 'path';
import { ItemRegistry, MonsterRegistry } from '@zyra/shared'; 
import { pool } from './database/db';

import { CombatRoom } from './rooms/CombatRoom';
import { WorldRoom } from './rooms/WorldRoom';
import { LobbyRoom } from './rooms/LobbyRoom';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use('/admin', express.static('public/admin.html'));

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
        res.json(result.rows);
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
    const publicPath = path.join(__dirname, '../../client/public/assets/sprites', folder);

    if (!fs.existsSync(publicPath)) {
        res.status(404).json({ error: 'Pasta não encontrada' });
        return;
    }

    fs.readdir(publicPath, (err, files) => {
        if (err) {
            console.error('[Admin] Error reading directory:', err);
            res.status(500).json({ error: 'Erro ao ler diretório' });
            return;
        }
        
        const images = files.filter(f => f.endsWith('.png') || f.endsWith('.jpg'));
        res.json(images);
    });
});

// Salvar/Atualizar Monstro
app.post('/api/admin/monsters/save', async (req: Request, res: Response): Promise<void> => {
    const { id, name, level, type, stats, behavior, rewards, appearance } = req.body;
    try {
        await pool.query(`
            INSERT INTO monster_templates (id, name, level, type, stats, behavior, rewards, appearance)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name,
                level = EXCLUDED.level,
                type = EXCLUDED.type,
                stats = EXCLUDED.stats,
                behavior = EXCLUDED.behavior,
                rewards = EXCLUDED.rewards,
                appearance = EXCLUDED.appearance
        `, [
            id, name, level, type, 
            JSON.stringify(stats), 
            JSON.stringify(behavior), 
            JSON.stringify(rewards),
            JSON.stringify(appearance)
        ]);
        
        res.json({ success: true });
    } catch (err) {
        console.error('[Admin] Error saving monster:', err);
        res.status(500).json({ error: 'Failed to save monster' });
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
app.post('/api/admin/items/save', async (req: Request, res: Response): Promise<void> => {
    const { id, name, description, type, grade, stackable, data } = req.body;
    try {
        await pool.query(`
            INSERT INTO item_templates (id, name, description, type, grade, stackable, data)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name,
                description = EXCLUDED.description,
                type = EXCLUDED.type,
                grade = EXCLUDED.grade,
                stackable = EXCLUDED.stackable,
                data = EXCLUDED.data
        `, [id, name, description, type, grade, stackable, JSON.stringify(data || {})]);
        
        res.json({ success: true });
    } catch (err) {
        console.error('[Admin] Error saving item:', err);
        res.status(500).json({ error: 'Failed to save item' });
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

// ==================== AUTH ROUTES ====================

app.post('/check-user', async (req: Request, res: Response): Promise<void> => {
    const { username } = req.body;
    try {
        const result = await pool.query('SELECT username, class_type, level FROM players WHERE username = $1', [username]);
        if (result.rows.length > 0) {
            res.json({ exists: true, user: result.rows[0] });
        } else {
            res.json({ exists: false });
        }
    } catch (err) {
        console.error('[Auth] Error checking user:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

app.post("/api/login", async (req: Request, res: Response): Promise<void> => {
    const { username } = req.body;
    try {
        let accountRes = await pool.query("SELECT id, username FROM accounts WHERE username = $1", [username]);
        if (accountRes.rows.length === 0) {
            accountRes = await pool.query("INSERT INTO accounts (username) VALUES ($1) RETURNING *", [username]);
        }
        const account = accountRes.rows[0];
        const charRes = await pool.query(
            "SELECT id, char_name, class_type, level FROM characters WHERE account_id = $1",
            [account.id]
        );
        res.json({ 
            exists: charRes.rows.length > 0, 
            accountId: account.id,
            characters: charRes.rows 
        });
    } catch (error) {
        console.error('[Auth] Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
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

async function loadGameDataFromDB() {
    console.info("📦 Loading game templates from database...");

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

    const itemsRes = await pool.query('SELECT * FROM item_templates');
    ItemRegistry.setTemplates(itemsRes.rows); 

    console.info(`✅ Game data loaded: ${monstersRes.rowCount} monsters, ${itemsRes.rowCount} items.`);
}

// ==================== BOOTSTRAP ====================

async function bootstrap() {
  try {
    console.info("⚙️  Initializing systems...");

    await pool.query('SELECT NOW()');
    console.info("🐘 Database connection established.");

    await loadGameDataFromDB();

    await gameServer.listen(port);
    console.info(`\n🎮 ZYRA Server is live!`);
    console.info(`🚀 Port: ${port}`);
    console.info(`🌐 Mode: ${process.env.NODE_ENV || 'development'}\n`);

  } catch (err) {
    console.error("❌ Fatal error during server bootstrap:");
    console.error(err);
    process.exit(1); 
  }
}

bootstrap();