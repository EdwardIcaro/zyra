// packages/server/src/routes/admin-users.ts

import { Router, Request, Response } from 'express';
import { pool } from '../database/db';

const router: Router = Router();

/**
 * GET /api/admin/users?q=query
 * Busca contas por username ou nome de personagem
 */
router.get('/users', async (req: Request, res: Response): Promise<void> => {
    const query = req.query.q as string;
    
    if (!query) {
        res.status(400).json({ error: 'Query parameter required' });
        return;
    }

    try {
        const result = await pool.query(`
            SELECT DISTINCT 
                a.id, 
                a.username, 
                a.created_at,
                COUNT(c.id) as character_count
            FROM accounts a
            LEFT JOIN characters c ON c.account_id = a.id
            WHERE 
                a.username ILIKE $1 
                OR c.char_name ILIKE $1
            GROUP BY a.id, a.username, a.created_at
            ORDER BY a.id DESC
            LIMIT 50
        `, [`%${query}%`]);
        
        const accounts = result.rows.map(row => ({
            id: row.id,
            username: row.username,
            createdAt: row.created_at,
            _count: { characters: parseInt(row.character_count) }
        }));
        
        res.json(accounts);
    } catch (err) {
        console.error('[AdminUsers] Error searching:', err);
        res.status(500).json({ error: 'Failed to search' });
    }
});

/**
 * GET /api/admin/user/:accountId
 * Detalhes completos da conta + personagens
 */
router.get('/user/:accountId', async (req: Request, res: Response): Promise<void> => {
    const { accountId } = req.params;
    
    try {
        const accRes = await pool.query('SELECT * FROM accounts WHERE id = $1', [accountId]);
        
        if (accRes.rows.length === 0) {
            res.status(404).json({ error: 'Account not found' });
            return;
        }
        
        const account = accRes.rows[0];
        
        const charsRes = await pool.query(
            'SELECT * FROM characters WHERE account_id = $1 ORDER BY level DESC', 
            [accountId]
        );
        
        res.json({
            ...account,
            characters: charsRes.rows
        });
    } catch (err) {
        console.error('[AdminUsers] Error loading account:', err);
        res.status(500).json({ error: 'Failed to load account' });
    }
});

/**
 * GET /api/admin/character/:charId
 * Dados completos do personagem
 */
router.get('/character/:charId', async (req: Request, res: Response): Promise<void> => {
    const { charId } = req.params;
    
    try {
        const result = await pool.query('SELECT * FROM characters WHERE id = $1', [charId]);
        
        if (result.rows.length === 0) {
            res.status(404).json({ error: 'Character not found' });
            return;
        }
        
        res.json(result.rows[0]);
    } catch (err) {
        console.error('[AdminUsers] Error loading character:', err);
        res.status(500).json({ error: 'Failed to load character' });
    }
});

/**
 * PUT /api/admin/character/:charId
 * Atualizar dados do personagem
 */
router.put('/character/:charId', async (req: Request, res: Response): Promise<void> => {
    const { charId } = req.params;
    const updates = req.body;
    
    const allowedFields = [
        'char_name', 'class_type', 'level', 'experience', 'gold',
        'max_hp', 'damage', 'defense', 'eye_type_id', 'body_color'
    ];
    
    const setClauses: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;
    
    Object.keys(updates).forEach(key => {
        if (allowedFields.includes(key)) {
            setClauses.push(`${key} = $${paramIndex++}`);
            values.push(updates[key]);
        }
    });
    
    if (setClauses.length === 0) {
        res.status(400).json({ error: 'No valid fields to update' });
        return;
    }
    
    values.push(charId);
    
    try {
        await pool.query(`
            UPDATE characters 
            SET ${setClauses.join(', ')}
            WHERE id = $${paramIndex}
        `, values);
        
        console.info(`[AdminUsers] Character ${charId} updated`);
        res.json({ success: true });
    } catch (err) {
        console.error('[AdminUsers] Error updating character:', err);
        res.status(500).json({ error: 'Failed to update' });
    }
});

/**
 * GET /api/admin/character/:charId/inventory
 * Listar itens do inventário
 */
router.get('/character/:charId/inventory', async (req: Request, res: Response): Promise<void> => {
    const { charId } = req.params;
    
    try {
        const result = await pool.query(
            'SELECT * FROM items WHERE player_id = $1 ORDER BY slot_position ASC',
            [charId]
        );
        
        res.json(result.rows);
    } catch (err) {
        console.error('[AdminUsers] Error loading inventory:', err);
        res.status(500).json({ error: 'Failed to load inventory' });
    }
});

/**
 * POST /api/admin/character/:charId/item
 * Adicionar item ao inventário
 */
router.post('/character/:charId/item', async (req: Request, res: Response): Promise<void> => {
    const { charId } = req.params;
    const { itemId, quantity, slotPosition } = req.body;
    
    if (!itemId || !quantity) {
        res.status(400).json({ error: 'itemId and quantity required' });
        return;
    }
    
    try {
        const slot = slotPosition !== null && slotPosition !== undefined 
            ? slotPosition 
            : await findEmptySlot(parseInt(charId));
        
        await pool.query(`
            INSERT INTO items (player_id, item_id, quantity, slot_position, is_equipped)
            VALUES ($1, $2, $3, $4, false)
        `, [charId, itemId, quantity, slot]);
        
        console.info(`[AdminUsers] Item ${itemId} added to char ${charId}`);
        res.json({ success: true });
    } catch (err) {
        console.error('[AdminUsers] Error adding item:', err);
        res.status(500).json({ error: 'Failed to add item' });
    }
});

/**
 * PUT /api/admin/item/:itemId
 * Editar item existente
 */
router.put('/item/:itemId', async (req: Request, res: Response): Promise<void> => {
    const { itemId } = req.params;
    const { quantity, slotPosition, isEquipped } = req.body;
    
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;
    
    if (quantity !== undefined) {
        updates.push(`quantity = $${paramIndex++}`);
        values.push(quantity);
    }
    
    if (slotPosition !== undefined) {
        updates.push(`slot_position = $${paramIndex++}`);
        values.push(slotPosition);
    }
    
    if (isEquipped !== undefined) {
        updates.push(`is_equipped = $${paramIndex++}`);
        values.push(isEquipped);
    }
    
    if (updates.length === 0) {
        res.status(400).json({ error: 'No fields to update' });
        return;
    }
    
    values.push(itemId);
    
    try {
        await pool.query(`
            UPDATE items 
            SET ${updates.join(', ')}
            WHERE id = $${paramIndex}
        `, values);
        
        res.json({ success: true });
    } catch (err) {
        console.error('[AdminUsers] Error updating item:', err);
        res.status(500).json({ error: 'Failed to update item' });
    }
});

/**
 * DELETE /api/admin/item/:itemId
 * Remover item
 */
router.delete('/item/:itemId', async (req: Request, res: Response): Promise<void> => {
    const { itemId } = req.params;
    
    try {
        await pool.query('DELETE FROM items WHERE id = $1', [itemId]);
        console.info(`[AdminUsers] Item ${itemId} deleted`);
        res.json({ success: true });
    } catch (err) {
        console.error('[AdminUsers] Error deleting item:', err);
        res.status(500).json({ error: 'Failed to delete item' });
    }
});

/**
 * Helper: Encontrar slot vazio no inventário
 */
async function findEmptySlot(charId: number): Promise<number> {
    const result = await pool.query(`
        SELECT slot_position FROM items WHERE player_id = $1 ORDER BY slot_position ASC
    `, [charId]);
    
    const usedSlots = new Set(result.rows.map(r => r.slot_position));
    
    for (let i = 0; i < 40; i++) {
        if (!usedSlots.has(i)) return i;
    }
    
    throw new Error('Inventory full');
}

export default router;