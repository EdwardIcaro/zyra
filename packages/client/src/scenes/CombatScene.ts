import { Assets, Container, Graphics, Sprite, Text } from 'pixi.js';
import type { Game } from '../game/Game';
import type { NetworkManager } from '../game/NetworkManager';
import { Player } from '../entities/Player'; 
import { MonsterEntity } from '../entities/Monster';
import { ProjectileEntity } from '../entities/Projectile';
import { DroppedItemEntity } from '../entities/DroppedItem';
import { InputSystem } from '../systems/InputSystem';
import { TargetingSystem } from '../systems/TargetingSystem';
import { GameHUD } from '../ui/GameHUD'; 
import { TargetFrameUI } from '../ui/TargetFrameUI';
import { InventoryUI } from '../ui/InventoryUI'; 
import { ItemTooltip } from '../ui/ItemTooltip';
import { ParticleSystem } from '../effects/ParticleSystem';
import { DamageNumberSystem } from '../effects/DamageNumberSystem';
import type { PlayerState, MonsterState, ProjectileState, DroppedItemState, ZoneTileState } from '@zyra/shared';
import { CLASSES } from '@zyra/shared';
import { SkillBarUI } from '../ui/SkillBarUI';
import { HealthManaBar } from '../ui/HealthManaBar';

export class CombatScene extends Container {
  private game: Game; // Adicionado para acessar o App e Ticker
  private network: NetworkManager;
  private inputSystem: InputSystem;
  private hud: GameHUD;
  private healthManaBar: HealthManaBar;
  private inventoryUI: InventoryUI; 
  private tooltip: ItemTooltip;
  private world: Container;
  private background: Graphics;
  private tilemapContainer: Container;
  private tileLayers: { ground: Container; decoration: Container; collision: Container };
  private tileSprites = new Map<string, Sprite>();
  private collisionDebugVisible = false;
  private readonly tileSize = 32;
  private fpsText: Text;
  private zoneNameText: Text;
  
  private particles: ParticleSystem;
  private damageNumbers: DamageNumberSystem;
  private targetingSystem: TargetingSystem;
  private targetFrameUI: TargetFrameUI;

  private players = new Map<string, Player>();
  private monsters = new Map<string, MonsterEntity>();
  private projectiles = new Map<string, ProjectileEntity>();
  private droppedItems = new Map<string, DroppedItemEntity>();

  private mySessionId: string | null = null;
  private lastMovement = { dx: 0, dy: 0 };
  private lastMovementUpdate = 0;
  private movementUpdateInterval = 50;
  private clickMoveTarget: { x: number; y: number } | null = null;
  private clickIndicator: Graphics;
  private clickIndicatorExpiresAt = 0;
  private skillBar: SkillBarUI;
  private uiConfigs = new Map<string, any>();
  private basicAttackIntent: 'none' | 'once' | 'auto' = 'none';
  private basicAttackTargetId: string | null = null;
  private lastBasicAttackAt = 0;

  constructor(game: Game, network: NetworkManager) {
    super();
    this.game = game; // Salva a referência do Game
    this.network = network;
    this.inputSystem = new InputSystem();
    this.targetingSystem = new TargetingSystem();
    this.targetFrameUI = new TargetFrameUI();
    this.targetingSystem.onTargetChanged = (_targetId, target) => {
      if (target) this.targetFrameUI.attachTo(target);
      else this.targetFrameUI.clear();
    };

    this.background = new Graphics();
    this.background.zIndex = -10; 
    this.addChild(this.background);

    this.world = new Container();
    this.world.zIndex = 0;
    this.world.sortableChildren = true; 
    this.addChild(this.world);

    this.tilemapContainer = new Container();
    this.tilemapContainer.zIndex = -1;
    this.tileLayers = {
      ground: new Container(),
      decoration: new Container(),
      collision: new Container()
    };
    this.tilemapContainer.addChild(this.tileLayers.ground);
    this.tilemapContainer.addChild(this.tileLayers.decoration);
    this.tilemapContainer.addChild(this.tileLayers.collision);
    this.world.addChild(this.tilemapContainer);

    this.clickIndicator = new Graphics();
    this.clickIndicator.visible = false;
    this.clickIndicator.zIndex = 5;
    this.world.addChild(this.clickIndicator);

    this.particles = new ParticleSystem();
    this.particles.zIndex = 500; 
    this.damageNumbers = new DamageNumberSystem();
    this.damageNumbers.zIndex = 600;
    this.world.addChild(this.particles);
    this.world.addChild(this.damageNumbers);

    this.hud = new GameHUD();
    this.hud.zIndex = 1000;
    this.hud.position.set(window.innerWidth / 2 - GameHUD.XP_BAR_WIDTH / 2, window.innerHeight - 20 - GameHUD.HEIGHT);
    this.addChild(this.hud);

    this.healthManaBar = new HealthManaBar();
    this.healthManaBar.zIndex = 1100;
    this.addChild(this.healthManaBar);
    this.healthManaBar.ready.then(() => {
      this.healthManaBar.layout(window.innerWidth, window.innerHeight);
    });

    this.skillBar = new SkillBarUI();
    this.skillBar.zIndex = 1200;
    this.skillBar.layout(window.innerWidth, window.innerHeight);
    this.addChild(this.skillBar);

    this.inventoryUI = new InventoryUI(); 
    this.inventoryUI.zIndex = 2000;
    this.addChild(this.inventoryUI);

    this.tooltip = new ItemTooltip();
    this.tooltip.zIndex = 3000;
    this.addChild(this.tooltip);

    this.zoneNameText = new Text({
      text: '',
      style: { 
        fill: 0xf4e4bc, 
        fontSize: 32, 
        fontFamily: 'Georgia',
        fontWeight: 'bold',
        stroke: { color: 0x000000, width: 4 }
      }
    });
    this.zoneNameText.anchor.set(0.5, 0);
    this.zoneNameText.position.set(window.innerWidth / 2, 10);
    this.zoneNameText.zIndex = 1001;
    this.addChild(this.zoneNameText);

    this.fpsText = new Text({
      text: 'FPS: 0',
      style: { 
        fill: 0x00ff00, 
        fontSize: 16, 
        fontFamily: 'monospace',
        stroke: { color: 0x000000, width: 2 } 
      }
    });
    this.fpsText.position.set(10, 10);
    this.fpsText.zIndex = 1002;
    this.addChild(this.fpsText);
    
    this.sortableChildren = true;
    this.setupRoom();
    this.setupInput();
    this.setupUIEvents();
  }

  private setupUIEvents() {
    this.inventoryUI.onItemHover = (itemId, x, y) => {
        this.tooltip.show(itemId, x, y);
    };

    this.inventoryUI.onItemOut = () => {
        this.tooltip.hide();
    };

    const originalClose = this.inventoryUI.close.bind(this.inventoryUI);
    this.inventoryUI.close = () => {
        this.tooltip.hide();
        originalClose();
    };
  }

  private async setupRoom() {
    const room = this.network.getCurrentRoom();
    if (!room) return;
    this.mySessionId = room.sessionId;

    this.inventoryUI.onItemDoubleClick = (index: number) => {
        room.send('equipment:equip', { inventorySlot: index });
    };
    this.inventoryUI.onEquipmentClick = (slotName: string) => {
        room.send('equipment:unequip', { equipmentSlot: slotName });
    };

    room.state.listen('zoneName', (value: string) => {
      this.zoneNameText.text = value;
    });

    room.state.listen('width', () => this.updateZoneBackground());
    this.setupTileListeners(room);

    try {
      const res = await fetch('http://localhost:2567/api/buffs');
      const buffs = await res.json();
      const map = new Map<string, any>();
      buffs.forEach((b: any) => map.set(b.id, b));
      this.hud.setBuffTemplates(map);
    } catch (e) {
      console.warn('[CombatScene] Failed to load buff templates');
    }

    await this.loadUiConfigs();

    room.state.monsters.onAdd((monster: MonsterState, id: string) => {
      const monsterEntity = new MonsterEntity(monster);
      monsterEntity.zIndex = 100;
      monsterEntity.setAggroDebugVisible(this.collisionDebugVisible);
      this.monsters.set(id, monsterEntity);
      this.world.addChild(monsterEntity);

      let lastHp = monster.currentHp;
      monster.onChange(() => {
        if (monster.currentHp < lastHp) {
          const diff = lastHp - monster.currentHp;
          this.damageNumbers.show(Math.round(diff), monster.x, monster.y - 30);
          this.particles.spawn(monster.x, monster.y, 0xff0000, 10);
          lastHp = monster.currentHp;
        }
      });
    });

    room.state.monsters.onRemove((_monster: MonsterState, id: string) => {
      const m = this.monsters.get(id);
      if (m) {
        if (this.targetingSystem.getSelectedTargetId() === id) {
          this.targetingSystem.clearTarget();
          this.targetFrameUI.clear();
          this.network.sendTarget(null);
          this.basicAttackIntent = 'none';
          this.basicAttackTargetId = null;
        }
        this.particles.spawn(m.x, m.y, 0xffaa00, 15);
        this.world.removeChild(m);
        this.monsters.delete(id);
        m.destroy({ children: true });
      }
    });

    room.state.players.onAdd((player: PlayerState, sessionId: string) => {
      const isLocal = sessionId === this.mySessionId;
      const playerEntity = new Player(player, isLocal);
      playerEntity.zIndex = 110;
      this.players.set(sessionId, playerEntity);
      this.world.addChild(playerEntity);

      // CORREÇÃO: Listener para Level Up usando o sistema de partículas
      player.listen("level", (current, previous) => {
        if (previous !== undefined && current > previous) {
          this.showLevelUpEffect(playerEntity);
        }
      });

      if (isLocal) {
        player.onChange(() => {
          this.hud.update(player);
          this.healthManaBar.setIdentity(player.username, player.level);
          this.healthManaBar.setHp(player.currentHp, player.maxHp);
          this.healthManaBar.setMana(player.currentMana, player.maxMana);
          this.skillBar.setPlaceholderContext({
            player: {
              name: player.username,
              level: player.level,
              currentHp: player.currentHp,
              maxHp: player.maxHp,
              currentMana: player.currentMana,
              maxMana: player.maxMana
            }
          });
        });

        // Initial render: onChange won't fire until the first patch (e.g. movement).
        this.hud.update(player);
        this.healthManaBar.setIdentity(player.username, player.level);
        this.healthManaBar.setHp(player.currentHp, player.maxHp);
        this.healthManaBar.setMana(player.currentMana, player.maxMana);
        this.skillBar.setPlaceholderContext({
          player: {
            name: player.username,
            level: player.level,
            currentHp: player.currentHp,
            maxHp: player.maxHp,
            currentMana: player.currentMana,
            maxMana: player.maxMana
          }
        });
      }
    });

    room.state.players.onRemove((_player: PlayerState, sessionId: string) => {
      const p = this.players.get(sessionId);
      if (p) {
        this.world.removeChild(p);
        this.players.delete(sessionId);
        p.destroy({ children: true });
      }
    });

    room.state.droppedItems.onAdd((drop: DroppedItemState, id: string) => {
      const dropEntity = new DroppedItemEntity(drop);
      dropEntity.zIndex = 50;
      this.droppedItems.set(id, dropEntity);
      this.world.addChild(dropEntity);
    });

    room.state.droppedItems.onRemove((_drop: DroppedItemState, id: string) => {
      const d = this.droppedItems.get(id);
      if (d) {
        this.particles.spawn(d.x, d.y, 0xffaa00, 10);
        this.world.removeChild(d);
        this.droppedItems.delete(id);
        d.destroy({ children: true });
      }
    });

    room.state.projectiles.onAdd((proj: ProjectileState, id: string) => {
      const projEntity = new ProjectileEntity(proj);
      projEntity.zIndex = 200;
      this.projectiles.set(id, projEntity);
      this.world.addChild(projEntity);
    });

    room.state.projectiles.onRemove((_proj: ProjectileState, id: string) => {
      const pr = this.projectiles.get(id);
      if (pr) {
        this.world.removeChild(pr);
        this.projectiles.delete(id);
        pr.destroy({ children: true });
      }
    });

    this.updateZoneBackground();
  }

  /**
   * CORREÇÃO: Agora usa this.game.getApp() para acessar o Ticker corretamente
   */
  private showLevelUpEffect(target: Container) {
    const text = new Text({ 
      text: 'LEVEL UP!', 
      style: { 
        fill: 0xffff00, 
        fontSize: 28, 
        fontWeight: 'bold',
        fontFamily: 'Georgia',
        stroke: { color: 0x000000, width: 4 }
      }
    });
    text.anchor.set(0.5);
    text.position.set(0, -100);
    target.addChild(text);

    this.particles.spawn(target.x, target.y, 0xffff00, 30);

    let alpha = 1;
    const animate = (ticker: any) => {
      text.y -= 1.5 * ticker.deltaTime;
      alpha -= 0.015 * ticker.deltaTime;
      text.alpha = alpha;

      if (alpha <= 0) {
        target.removeChild(text);
        text.destroy();
        this.game.getApp().ticker.remove(animate);
      }
    };
    this.game.getApp().ticker.add(animate);
  }

  private setupInput() {
    this.eventMode = 'static';
    this.hitArea = { contains: () => true } as any;

    this.on('pointerdown', (event) => {
      if (this.inventoryUI.visible) return; 

      const worldPos = this.world.toLocal(event.global);
      const pick = this.targetingSystem.trySelectTarget(worldPos.x, worldPos.y, this.monsters);
      if (pick?.changed) {
        this.network.sendTarget(this.targetingSystem.getSelectedTargetId());
        return;
      }

      if (pick && this.targetingSystem.hasTarget()) {
        this.requestBasicAttack('click');
        return;
      }

      this.clickMoveTarget = { x: worldPos.x, y: worldPos.y };
      this.showMoveIndicator(worldPos.x, worldPos.y);
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'F1') {
        e.preventDefault();
        this.toggleCollisionDebug();
        return;
      }
      const key = e.key.toLowerCase();
      if (key === 'i' || key === 'e') {
        this.inventoryUI.toggle();
      }
      if (e.key === 'Escape' && this.inventoryUI.visible) {
        this.inventoryUI.close();
      }
      if (key === 'q' && !this.inventoryUI.visible) {
        this.requestBasicAttack('q');
      }
    });
  }

  private updateZoneBackground() {
    const room = this.network.getCurrentRoom();
    if (!room) return;

    const width = room.state.width;
    const height = room.state.height;
    const bgColor = 0xf4e4bc;

    this.background.clear();
    this.background.rect(0, 0, width, height).fill(bgColor);

    for (let x = 0; x < width; x += 100) {
      this.background.moveTo(x, 0).lineTo(x, height).stroke({ width: 1, color: 0x000000, alpha: 0.05 });
    }
    for (let y = 0; y < height; y += 100) {
      this.background.moveTo(0, y).lineTo(width, y).stroke({ width: 1, color: 0x000000, alpha: 0.05 });
    }
  }

  private setupTileListeners(room: any) {
    const tiles = room.state.tiles;
    if (!tiles) return;

    tiles.onAdd((tile: ZoneTileState, key: string) => {
      this.addTileSprite(key, tile);
    });

    tiles.onRemove((_tile: ZoneTileState, key: string) => {
      this.removeTileSprite(key);
    });
  }

  private async addTileSprite(key: string, tile: ZoneTileState) {
    if (this.tileSprites.has(key)) return;
    const baseUrl = `${window.location.protocol}//${window.location.hostname}:2567`;
    const url = `${baseUrl}/assets/tileset/${tile.tilePath}`;
    try {
      const texture = await Assets.load(url);
      const sprite = new Sprite(texture);
      sprite.anchor.set(0.5);
      const px = tile.x * this.tileSize + this.tileSize / 2;
      const py = tile.y * this.tileSize + this.tileSize / 2;
      sprite.position.set(px, py);
      sprite.width = this.tileSize;
      sprite.height = this.tileSize;

      if (tile.layer === 'collision') {
        sprite.alpha = this.collisionDebugVisible ? 0.3 : 0;
        sprite.tint = this.collisionDebugVisible ? 0xff4444 : 0xffffff;
      }

      const layerKey = (tile.layer as keyof typeof this.tileLayers) || 'ground';
      const layer = this.tileLayers[layerKey] || this.tileLayers.ground;
      layer.addChild(sprite);
      this.tileSprites.set(key, sprite);
    } catch (err) {
      console.warn('[CombatScene] Erro ao carregar tile:', url);
    }
  }

  private removeTileSprite(key: string) {
    const sprite = this.tileSprites.get(key);
    if (!sprite) return;
    if (sprite.parent) sprite.parent.removeChild(sprite);
    sprite.destroy();
    this.tileSprites.delete(key);
  }

  private toggleCollisionDebug() {
    this.collisionDebugVisible = !this.collisionDebugVisible;
    this.tileSprites.forEach(sprite => {
      if (sprite.parent !== this.tileLayers.collision) return;
      sprite.alpha = this.collisionDebugVisible ? 0.3 : 0;
      sprite.tint = this.collisionDebugVisible ? 0xff4444 : 0xffffff;
    });
    this.monsters.forEach(monster => monster.setAggroDebugVisible(this.collisionDebugVisible));
  }

  update(deltaTime: number) {
    const now = Date.now();
    const room = this.network.getCurrentRoom();
    if (!room) return;

    this.fpsText.text = `FPS: ${Math.round(60 / deltaTime)}`;

    this.updateBasicAttack(now, room);
    this.hud.tick(now);

    if (!this.inventoryUI.visible) {
      const myStateForMove = this.mySessionId ? room.state.players.get(this.mySessionId) : null;
      const input = this.inputSystem.getMovementInput();
      const dx = parseFloat(input.dx.toFixed(2));
      const dy = parseFloat(input.dy.toFixed(2));
      const isMoving = dx !== 0 || dy !== 0;
      let moveDx = dx;
      let moveDy = dy;

      if (isMoving) {
        this.clickMoveTarget = null;
        this.clickIndicator.visible = false;
      } else if (this.clickMoveTarget && myStateForMove) {
        const tx = this.clickMoveTarget.x;
        const ty = this.clickMoveTarget.y;
        const ddx = tx - myStateForMove.x;
        const ddy = ty - myStateForMove.y;
        const dist = Math.hypot(ddx, ddy);

        if (dist < 10) {
          this.clickMoveTarget = null;
          this.clickIndicator.visible = false;
          moveDx = 0;
          moveDy = 0;
        } else {
          moveDx = ddx / dist;
          moveDy = ddy / dist;
        }
      }

      if (this.clickIndicator.visible && this.clickIndicatorExpiresAt > 0 && now > this.clickIndicatorExpiresAt) {
        this.clickIndicator.visible = false;
      }

      const changed = moveDx !== this.lastMovement.dx || moveDy !== this.lastMovement.dy;
      const isMovingFinal = moveDx !== 0 || moveDy !== 0;

      if (changed || (isMovingFinal && now - this.lastMovementUpdate > this.movementUpdateInterval)) {
        if (isMovingFinal) this.network.sendMove(moveDx, moveDy);
        else this.network.sendStop();
        
        this.lastMovement = { dx: moveDx, dy: moveDy };
        this.lastMovementUpdate = now;
      }
    }

    this.monsters.forEach(monster => monster.update(deltaTime));
    this.targetingSystem.update(deltaTime);
    this.targetFrameUI.update();
    this.projectiles.forEach(pr => pr.update(deltaTime));
    this.droppedItems.forEach(item => item.update(deltaTime));
    this.particles.update();
    this.damageNumbers.update();
    this.players.forEach((player) => {
        player.update(deltaTime);
    });

    this.healthManaBar.update(deltaTime * (1000 / 60));

    const myPlayer = this.mySessionId ? this.players.get(this.mySessionId) : null;
    if (myPlayer) {
      this.world.pivot.set(myPlayer.x, myPlayer.y);
      this.world.position.set(window.innerWidth / 2, window.innerHeight / 2);

      const myState = room.state.players.get(this.mySessionId!);
      if (myState) {
        this.inventoryUI.update(myState.inventory, myState.equipment, myState.gold); 
      }
    }

    this.world.children.sort((a, b) => a.y - b.y);
  }

  onResize() {
    this.zoneNameText.position.set(window.innerWidth / 2, 10);
    this.inventoryUI.resize();
    this.skillBar.layout(window.innerWidth, window.innerHeight);
    this.healthManaBar.layout(window.innerWidth, window.innerHeight);
    this.hud.position.set(window.innerWidth / 2 - GameHUD.XP_BAR_WIDTH / 2, window.innerHeight - 20 - GameHUD.HEIGHT);
  }

  private async loadUiConfigs() {
    try {
      const res = await fetch('http://localhost:2567/api/ui/configs');
      if (!res.ok) return;
      const configs = await res.json();
      configs.forEach((row: any) => {
        this.uiConfigs.set(row.ui_name, row.config_json);
      });
      await this.applyUiConfigs();
    } catch (e) {
      console.warn('[CombatScene] Failed to load UI configs');
    }
  }

  private async applyUiConfigs() {
    const healthCfg = this.uiConfigs.get('health_mana_bar') || null;
    const skillCfg = this.uiConfigs.get('skill_bar') || null;
    await this.healthManaBar.ready;
    if (healthCfg) await this.healthManaBar.applyConfig(healthCfg);
    if (skillCfg) this.skillBar.applyConfig(skillCfg);
    this.healthManaBar.layout(window.innerWidth, window.innerHeight);
    this.skillBar.layout(window.innerWidth, window.innerHeight);
  }

  private showToast(text: string) {
    const msg = new Text({
      text,
      style: { fontSize: 16, fill: 0xff4444, fontWeight: 'bold' }
    });
    msg.anchor.set(0.5);
    msg.position.set(window.innerWidth / 2, 70);
    msg.zIndex = 5000;
    this.addChild(msg);

    setTimeout(() => {
      this.removeChild(msg);
      msg.destroy();
    }, 2000);
  }

  private showMoveIndicator(x: number, y: number) {
    this.clickIndicator.clear();
    this.clickIndicator
      .circle(0, 0, 10)
      .stroke({ width: 2, color: 0x00ccff, alpha: 0.9 });
    this.clickIndicator
      .circle(0, 0, 4)
      .fill(0x00ccff);

    this.clickIndicator.position.set(x, y);
    this.clickIndicator.visible = true;
    this.clickIndicatorExpiresAt = Date.now() + 5000;
  }

  private requestBasicAttack(source: 'q' | 'click') {
    const targetId = this.targetingSystem.getSelectedTargetId();
    if (!targetId) {
      this.showToast('Selecione um alvo primeiro!');
      return;
    }

    const room = this.network.getCurrentRoom();
    const myState = this.mySessionId ? room?.state.players.get(this.mySessionId) : null;
    const classConfig = myState ? this.getClassConfig(myState.classType) : null;
    const isRanged = !!classConfig?.combat.isRanged;

    this.basicAttackTargetId = targetId;
    this.basicAttackIntent = source === 'q' && !isRanged ? 'auto' : 'once';
  }

  private updateBasicAttack(now: number, room: any) {
    const myState = this.mySessionId ? room.state.players.get(this.mySessionId) : null;
    if (!myState) return;

    const classConfig = this.getClassConfig(myState.classType);
    const cooldownMs = classConfig.combat.isRanged ? 1500 : 500;
    const progress = Math.max(0, Math.min(1, (now - this.lastBasicAttackAt) / cooldownMs));
    this.skillBar.setCooldownProgress(progress);

    if (this.basicAttackIntent === 'none' || !this.basicAttackTargetId) return;

    const targetEntity = this.monsters.get(this.basicAttackTargetId);
    if (!targetEntity) {
      this.basicAttackIntent = 'none';
      this.basicAttackTargetId = null;
      return;
    }

    const target = targetEntity.getState();
    const dist = Math.hypot(target.x - myState.x, target.y - myState.y);
    if (dist > classConfig.combat.attackRange) {
      this.clickMoveTarget = { x: target.x, y: target.y };
      return;
    }

    if (now - this.lastBasicAttackAt < cooldownMs) return;

    this.lastBasicAttackAt = now;
    this.network.sendAttack(target.x, target.y);

    if (this.basicAttackIntent === 'once') {
      this.basicAttackIntent = 'none';
      this.basicAttackTargetId = null;
    }
  }

  private getClassConfig(classType: string) {
    return (CLASSES as any)[classType] || (CLASSES as any).mage || (CLASSES as any).warrior;
  }
}
