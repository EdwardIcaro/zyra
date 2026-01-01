import { Room, Client } from 'colyseus';
import { 
  ZoneRoomState, PlayerState, MonsterState, ProjectileState, DroppedItemState,
  InventorySlot, EquippedItem, GAME_CONFIG, CLASSES, ZONES, 
   ItemRegistry, SPAWN_POINTS, MonsterRegistry, getRequiredXP 
} from '@zyra/shared';
import { v4 as uuid } from 'uuid';
import { db } from '../database/db';
import { BuffManager } from '../systems/BuffManager';
import { DropSystem } from '../systems/DropSystem';
import { InventoryManager } from '../systems/InventoryManager';
import { EquipmentManager } from '../systems/EquipmentManager';

export class CombatRoom extends Room<ZoneRoomState> {
  private playerMovements = new Map<string, { dx: number; dy: number }>();
  private spawnTimers = new Map<string, number>(); 
  private activeMonsters = new Map<string, string>(); 
  private processingPickups = new Set<string>();
  
  private buffManager = new BuffManager();
  private dropSystem = new DropSystem();
  private inventoryManager = new InventoryManager();
  private equipmentManager = new EquipmentManager();

  async onCreate(options: any) {
    this.setState(new ZoneRoomState());
    
    const zoneId = options.zoneId || 'bleeding_plains';
    const zoneConfig = ZONES[zoneId];
    
    this.state.zoneId = zoneConfig.id;
    this.state.zoneName = zoneConfig.name;
    this.state.width = zoneConfig.size.width;
    this.state.height = zoneConfig.size.height;

    // --- MENSAGENS DE INVENTÁRIO & EQUIPAMENTO ---
    this.onMessage('inventory:move', (client, data: { from: number; to: number }) => {
      const player = this.state.players.get(client.sessionId);
      if (player) this.inventoryManager.moveItem(player, data.from, data.to);
    });

    this.onMessage('equipment:equip', (client, data: { inventorySlot: number }) => {
      const player = this.state.players.get(client.sessionId);
      if (player) this.equipmentManager.equipFromInventory(player, data.inventorySlot);
    });

    this.onMessage('equipment:unequip', (client, data: { equipmentSlot: string }) => {
      const player = this.state.players.get(client.sessionId);
      if (player) this.equipmentManager.unequipToInventory(player, data.equipmentSlot);
    });

    // --- MENSAGEM DE COLETA MANUAL (Caso o pickup automático falhe ou seja clicado) ---
    this.onMessage('item:pickup', async (client, data: { dropId: string }) => {
       await this.processPickup(client.sessionId, data.dropId);
    });

    // --- MOVIMENTO E COMBATE ---
    this.onMessage('move', (client, message: { dx: number, dy: number }) => {
      this.playerMovements.set(client.sessionId, { dx: message.dx, dy: message.dy });
    });

    this.onMessage('stop', (client) => {
      this.playerMovements.delete(client.sessionId);
    });

    this.onMessage('attack', (client, message: { targetX: number, targetY: number }) => {
      this.handleAttack(client, message);
    });

    this.setSimulationInterval(() => this.update(), 1000 / GAME_CONFIG.TICK_RATE);
    this.initializeSpawns();
  }

  async onJoin(client: Client, options: any) {
    const { charName, classType, isNew, dbId } = options;
    try {
      let characterData;
      if (isNew) {
        const newCharRes = await db.query(
          `INSERT INTO characters (account_id, char_name, class_type, level, gold, session_id) 
           VALUES ($1, $2, $3, 1, 100, $4) RETURNING *`,
          [dbId, charName, classType || 'warrior', client.sessionId]
        );
        characterData = newCharRes.rows[0];
        await db.query('INSERT INTO inventory (player_id) VALUES ($1)', [characterData.id]);
        await db.query(
          `INSERT INTO items (player_id, item_id, quantity, slot_position) VALUES ($1, $2, 1, 0)`,
          [characterData.id, 'sword_ink_blade']
        );
      } else {
        const charRes = await db.query('SELECT * FROM characters WHERE id = $1', [dbId]);
        characterData = charRes.rows[0];
        await db.query('UPDATE characters SET session_id = $1 WHERE id = $2', [client.sessionId, dbId]);
      }

      const classConfig = CLASSES[characterData.class_type as keyof typeof CLASSES];
      const player = new PlayerState();
      player.playerId = client.sessionId;
      player.username = characterData.char_name;
      player.classType = characterData.class_type;
      player.level = characterData.level || 1;
      player.experience = Number(characterData.experience) || 0;
      player.gold = characterData.gold || 0;
      player.maxHp = characterData.max_hp || classConfig.baseStats.maxHp;
      player.currentHp = player.maxHp;
      player.damage = characterData.damage || classConfig.combat.baseDamage;
      player.isAlive = true;
      player.x = this.state.width / 2;
      player.y = this.state.height / 2;
      // Visuais
      player.visualBody = characterData.visual_body || 'ball_red';
      player.visualFace = characterData.visual_face || 'eyes_determined';
      player.visualHat = characterData.visual_hat || 'none';

      // Face (Olhos)
      player.faceOffsetX = characterData.face_offset_x || 0;
      player.faceOffsetY = characterData.face_offset_y || 5;
      player.faceScale = parseFloat(characterData.face_scale) || 1.0;
      player.faceRotation = characterData.face_rotation || 0;
      player.faceWidth = characterData.face_width || 35;
      player.faceHeight = characterData.face_height || 18;

      // Hat (Chapéu)
      player.hatOffsetX = characterData.hat_offset_x || 0;
      player.hatOffsetY = characterData.hat_offset_y || -20;
      player.hatScale = parseFloat(characterData.hat_scale) || 1.0;
      player.hatRotation = characterData.hat_rotation || 0;
      player.hatWidth = characterData.hat_width || 60;
      player.hatHeight = characterData.hat_height || 45;

      console.log('🎨 Visuais carregados do banco:', {
      face: player.visualFace,
      faceY: player.faceOffsetY,
      faceScale: player.faceScale,
      hat: player.visualHat,
      hatY: player.hatOffsetY,
      hatScale: player.hatScale
    });

//
      await this.syncInventoryFromDB(characterData.id, player);
      this.state.players.set(client.sessionId, player);
    } catch (err: any) {
      console.error("❌ Erro onJoin:", err.message);
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
    this.state.players.forEach(p => this.buffManager.updateBuffs(p));
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
      const speed = CLASSES[p.classType as keyof typeof CLASSES].movement.baseSpeed;
      const mag = Math.hypot(mov.dx, mov.dy) || 1;
      p.x += (mov.dx / mag) * speed;
      p.y += (mov.dy / mag) * speed;
      p.x = Math.max(0, Math.min(this.state.width, p.x));
      p.y = Math.max(0, Math.min(this.state.height, p.y));
    });
  }

  private updateMonsters() {
    this.state.monsters.forEach((m) => {
      let target = this.state.players.get(m.targetPlayerId);
      if (!target || !target.isAlive) {
        m.targetPlayerId = '';
        this.state.players.forEach(p => {
          if (p.isAlive && Math.hypot(m.x - p.x, m.y - p.y) < m.aggroRange) m.targetPlayerId = p.playerId;
        });
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
      if (dist < 45) {
        target!.currentHp -= m.damage / 30;
        if (target!.currentHp <= 0) { target!.isAlive = false; target!.currentHp = 0; }
      }
    });
  }

  private handleAttack(client: Client, message: { targetX: number, targetY: number }) {
    const player = this.state.players.get(client.sessionId);
    if (!player || !player.isAlive) return;

    const classConfig = CLASSES[player.classType as keyof typeof CLASSES];
    if (classConfig.combat.isRanged) {
      this.createProjectile(player, message.targetX, message.targetY);
    } else {
      this.state.monsters.forEach((monster, id) => {
        if (Math.hypot(monster.x - player.x, monster.y - player.y) < classConfig.combat.attackRange) {
          monster.currentHp -= player.damage;
          if (monster.targetPlayerId === '') monster.targetPlayerId = player.playerId;
          if (monster.currentHp <= 0) this.onMonsterKilled(monster, player, id);
        }
      });
    }
  }

  private async onMonsterKilled(monster: MonsterState, killer: PlayerState, monsterId: string) {
    const monsterTemplate = MonsterRegistry.getTemplate(monster.templateId);
    if (!monsterTemplate) return;

    // 1. Recompensas de Ouro e XP
    const rewardXP = monsterTemplate.rewards?.baseExp || 10;
    const rewardGold = Math.floor(
      Math.random() * ((monsterTemplate.rewards?.goldMax || 5) - (monsterTemplate.rewards?.goldMin || 1) + 1)
    ) + (monsterTemplate.rewards?.goldMin || 1);

    killer.gold += rewardGold;
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
    const sp = SPAWN_POINTS[this.state.zoneId]?.find(s => this.activeMonsters.get(s.id) === monsterId);
    if (sp) this.spawnTimers.set(sp.id, (sp.respawnTime || 5) * 1000);
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
      itemsRes.rows.forEach(row => {
        if (row && row.slot_position !== null) {
          const slot = new InventorySlot();
          slot.itemId = row.item_id;
          slot.quantity = row.quantity;
          slot.slotIndex = row.slot_position;
          state.inventory.slots.set(String(row.slot_position), slot);
        }
      });
    } catch (e: any) {
      console.error("❌ Erro SyncDB:", e.message);
    }
  }

  private initializeSpawns() {
    const spawnPoints = SPAWN_POINTS[this.state.zoneId] || [];
    spawnPoints.forEach(spawn => this.spawnMonsterAtPoint(spawn.id, spawn));
  }

  private spawnMonsterAtPoint(spawnId: string, spawnPoint: any) {
    const template = MonsterRegistry.getTemplate(spawnPoint.monsterId); // Usando MonsterRegistry
    if (!template) return;
    const monster = new MonsterState();
    monster.id = uuid(); 
    monster.templateId = template.id;
    monster.name = template.name; 
    monster.x = spawnPoint.x; 
    monster.y = spawnPoint.y;
    monster.spawnX = spawnPoint.x; 
    monster.spawnY = spawnPoint.y;
    monster.maxHp = template.stats.maxHp; 
    monster.currentHp = template.stats.maxHp;
    monster.damage = template.stats.damage; 
    monster.speed = template.stats.speed;
    monster.aggroRange = template.behavior.aggroRange; 
    monster.leashRange = template.behavior.leashRange;
    monster.aggroType = template.behavior.aggroType;
    
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
        const sp = SPAWN_POINTS[this.state.zoneId]?.find(s => s.id === id);
        if (sp) this.spawnMonsterAtPoint(id, sp);
        this.spawnTimers.delete(id);
      } else this.spawnTimers.set(id, newTime);
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

  onLeave(client: Client) {
    this.state.players.delete(client.sessionId);
    this.playerMovements.delete(client.sessionId);
  }
}