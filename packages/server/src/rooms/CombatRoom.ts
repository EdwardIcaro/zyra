import { Room, Client } from 'colyseus';
import { 
  ZoneRoomState, PlayerState, MonsterState, ProjectileState, DroppedItemState,
  ZoneTileState,
  InventorySlot, EquippedItem, GAME_CONFIG, CLASSES, ZONES, 
   ItemRegistry, MonsterRegistry, getRequiredXP 
} from '@zyra/shared';
import { v4 as uuid } from 'uuid';
import { db } from '../database/db';
import { BuffManager } from '../systems/BuffManager';
import { DropSystem } from '../systems/DropSystem';
import { InventoryManager } from '../systems/InventoryManager';
import { EquipmentManager } from '../systems/EquipmentManager';
import { ClassBaseStatsRegistry } from '../systems/ClassBaseStatsRegistry';

export class CombatRoom extends Room<ZoneRoomState> {
  private playerMovements = new Map<string, { dx: number; dy: number }>();
  private spawnTimers = new Map<string, number>(); 
  private activeMonsters = new Map<string, string>(); 
  private processingPickups = new Set<string>();
  private lastBasicAttackAt = new Map<string, number>();
  private spawnPoints = new Map<string, any>();
  private collisionRadius = 22;
  
  private buffManager = new BuffManager();
  private dropSystem = new DropSystem();
  private inventoryManager = new InventoryManager();
  private equipmentManager = new EquipmentManager();
  private defaultClassConfig = (CLASSES as any).mage || (CLASSES as any).warrior;

  async onAuth(_client: Client, options: any) {
    if (options?.isNew && typeof options?.charName === 'string') {
      const exists = await db.query('SELECT 1 FROM characters WHERE char_name = $1 LIMIT 1', [options.charName]);
      if (exists.rows.length > 0) {
        throw new Error('NAME_TAKEN');
      }
    }
    return true;
  }

 async onCreate(options: any) {
    this.setState(new ZoneRoomState());
    
    const zoneId = options.zoneId || 'bleeding_plains';
    const zoneConfig = ZONES[zoneId];
    
    this.state.zoneId = zoneConfig.id;
    this.state.zoneName = zoneConfig.name;
    this.state.width = zoneConfig.size.width;
    this.state.height = zoneConfig.size.height;

    try {
      const tilesRes = await db.query(
        'SELECT layer, tile_path, x, y FROM zone_tiles WHERE zone_id = $1',
        [this.state.zoneId]
      );
      tilesRes.rows.forEach((row: any) => {
        const tile = new ZoneTileState();
        tile.layer = row.layer;
        tile.tilePath = row.tile_path;
        tile.x = row.x;
        tile.y = row.y;
        const key = `${tile.layer}:${tile.x},${tile.y}`;
        this.state.tiles.set(key, tile);
      });
    } catch (err: any) {
      console.error('[CombatRoom] Erro ao carregar tiles da zona:', err.message);
    }

    // --- MENSAGENS DE INVENTÁRIO & EQUIPAMENTO ---
    this.onMessage('inventory:move', (client, data: { from: number; to: number }) => {
      const player = this.state.players.get(client.sessionId);
      if (player) this.inventoryManager.moveItem(player, data.from, data.to);
    });

    this.onMessage('equipment:equip', async (client, data: { inventorySlot: number }) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;

      try {
        const charRes = await db.query('SELECT id FROM characters WHERE char_name = $1', [player.username]);
        const charId = charRes.rows[0]?.id;
        if (!charId) return;

        const itemRes = await db.query('SELECT * FROM items WHERE player_id = $1 AND slot_position = $2', [
          charId,
          data.inventorySlot
        ]);
        if (itemRes.rows.length === 0) return;

        const item = itemRes.rows[0];
        const template = ItemRegistry.getTemplate(item.item_id);
        if (!template || !template.equipSlot) return;

        const success = this.equipmentManager.equipFromInventory(player, data.inventorySlot);
        if (!success) return;

        const targetSlot = template.equipSlot;
        await db.query(
          `
            INSERT INTO character_equipment (player_id, slot, item_id)
            VALUES ($1, $2, $3)
            ON CONFLICT (player_id, slot)
            DO UPDATE SET item_id = EXCLUDED.item_id
          `,
          [charId, targetSlot, item.item_id]
        );
        await db.query('DELETE FROM items WHERE id = $1', [item.id]);
      } catch (err: any) {
        console.error('[Equip] Error:', err.message);
      }
    });

    this.onMessage('equipment:unequip', async (client, data: { equipmentSlot: string }) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;

      try {
        const charRes = await db.query('SELECT id FROM characters WHERE char_name = $1', [player.username]);
        const charId = charRes.rows[0]?.id;
        if (!charId) return;

        const equippedItem = player.equipment.equipped.get(data.equipmentSlot);
        if (!equippedItem) return;

        const itemId = equippedItem.itemId;
        const success = this.equipmentManager.unequipToInventory(player, data.equipmentSlot);
        if (!success) return;

        await db.query('DELETE FROM character_equipment WHERE player_id = $1 AND slot = $2', [charId, data.equipmentSlot]);
        await db.query(
          `
            INSERT INTO items (player_id, item_id, quantity, slot_position, is_equipped)
            VALUES ($1, $2, 1, (
              SELECT COALESCE(MAX(slot_position), -1) + 1
              FROM items WHERE player_id = $1
            ), false)
          `,
          [charId, itemId]
        );
      } catch (err: any) {
        console.error('[Unequip] Error:', err.message);
      }
    });

    this.onMessage('item:pickup', async (client, data: { dropId: string }) => {
      await this.processPickup(client.sessionId, data.dropId);
    });

    // --- MOVIMENTO / SELEÇÃO / COMBATE ---
    this.onMessage('move', (client, message: { dx: number; dy: number }) => {
      this.playerMovements.set(client.sessionId, { dx: message.dx, dy: message.dy });
    });

    this.onMessage('stop', (client) => {
      this.playerMovements.delete(client.sessionId);
    });

    this.onMessage('target', (client, message: { targetId: string | null }) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      player.targetId = message?.targetId ? String(message.targetId) : '';
    });

    this.onMessage('attack', (client, message: { targetX: number; targetY: number }) => {
      this.handleAttack(client, message);
    });

    this.setSimulationInterval(() => this.update(), 1000 / GAME_CONFIG.TICK_RATE);
    void this.initializeSpawns();
  }

  async onJoin(client: Client, options: any) {
    const { charName, classType, isNew, dbId, bodyColor, eyeColor } = options;

    try {
      let characterData: any;

      if (isNew) {
        const chosenClassType = typeof classType === 'string' ? classType : this.getFallbackClassType();
        const newCharRes = await db.query(
          `
            INSERT INTO characters (
              account_id, char_name, class_type, level, gold, session_id,
              body_color, eye_color
            )
            VALUES ($1, $2, $3, 1, 100, $4, $5, $6)
            RETURNING *
          `,
          [dbId, charName, chosenClassType, client.sessionId, bodyColor || '#FF6B6B', eyeColor || '#FFFFFF']
        );
        characterData = newCharRes.rows[0];

        await db.query('INSERT INTO inventory (player_id) VALUES ($1)', [characterData.id]);
        await db.query(`INSERT INTO items (player_id, item_id, quantity, slot_position) VALUES ($1, $2, 1, 0)`, [
          characterData.id,
          'sword_ink_blade'
        ]);
      } else {
        const charRes = await db.query('SELECT * FROM characters WHERE id = $1', [dbId]);
        characterData = charRes.rows[0];
        await db.query('UPDATE characters SET session_id = $1 WHERE id = $2', [client.sessionId, dbId]);
      }

      const classStats = ClassBaseStatsRegistry.get(characterData.class_type);
      const classConfig = this.getClassConfig(characterData.class_type);

      const player = new PlayerState();
      player.playerId = client.sessionId;
      player.username = characterData.char_name;
      player.classType = characterData.class_type;
      player.characterId = characterData.id;
      player.level = characterData.level || 1;
      player.experience = Number(characterData.experience) || 0;
      player.experienceToNext = getRequiredXP(player.level);
      player.gold = characterData.gold || 0;

      player.baseMaxHp = characterData.max_hp || classStats.maxHp || classConfig.baseStats.maxHp;
      player.baseMaxMana = characterData.max_mana || classStats.maxMana || classConfig.baseStats.maxMana;
      player.baseStrength = classStats.strength || classConfig.baseStats.strength;
      player.baseDexterity = classStats.dexterity || classConfig.baseStats.dexterity;
      player.baseIntelligence = classStats.intelligence || classConfig.baseStats.intelligence;
      player.baseVitality = classStats.vitality || classConfig.baseStats.vitality;
      player.baseLuck = classStats.luck || 5;
      player.baseDamage = characterData.damage || classStats.baseDamage || classConfig.combat.baseDamage;
      player.baseDefense = classStats.baseDefense || 0;
      player.baseCritChance = player.baseCritChance || 5;
      player.baseCritDamage = player.baseCritDamage || 150;
      player.baseAttackSpeed = player.baseAttackSpeed || 100;
      player.baseMoveSpeed = player.baseMoveSpeed || 100;

      player.currentHp = player.baseMaxHp;
      player.currentMana = player.baseMaxMana;
      player.isAlive = true;
      player.x = this.state.width / 2;
      player.y = this.state.height / 2;

      player.bodyColor = characterData.body_color || '#FF6B6B';
      player.eyeColor = characterData.eye_color || '#FFFFFF';
      player.eyeTypeId = characterData.eye_type_id || 1;
      player.visualBody = characterData.visual_body || 'ball_red';
      player.visualFace = characterData.visual_face || 'eyes_determined';
      player.visualHat = characterData.visual_hat || 'none';

      await this.syncInventoryFromDB(characterData.id, player);
      await this.syncEquipmentFromDB(characterData.id, player);
      await this.buffManager.loadActiveBuffs(player, characterData.id);
      this.equipmentManager.recalculateStats(player);
      player.currentHp = Math.min(player.currentHp, player.maxHp);
      player.currentMana = Math.min(player.currentMana, player.maxMana);

      this.state.players.set(client.sessionId, player);
    } catch (err: any) {
      const msg = String(err?.message || '');
      if (msg.includes('NAME_TAKEN')) throw err;
      if (err?.code === '23505') throw new Error('NAME_TAKEN');
      console.error('❌ [CombatRoom] Erro onJoin:', err?.message || err);
      client.leave();
    }
  }

  private update() {
    const deltaTime = 1 / GAME_CONFIG.TICK_RATE;
    this.updatePlayers();
    this.updateMonsters();
    this.updateProjectiles();
    this.checkProjectileCollisions();
    this.updateSpawnTimers(deltaTime);
    this.updateDroppedItems();
    this.checkItemPickupAuto(); 
    this.state.players.forEach(p => {
      const statsDirty = this.buffManager.updateBuffs(p);
      if (statsDirty) this.equipmentManager.recalculateStats(p);
    });
  }

  // Refatorado para usar uma função comum de processamento
  private async checkItemPickupAuto() {
    for (const [sessionId, player] of this.state.players.entries()) {
      if (!player || !player.isAlive) continue;
      for (const [dropId, drop] of this.state.droppedItems.entries()) {
        const dist = Math.hypot(player.x - drop.x, player.y - drop.y);
        if (dist < 45) {
          await this.processPickup(sessionId, dropId);
        }
      }
    }
  }

  private async processPickup(sessionId: string, dropId: string) {
    if (this.processingPickups.has(dropId)) return;
    
    const player = this.state.players.get(sessionId);
    const drop = this.state.droppedItems.get(dropId);
    if (!player || !drop) return;

    this.processingPickups.add(dropId);

    try {
      const charRes = await db.query('SELECT id FROM characters WHERE char_name = $1', [player.username]);
      if (charRes.rows.length === 0) return;
      const charId = charRes.rows[0].id;

      const canAdd = this.inventoryManager.addItem(player, drop.itemId, drop.quantity);
      if (canAdd) {
        this.state.droppedItems.delete(dropId);

        await db.query(`
          INSERT INTO items (player_id, item_id, quantity, slot_position, is_equipped)
          VALUES ($1, $2, $3, (
            SELECT s.pos FROM generate_series(0, 31) s(pos)
            WHERE s.pos NOT IN (SELECT slot_position FROM items WHERE player_id = $1)
            LIMIT 1
          ), false)
          ON CONFLICT (player_id, item_id, slot_position) 
          DO UPDATE SET quantity = items.quantity + EXCLUDED.quantity;
        `, [charId, drop.itemId, drop.quantity]);

        await this.syncInventoryFromDB(charId, player);
        console.log(`✅ [Pickup] ${player.username} coletou ${drop.itemId}`);
      }
    } catch (err: any) {
      console.error("❌ Erro no Pickup:", err.message);
    } finally {
      this.processingPickups.delete(dropId);
    }
  }

  private updatePlayers() {
    this.playerMovements.forEach((mov, id) => {
      const p = this.state.players.get(id);
      if (!p || !p.isAlive) return;
      const speed = this.getClassConfig(p.classType).movement.baseSpeed;
      const mag = Math.hypot(mov.dx, mov.dy) || 1;
      p.x += (mov.dx / mag) * speed;
      p.y += (mov.dy / mag) * speed;
      this.resolvePlayerCollisions(p);
      p.x = Math.max(0, Math.min(this.state.width, p.x));
      p.y = Math.max(0, Math.min(this.state.height, p.y));
    });
  }

  private updateMonsters() {
    this.state.monsters.forEach((m) => {
      let target = this.state.players.get(m.targetPlayerId);
      if (!target || !target.isAlive) {
        m.targetPlayerId = '';
        let lowestHp: PlayerState | null = null;
        this.state.players.forEach(p => {
          if (!p.isAlive) return;
          if (Math.hypot(m.x - p.x, m.y - p.y) >= m.aggroRange) return;
          if (!lowestHp || p.currentHp < lowestHp.currentHp) lowestHp = p;
        });
        if (lowestHp) m.targetPlayerId = lowestHp.playerId;
        if (m.targetPlayerId === '') {
          this.moveMonsterTo(m, m.spawnX, m.spawnY);
          return;
        }
        target = this.state.players.get(m.targetPlayerId);
      }

      const dist = Math.hypot(target!.x - m.x, target!.y - m.y);
      if (Math.hypot(m.x - m.spawnX, m.y - m.spawnY) > m.leashRange) {
        m.targetPlayerId = '';
        return;
      }

      if (dist > 35) this.moveMonsterTo(m, target!.x, target!.y);
      this.resolveMonsterCollisions(m);
      if (dist < 45) {
        target!.currentHp -= m.damage / 30;
        if (target!.currentHp <= 0) { target!.isAlive = false; target!.currentHp = 0; }
      }
    });
  }

  private handleAttack(client: Client, message: { targetX: number, targetY: number }) {
    const player = this.state.players.get(client.sessionId);
    if (!player || !player.isAlive) return;

    const targetId = player.targetId || '';
    const target = targetId ? this.state.monsters.get(targetId) : undefined;
    if (!target || target.isDead) return;

    const classConfig = this.getClassConfig(player.classType);
    const now = Date.now();
    const cooldownMs = classConfig.combat.isRanged ? 1500 : 500;

    if (classConfig.combat.isRanged) {
      if (Math.hypot(target.x - player.x, target.y - player.y) > classConfig.combat.attackRange) return;
      const lastAttackAt = this.lastBasicAttackAt.get(client.sessionId) || 0;
      if (now - lastAttackAt < cooldownMs) return;
      this.lastBasicAttackAt.set(client.sessionId, now);
      this.createProjectile(player, target.x, target.y);
    } else {
      if (Math.hypot(target.x - player.x, target.y - player.y) < classConfig.combat.attackRange) {
        const lastAttackAt = this.lastBasicAttackAt.get(client.sessionId) || 0;
        if (now - lastAttackAt < cooldownMs) return;
        this.lastBasicAttackAt.set(client.sessionId, now);
        target.currentHp -= player.damage;
        if (target.targetPlayerId === '') target.targetPlayerId = player.playerId;
        if (target.currentHp <= 0) this.onMonsterKilled(target, player, targetId);
      }
    }
  }

  private async onMonsterKilled(monster: MonsterState, killer: PlayerState, monsterId: string) {
    const monsterTemplate = MonsterRegistry.getTemplate(monster.templateId);
    if (!monsterTemplate) return;

    // 1. Recompensas de Ouro e XP
    const baseXP = monsterTemplate.rewards?.baseExp || 10;
    const expBonusPercent = this.buffManager.getTotalBonusPercent(killer, 'expBonus');
    const rewardXP = Math.floor(baseXP * (1 + expBonusPercent / 100));
    const rewardGold = Math.floor(
      Math.random() * ((monsterTemplate.rewards?.goldMax || 5) - (monsterTemplate.rewards?.goldMin || 1) + 1)
    ) + (monsterTemplate.rewards?.goldMin || 1);
    const goldBonusPercent = this.buffManager.getTotalBonusPercent(killer, 'goldBonus');
    const finalGold = Math.floor(rewardGold * (1 + goldBonusPercent / 100));

    killer.gold += finalGold;
    killer.experience += rewardXP;

    // 2. Lógica de Level Up
    let leveledUp = false;
    while (killer.experience >= getRequiredXP(killer.level)) {
        killer.experience -= getRequiredXP(killer.level);
        killer.level++;
        killer.maxHp += 20;
        killer.currentHp = killer.maxHp;
        killer.damage += 2;
        leveledUp = true;
    }

    // 3. Persistência de Status
    try {
        await db.query(
            `UPDATE characters 
             SET experience = $1, level = $2, gold = $3, 
                 max_hp = $4, damage = $5
             WHERE char_name = $6`,
            [killer.experience, killer.level, killer.gold, killer.maxHp, killer.damage, killer.username]
        );
        if (leveledUp) console.log(`✨ [Level Up] ${killer.username} atingiu o nível ${killer.level}!`);
    } catch (err) {
        console.error("❌ Erro ao salvar progresso:", err);
    }

// 4. Lógica de Drops de Itens (Baseada no MonsterRegistry)
    const drops = monsterTemplate.rewards?.drops;

    if (drops && Array.isArray(drops)) {
        drops.forEach((drop: any) => {
            if (Math.random() <= drop.chance) {
                // Se min/max não existirem no JSON, o padrão é 1
                const qty = (drop.min !== undefined && drop.max !== undefined)
                    ? Math.floor(Math.random() * (drop.max - drop.min + 1)) + drop.min 
                    : 1;
                
                this.spawnDroppedItem(drop.itemId, qty, monster.x, monster.y);
            }
        });
    }

    // Fallback: DropSystem original (opcional, mantendo compatibilidade)
  /*
  const oldDrops = this.dropSystem.rollDrops(monster.templateId, killer.level);
  oldDrops.forEach(d => this.spawnDroppedItem(d.itemId, d.quantity, monster.x, monster.y));
  */
    
    this.state.monsters.delete(monsterId);
    const sp = Array.from(this.spawnPoints.values()).find(s => this.activeMonsters.get(String(s.id)) === monsterId);
    if (sp) this.spawnTimers.set(String(sp.id), ((sp.respawn_time ?? sp.respawnTime) || 5) * 1000);
  }

  private spawnDroppedItem(itemId: string, qty: number, x: number, y: number) {
    const drop = new DroppedItemState();
    drop.id = uuid(); 
    drop.itemId = itemId; 
    drop.quantity = qty;
    drop.x = x + (Math.random() - 0.5) * 40; 
    drop.y = y + (Math.random() - 0.5) * 40;
    drop.spawnedAt = Date.now(); 
    drop.despawnTime = 60000;
    this.state.droppedItems.set(drop.id, drop);
  }

  private async syncInventoryFromDB(charId: number, state: PlayerState) {
    try {
      const itemsRes = await db.query('SELECT * FROM items WHERE player_id = $1', [charId]);
      state.inventory.slots.clear();

      console.log(`[CombatRoom] Carregando ${itemsRes.rows.length} itens para char ${charId}`);

      itemsRes.rows.forEach(row => {
        if (row && row.slot_position !== null) {
          const slot = new InventorySlot();
          slot.itemId = row.item_id;
          slot.quantity = row.quantity;
          slot.slotIndex = row.slot_position;
          state.inventory.slots.set(String(row.slot_position), slot);

          // ✅ NOVO: Verificar se o item existe no registry
          const template = ItemRegistry.getTemplate(row.item_id);
          if (!template) {
            console.warn(`⚠️ [CombatRoom] Item ${row.item_id} não encontrado no registry!`);
            } else if (template.isEquipable) {
            console.log(`   ✓ Item equipável: ${row.item_id} → slot: ${template.equipSlot}`);
}
}
        });
    } catch (e: any) {
      console.error("❌ Erro SyncDB:", e.message);
    }
  }

  private async syncEquipmentFromDB(charId: number, state: PlayerState) {
    try {
      const res = await db.query('SELECT * FROM character_equipment WHERE player_id = $1', [charId]);
      state.equipment.equipped.clear();

      res.rows.forEach(row => {
        const eq = new EquippedItem();
        eq.itemId = row.item_id;
        eq.slot = row.slot;
        state.equipment.equipped.set(row.slot, eq);
      });
    } catch (e: any) {
      console.error('[CombatRoom] Erro ao carregar equipment:', e?.message || e);
    }
  }

  private async initializeSpawns() {
    const res = await db.query('SELECT * FROM monster_spawns WHERE zone_id = $1 ORDER BY id ASC', [this.state.zoneId]);
    this.spawnPoints.clear();
    res.rows.forEach((row: any) => {
      this.spawnPoints.set(String(row.id), row);
      this.spawnMonsterAtPoint(String(row.id), row);
    });
  }

  private spawnMonsterAtPoint(spawnId: string, spawnPoint: any) {
    const template = MonsterRegistry.getTemplate(spawnPoint.monster_id || spawnPoint.monsterId); // Usando MonsterRegistry
    if (!template) return;
    const stats = (template.stats || {}) as any;
    const behavior = (template.behavior || {}) as any;
    const templateAny = template as any;
    const monster = new MonsterState();
    monster.id = uuid(); 
    monster.templateId = template.id;
    monster.name = template.name; 
    monster.type = (template.type || 'beast') as any;
    monster.x = spawnPoint.x; 
    monster.y = spawnPoint.y;
    monster.spawnX = spawnPoint.x; 
    monster.spawnY = spawnPoint.y;
    monster.level = spawnPoint.level_override ?? template.level ?? 1;
    monster.maxHp = stats.maxHp ?? 100; 
    monster.currentHp = stats.maxHp ?? 100;
    monster.damage = stats.damage ?? 10; 
    monster.speed = stats.speed ?? 1;
    monster.defense = stats.defense ?? templateAny.defense ?? 0;
    monster.attackSpeed = stats.attackSpeed ?? templateAny.attack_speed ?? 1.5;
    monster.aggroRange = behavior.aggroRange ?? 0; 
    monster.leashRange = behavior.leashRange ?? 200;
    monster.aggroType = behavior.aggroType ?? 'passive';
    
    this.state.monsters.set(monster.id, monster);
    this.activeMonsters.set(spawnId, monster.id);
  }

  private moveMonsterTo(m: MonsterState, tx: number, ty: number) {
    const dx = tx - m.x; const dy = ty - m.y;
    const dist = Math.hypot(dx, dy) || 1;
    m.x += (dx / dist) * m.speed; 
    m.y += (dy / dist) * m.speed;
  }

  private updateProjectiles() {
    this.state.projectiles.forEach(p => {
      p.x += p.vx; p.y += p.vy; p.life--;
      if (p.life <= 0) this.state.projectiles.delete(p.id);
    });
  }

  private checkProjectileCollisions() {
    this.state.projectiles.forEach(p => {
      this.state.monsters.forEach((m, id) => {
        if (Math.hypot(p.x - m.x, p.y - m.y) < 30) {
          m.currentHp -= p.damage;
          this.state.projectiles.delete(p.id);
          if (m.currentHp <= 0) {
            const killer = this.state.players.get(p.ownerId);
            if (killer) this.onMonsterKilled(m, killer, id);
          }
        }
      });
    });
  }

  private updateSpawnTimers(dt: number) {
    this.spawnTimers.forEach((time, id) => {
      const newTime = time - (dt * 1000);
      if (newTime <= 0) {
        const sp = this.spawnPoints.get(id);
        if (sp) this.spawnMonsterAtPoint(id, sp);
        this.spawnTimers.delete(id);
      } else this.spawnTimers.set(id, newTime);
    });
  }

  private resolvePlayerCollisions(player: PlayerState) {
    const radius = this.collisionRadius;
    this.state.players.forEach(other => {
      if (other.playerId === player.playerId) return;
      const dx = player.x - other.x;
      const dy = player.y - other.y;
      const dist = Math.hypot(dx, dy) || 1;
      if (dist >= radius * 2) return;
      const push = (radius * 2 - dist) / 2;
      player.x += (dx / dist) * push;
      player.y += (dy / dist) * push;
    });
    this.state.monsters.forEach(monster => {
      const dx = player.x - monster.x;
      const dy = player.y - monster.y;
      const dist = Math.hypot(dx, dy) || 1;
      if (dist >= radius * 2) return;
      const push = (radius * 2 - dist);
      player.x += (dx / dist) * push;
      player.y += (dy / dist) * push;
    });
  }

  private resolveMonsterCollisions(monster: MonsterState) {
    const radius = this.collisionRadius;
    this.state.monsters.forEach(other => {
      if (other.id === monster.id) return;
      const dx = monster.x - other.x;
      const dy = monster.y - other.y;
      const dist = Math.hypot(dx, dy) || 1;
      if (dist >= radius * 2) return;
      const push = (radius * 2 - dist) / 2;
      monster.x += (dx / dist) * push;
      monster.y += (dy / dist) * push;
    });
    this.state.players.forEach(player => {
      const dx = monster.x - player.x;
      const dy = monster.y - player.y;
      const dist = Math.hypot(dx, dy) || 1;
      if (dist >= radius * 2) return;
      const push = (radius * 2 - dist);
      monster.x += (dx / dist) * push;
      monster.y += (dy / dist) * push;
    });
  }

  private updateDroppedItems() {
    const now = Date.now();
    this.state.droppedItems.forEach(d => {
      if (now - d.spawnedAt > d.despawnTime) this.state.droppedItems.delete(d.id);
    });
  }

  private createProjectile(player: PlayerState, targetX: number, targetY: number) {
    const projectile = new ProjectileState();
    projectile.id = uuid(); 
    projectile.ownerId = player.playerId;
    projectile.x = player.x; 
    projectile.y = player.y;
    const dx = targetX - player.x; 
    const dy = targetY - player.y;
    const dist = Math.hypot(dx, dy) || 1;
    projectile.vx = (dx / dist) * 10; 
    projectile.vy = (dy / dist) * 10;
    projectile.damage = player.damage; 
    projectile.life = 100;
    this.state.projectiles.set(projectile.id, projectile);
  }

  private getClassConfig(classType: string) {
    return (CLASSES as any)[classType] || this.defaultClassConfig;
  }

  private getFallbackClassType() {
    if ((CLASSES as any).mage) return 'mage';
    if ((CLASSES as any).warrior) return 'warrior';
    return Object.keys(CLASSES)[0] || 'warrior';
  }

  onLeave(client: Client) {
    this.state.players.delete(client.sessionId);
    this.playerMovements.delete(client.sessionId);
    this.lastBasicAttackAt.delete(client.sessionId);
  }
}
