import { Server } from 'colyseus';
import { createServer } from 'http';
import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { WebSocketTransport } from '@colyseus/ws-transport';
import fs from 'fs';
import path from 'path';
import { ItemRegistry, MonsterRegistry } from '@zyra/shared';  
import { VISUAL_CONFIGS } from '@zyra/shared/src/data/visualConfigs';
import { pool } from './database/db';


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

/**
 * ✅ NOVO: Salvar configuração visual de um item específico
 */
app.post('/api/admin/visual/save-item-config', async (req: Request, res: Response): Promise<void> => {
    const { itemId, layers } = req.body;
    
    if (!itemId || !layers) {
        res.status(400).json({ error: 'itemId and layers required' });
        return;
    }

    try {
        // ✅ Salvar no campo data do item
        await pool.query(`
            UPDATE item_templates 
            SET data = jsonb_set(
                COALESCE(data, '{}'::jsonb), 
                '{visualLayers}', 
                $1::jsonb
            )
            WHERE id = $2
        `, [JSON.stringify(layers), itemId]);
        
        console.info(`[Admin] Visual layers saved for item: ${itemId}`);
        
        // ✅ Hot reload automático
        await loadGameDataFromDB();
        
        res.json({ success: true });
    } catch (err) {
        console.error('[Admin] Error saving item visual config:', err);
        res.status(500).json({ error: 'Failed to save' });
    }
});

/**
 * ✅ NOVO: Carregar configuração visual de um item
 */
app.get('/api/admin/visual/item/:itemId', async (req: Request, res: Response): Promise<void> => {
    try {
        const { itemId } = req.params;
        const result = await pool.query(
            'SELECT data FROM item_templates WHERE id = $1',
            [itemId]
        );
        
        if (result.rows.length === 0) {
            res.status(404).json({ error: 'Item not found' });
            return;
        }
        
        const visualLayers = result.rows[0].data?.visualLayers || [];
        res.json({ layers: visualLayers });
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
        is_equipable, equip_slot, item_type
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
                is_equipable, equip_slot, item_type
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name,
                description = EXCLUDED.description,
                type = EXCLUDED.type,
                grade = EXCLUDED.grade,
                stackable = EXCLUDED.stackable,
                is_equipable = EXCLUDED.is_equipable,
                equip_slot = EXCLUDED.equip_slot,
                item_type = EXCLUDED.item_type
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
            item_type || type       // ✅ MUDOU: fallback para type
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
                data
            FROM item_templates
            ORDER BY id ASC
        `);
        
        // ✅ Formatar para o client
        const formattedItems = result.rows.map(item => ({
            id: item.id,
            name: item.name,
            description: item.description,
            type: item.type,
            grade: item.grade,
            stackable: item.stackable === true,
            isEquipable: item.is_equipable === true,
            equipSlot: item.equip_slot || null,
            itemType: item.item_type || item.type,
            data: item.data || {}
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
app.post('/api/admin/visual/save-global-layers', async (req: Request, res: Response): Promise<void> => {
    const { layers } = req.body;
    
    if (!layers || !Array.isArray(layers)) {
        res.status(400).json({ error: 'Invalid layers data' });
        return;
    }

    try {
        const configPath = path.join(__dirname, '../../shared/src/data/visualLayers.json');
        
        // Garantir que o diretório existe
        const dir = path.dirname(configPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        const config = {
            version: '2.0',
            lastUpdated: new Date().toISOString(),
            layers: layers.map((layer: any, index: number) => ({
                zIndex: index,
                type: layer.type,
                asset: layer.asset,
                offsetX: layer.offsetX || 0,
                offsetY: layer.offsetY || 0,
                scale: layer.scale || 1.0,
                rotation: layer.rotation || 0,
                width: layer.width || 58,
                height: layer.height || 58
            }))
        };

        fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
        
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
app.get('/api/admin/visual/global-layers', (req: Request, res: Response): void => {
    try {
        const configPath = path.join(__dirname, '../../shared/src/data/visualLayers.json');
        
        if (!fs.existsSync(configPath)) {
            res.json({ layers: [] });
            return;
        }

        const data = fs.readFileSync(configPath, 'utf8');
        const config = JSON.parse(data);
        
        res.json(config);
    } catch (err) {
        console.error('[Admin] Error loading visual layers:', err);
        res.status(500).json({ error: 'Failed to load configuration' });
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

/**
 * ✅ Retornar configs visuais para o client
 */
app.get('/api/visual/configs', (_req: Request, res: Response): void => {
    try {
        res.json(VISUAL_CONFIGS);
    } catch (err) {
        console.error('[Visual] Error loading configs:', err);
        res.status(500).json({ error: 'Failed to load visual configs' });
    }
});

/**
 * ✅ Buscar config específica
 */
app.get('/api/visual/config/:type/:targetId', (req: Request, res: Response): void => {
    const { type, targetId } = req.params;
    const key = `${type.toUpperCase()}_${targetId}`;
    
    const config = VISUAL_CONFIGS.configs[key];
    
    if (!config) {
        res.status(404).json({ error: 'Config not found' });
        return;
    }
    
    res.json(config);
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
            data
        FROM item_templates
        ORDER BY id ASC
    `);
    
    console.info(`📦 Carregados ${itemsRes.rowCount} itens do banco`);
    
    // ✅ NOVO: Log CADA item para ver o que está vindo
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
            data: item.data || {}
        };
        
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

    await gameServer.listen(port);
    console.info(`\n🎮 ZYRA Server is live!`);
    console.info(`🚀 Port: ${port}`);
    console.info(`🌐 Mode: ${process.env.NODE_ENV || 'development'}\n`);

  } catch (err) {
    console.error('[Admin] Error reloading data:', err);
    
    console.error("❌ Fatal error during server bootstrap:");
    console.error(err);
    process.exit(1); 
  }
}

bootstrap();