import { Container, Graphics, Text } from 'pixi.js';
import type { Game } from '../game/Game';
import type { NetworkManager } from '../game/NetworkManager';
import { Player } from '../entities/Player'; 
import { MonsterEntity } from '../entities/Monster';
import { ProjectileEntity } from '../entities/Projectile';
import { DroppedItemEntity } from '../entities/DroppedItem';
import { InputSystem } from '../systems/InputSystem';
import { GameHUD } from '../ui/GameHUD'; 
import { InventoryUI } from '../ui/InventoryUI'; 
import { ItemTooltip } from '../ui/ItemTooltip';
import { ParticleSystem } from '../effects/ParticleSystem';
import { DamageNumberSystem } from '../effects/DamageNumberSystem';
import type { PlayerState, MonsterState, ProjectileState, DroppedItemState } from '@zyra/shared';

export class CombatScene extends Container {
  private game: Game; // Adicionado para acessar o App e Ticker
  private network: NetworkManager;
  private inputSystem: InputSystem;
  private hud: GameHUD;
  private inventoryUI: InventoryUI; 
  private tooltip: ItemTooltip;
  private world: Container;
  private background: Graphics;
  private fpsText: Text;
  private zoneNameText: Text;
  
  private particles: ParticleSystem;
  private damageNumbers: DamageNumberSystem;

  private players = new Map<string, Player>();
  private monsters = new Map<string, MonsterEntity>();
  private projectiles = new Map<string, ProjectileEntity>();
  private droppedItems = new Map<string, DroppedItemEntity>();

  private mySessionId: string | null = null;
  private lastMovement = { dx: 0, dy: 0 };
  private lastMovementUpdate = 0;
  private movementUpdateInterval = 50;

  constructor(game: Game, network: NetworkManager) {
    super();
    this.game = game; // Salva a referência do Game
    this.network = network;
    this.inputSystem = new InputSystem();

    this.background = new Graphics();
    this.background.zIndex = -10; 
    this.addChild(this.background);

    this.world = new Container();
    this.world.zIndex = 0;
    this.world.sortableChildren = true; 
    this.addChild(this.world);

    this.particles = new ParticleSystem();
    this.particles.zIndex = 500; 
    this.damageNumbers = new DamageNumberSystem();
    this.damageNumbers.zIndex = 600;
    this.world.addChild(this.particles);
    this.world.addChild(this.damageNumbers);

    this.hud = new GameHUD();
    this.hud.zIndex = 1000;
    this.addChild(this.hud);

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

    room.state.monsters.onAdd((monster: MonsterState, id: string) => {
      const monsterEntity = new MonsterEntity(monster);
      monsterEntity.zIndex = 100;
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
      this.network.sendAttack(worldPos.x, worldPos.y);
    });

    window.addEventListener('keydown', (e) => {
      const key = e.key.toLowerCase();
      if (key === 'i' || key === 'e') {
        this.inventoryUI.toggle();
      }
      if (e.key === 'Escape' && this.inventoryUI.visible) {
        this.inventoryUI.close();
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

  update(deltaTime: number) {
    const now = Date.now();
    const room = this.network.getCurrentRoom();
    if (!room) return;

    this.fpsText.text = `FPS: ${Math.round(60 / deltaTime)}`;

    if (!this.inventoryUI.visible) {
      const input = this.inputSystem.getMovementInput();
      const dx = parseFloat(input.dx.toFixed(2));
      const dy = parseFloat(input.dy.toFixed(2));
      const isMoving = dx !== 0 || dy !== 0;
      const changed = dx !== this.lastMovement.dx || dy !== this.lastMovement.dy;

      if (changed || (isMoving && now - this.lastMovementUpdate > this.movementUpdateInterval)) {
        if (isMoving) this.network.sendMove(dx, dy);
        else this.network.sendStop();
        
        this.lastMovement = { dx, dy };
        this.lastMovementUpdate = now;
      }
    }

    this.monsters.forEach(monster => monster.update(deltaTime));
    this.projectiles.forEach(pr => pr.update(deltaTime));
    this.droppedItems.forEach(item => item.update(deltaTime));
    this.particles.update();
    this.damageNumbers.update();
    this.players.forEach((player) => {
        player.update(deltaTime);
    });

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
  }
}