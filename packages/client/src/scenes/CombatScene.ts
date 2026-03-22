import { Assets, Container, Graphics, Sprite, Text } from 'pixi.js';
import type { Game } from '../game/Game';
import type { NetworkManager } from '../game/NetworkManager';
import { Player } from '../entities/Player';
import { MonsterEntity } from '../entities/Monster';
import { ProjectileEntity } from '../entities/Projectile';
import { DroppedItemEntity } from '../entities/DroppedItem';
import { InputSystem } from '../systems/InputSystem';
import { TargetingSystem } from '../systems/TargetingSystem';
import { ConjurationSystem } from '../systems/ConjurationSystem';
import { AudioManager } from '../systems/AudioManager';
import { GameHUD } from '../ui/GameHUD';
import { TargetFrameUI } from '../ui/TargetFrameUI';
import { InventoryUI } from '../ui/InventoryUI';
import { ItemTooltip } from '../ui/ItemTooltip';
import { SpellSlotsUI } from '../ui/SpellSlotsUI';
import { CardMenuUI } from '../ui/CardMenuUI';
import { ParticleSystem } from '../effects/ParticleSystem';
import { DamageNumberSystem } from '../effects/DamageNumberSystem';
import type { PlayerState, MonsterState, ProjectileState, DroppedItemState, ZoneTileState } from '@zyra/shared';
import { CLASSES } from '@zyra/shared';
import { SkillBarUI } from '../ui/SkillBarUI';
import { HealthManaBar } from '../ui/HealthManaBar';
import { StatsUI } from '../ui/StatsUI';
import { uiAdjustments } from '../ui/UIAdjustments';
import { getApiBase } from '../Config';

export class CombatScene extends Container {
  private game: Game; // Adicionado para acessar o App e Ticker
  private network: NetworkManager;
  private inputSystem: InputSystem;
  private hud: GameHUD;
  private healthManaBar: HealthManaBar;
  private inventoryUI: InventoryUI;
  private statsUI: StatsUI;
  private statsButton: Container;
  private statsButtonBg: Graphics;
  private statsButtonText: Text;
  private statsButtonConfig: any = null;
  private tooltip: ItemTooltip;
  private conjurationSystem: ConjurationSystem | null = null;
  private spellSlotsUI: SpellSlotsUI | null = null;
  private cardMenuUI: CardMenuUI | null = null;
  private pendingDeckSync: any[] | null = null;
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
  private audioManager: AudioManager;

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
  private keybindings = {
    fire1: 'Numpad1',  // Slot 0
    fire2: 'Numpad2',  // Slot 1
    fire3: 'Numpad3',  // Slot 2
    conjure: 'f',
    inventory: 'i',
    stats: 'p',
    cards: 'c'
  };
  private basicAttackIntent: 'none' | 'once' | 'auto' = 'none';
  private basicAttackTargetId: string | null = null;
  private lastBasicAttackAt = 0;

  constructor(game: Game, network: NetworkManager) {
    super();
    this.game = game; // Salva a referência do Game
    this.network = network;
    this.inputSystem = new InputSystem();
    this.audioManager = new AudioManager();
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
    uiAdjustments.apply(this.hud);

    this.healthManaBar = new HealthManaBar();
    this.healthManaBar.zIndex = 1100;
    this.addChild(this.healthManaBar);
    this.healthManaBar.ready.then(() => {
      this.healthManaBar.layout(window.innerWidth, window.innerHeight);
    });
    uiAdjustments.apply(this.healthManaBar);

    this.skillBar = new SkillBarUI();
    this.skillBar.zIndex = 1200;
    this.skillBar.layout(window.innerWidth, window.innerHeight);
    this.addChild(this.skillBar);
    uiAdjustments.apply(this.skillBar);

    this.inventoryUI = new InventoryUI();
    this.inventoryUI.zIndex = 2000;
    this.addChild(this.inventoryUI);

    // 🎯 Carregar posições salvas dos slots
    this.inventoryUI.loadSavedPositions();

    // UIAdjustments é legado para o inventário; quando existir config no DB, o InventoryUI ignora.
    uiAdjustments.apply(this.inventoryUI);

    this.statsUI = new StatsUI();
    this.statsUI.zIndex = 2050;
    this.addChild(this.statsUI);

    // 🎨 Aplicar ajustes de UI (from UI Editor)
    uiAdjustments.apply(this.statsUI);

    this.statsButton = new Container();
    this.statsButtonBg = new Graphics()
      .roundRect(0, 0, 90, 34, 8)
      .fill({ color: 0x1b1b1b, alpha: 0.9 })
      .stroke({ width: 2, color: 0x2f2f2f });
    this.statsButtonText = new Text({
      text: 'STATUS',
      style: { fontFamily: 'Georgia', fontSize: 12, fill: 0xf4e4bc, fontWeight: 'bold' }
    });
    this.statsButtonText.anchor.set(0.5, 0.5);
    this.statsButtonText.position.set(45, 17);
    this.statsButton.addChild(this.statsButtonBg, this.statsButtonText);
    this.statsButton.eventMode = 'static';
    this.statsButton.cursor = 'pointer';
    this.statsButton.on('pointerdown', (e) => {
      e.stopPropagation();
      this.statsUI.toggle();
    });
    this.statsButton.zIndex = 2051;
    this.addChild(this.statsButton);
    this.statsButton.position.set(window.innerWidth - 110, window.innerHeight - 60);
    this.statsUI.layout(window.innerWidth, window.innerHeight);

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

    console.log('[CombatScene] 🔗 setupRoom iniciado, sessionId:', room.sessionId);

    // REGISTRAR LISTENER DE SERVER:CONFIG PRIMEIRO (antes de qualquer outro)
    console.log('[CombatScene] 📍 Registrando listener para server:config...');
    room.onMessage('server:config', (cfg) => {
      console.log('[CombatScene] 📨 RECEBIDO server:config:', cfg);

      if (cfg.keybindings) {
        const oldBindings = { ...this.keybindings };
        Object.assign(this.keybindings, cfg.keybindings);
        console.log('[CombatScene] ⌨️ Keybindings atualizados:');
        console.log('   Antes:', oldBindings);
        console.log('   Depois:', this.keybindings);
        // ✅ Passar a tecla de conjure para ConjurationSystem (para bloquear digitação)
        if (this.conjurationSystem && cfg.keybindings.conjure) {
          this.conjurationSystem.setConjureKey(cfg.keybindings.conjure);
        }
      }

      if (cfg.movement) {
        console.log('[CombatScene] 🎮 Aplicando movimento config:', cfg.movement);
        this.inputSystem.applyConfig(cfg);
        console.log('[CombatScene] ✅ Movimento config aplicada');
      }

      console.log('[CombatScene] ✅ server:config processada completamente');
    });
    console.log('[CombatScene] ✅ Listener para server:config registrado');

    // REGISTRAR LISTENER DE DECK DEPOIS
    room.onMessage('deck:sync', (data: { cards: any[] }) => {
      if (data.cards && data.cards.length > 0) {
        // Separar cards em ativos (4) e passivos (2)
        const MAX_ACTIVE = 4;
        const activeDeck = data.cards.slice(0, MAX_ACTIVE);
        const passiveDeck = data.cards.slice(MAX_ACTIVE);

        // Atualizar ConjurationSystem se existir
        if (this.conjurationSystem) {
          this.conjurationSystem.setPlayerDeck(data.cards);
          console.log(`[CombatScene] Deck sincronizado: ${data.cards.length} cards`);
        } else {
          // Guardar para depois
          this.pendingDeckSync = data.cards;
          console.log(`[CombatScene] Deck pendente salvo: ${data.cards.length} cards`);
        }

        // Atualizar CardMenuUI se existir
        if (this.cardMenuUI) {
          this.cardMenuUI.setPlayerDeck(activeDeck, passiveDeck);
          console.log(`[CombatScene] CardMenuUI atualizado: ${activeDeck.length} ativos + ${passiveDeck.length} passivos`);
        }
      }
    });

    // CRIAR CONJURATION SYSTEM LOGO APÓS REGISTRAR OS LISTENERS
    this.conjurationSystem = new ConjurationSystem(this, room);
    this.conjurationSystem.onConjureReady = (card) => {
      console.log(`[CombatScene] Magia pronta: ${card.name}`);
    };
    this.conjurationSystem.onActivate = () => {
      const myPlayer = this.players.get(this.mySessionId!);
      myPlayer?.setConjuring(true);
    };
    this.conjurationSystem.onDeactivate = () => {
      const myPlayer = this.players.get(this.mySessionId!);
      myPlayer?.setConjuring(false);
    };

    // Se já recebeu deck:sync antes de ser criado, aplicar agora
    if (this.pendingDeckSync) {
      this.conjurationSystem.setPlayerDeck(this.pendingDeckSync);
      console.log(`[CombatScene] Deck pendente aplicado: ${this.pendingDeckSync.length} cards`);
      this.pendingDeckSync = null;
    }

    // Criar SpellSlotsUI
    this.spellSlotsUI = new SpellSlotsUI(this, room);

    console.log('[CombatScene] ConjurationSystem inicializado');

    // Solicitar deck ao servidor após criar o ConjurationSystem (fallback)
    setTimeout(() => {
      room.send('deck:request', {});
      console.log('[CombatScene] Deck solicitado ao servidor (fallback)');
    }, 1000);

    this.inventoryUI.onItemDoubleClick = (index: number) => {
        // 🔊 Som de equipar item
        this.audioManager.playSound('equip-success', 0.6);
        room.send('equipment:equip', { inventorySlot: index });
    };
    this.inventoryUI.onItemMove = (from: number, to: number) => {
        room.send('inventory:move', { from, to });
    };
    this.inventoryUI.onEquipmentClick = (slotName: string) => {
        room.send('equipment:unequip', { equipmentSlot: slotName });
    };
    this.inventoryUI.onSort = () => {
        // 📦 Compactar inventário removendo buracos vazios
        console.log('[CombatScene] Ordenando inventário (compactando slots vazios)...');
        room.send('inventory:sort', {});
    };
    this.inventoryUI.onDrop = (slotIndex: number) => {
        // 🗑️ Descartar item do slot especificado
        console.log('[CombatScene] Descartando item do slot:', slotIndex);
        room.send('inventory:drop', { slotIndex });
    };

    room.state.listen('zoneName', (value: string) => {
      this.zoneNameText.text = value;
    });

    room.state.listen('width', () => this.updateZoneBackground());
    this.setupTileListeners(room);

    try {
      const res = await fetch(`${getApiBase()}/api/buffs`);
      const buffs = await res.json();
      const map = new Map<string, any>();
      buffs.forEach((b: any) => map.set(b.id, b));
      this.hud.setBuffTemplates(map);
    } catch (e) {
      console.warn('[CombatScene] Failed to load buff templates');
    }

    // Carregar cards e criar CardMenuUI
    try {
      const cardsRes = await fetch(`${getApiBase()}/api/cards`);
      const data = await cardsRes.json();
      const allCards = Array.isArray(data) ? data : (data.cards || []);

      this.cardMenuUI = new CardMenuUI(room);
      this.cardMenuUI.setAvailableCards(allCards);
      this.cardMenuUI.zIndex = 2100;
      this.addChild(this.cardMenuUI);

      // Passar durações dos cards para SpellSlotsUI
      if (this.spellSlotsUI) {
        this.spellSlotsUI.setCardDurations(allCards);
      }
    } catch (e: any) {
      console.warn('[CombatScene] Failed to load cards:', e?.message);
      // Mesmo assim criar o menu vazio
      this.cardMenuUI = new CardMenuUI(room);
      this.cardMenuUI.setAvailableCards([]);
      this.cardMenuUI.zIndex = 2100;
      this.addChild(this.cardMenuUI);
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
          // 🔊 Som de impacto
          this.audioManager.playSound('impact-magic', 0.8);
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
          // 🔊 Som de level up
          this.audioManager.playSound('levelup-fanfare', 1.0);
          this.showLevelUpEffect(playerEntity);
        }
      });

      if (isLocal) {
        let lastPlayerHp = player.currentHp;
        player.onChange(() => {
          // 🔊 Som de dano do player + 🎬 Efeitos visuais
          if (player.currentHp < lastPlayerHp) {
            this.audioManager.playSound('player-hit', 0.9);
            this.screenShake(15, 150);
            this.flashDamage(100, 0.6);
            lastPlayerHp = player.currentHp;
          }

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
        // 🔊 Som de pegar loot
        this.audioManager.playSound('pickup-gold', 0.7);
        this.world.removeChild(d);
        this.droppedItems.delete(id);
        d.destroy({ children: true });
      }
    });

    room.state.projectiles.onAdd((proj: ProjectileState, id: string) => {
      const ownerClassType = room.state.players.get(proj.ownerId)?.classType || '';
      const projEntity = new ProjectileEntity(proj, ownerClassType);
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

    // Bloquear TODAS as teclas do navegador enquanto estiver no jogo
    // Usa captura (true) para ter prioridade máxima
    window.addEventListener('keydown', (e) => {
      // Permitir Ctrl+Alt+U para UI editor
      if (e.ctrlKey && e.altKey && e.key.toLowerCase() === 'u') {
        e.preventDefault();
        this.game.openUIEditor();
        return;
      }

      // ✅ Lista de teclas de atalho configuradas (não devem ser bloqueadas do navegador)
      const allowedKeybindings = Object.values(this.keybindings).map(k => k.toLowerCase());

      // Lista de teclas que devem ser bloqueadas do navegador
      const browserKeysToBlock = [
        'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12', // F-keys
        'Tab', // Navegação entre elementos
        ' ', // Espaço (scroll)
        'Enter', // Envio de formulário
      ];

      // Teclas de sistema que queremos bloquear
      const systemKeysToBlock = [
        ...(e.ctrlKey || e.metaKey ? ['s', 'p', 'o', 'n', 'w'] : []), // Ctrl+S, Ctrl+P, Ctrl+O, Ctrl+N, Ctrl+W
        ...(e.altKey ? ['f', 'h'] : []), // Alt+F (menu), Alt+H
      ];

      // ✅ Bloquear F-keys, Tab, Space, Enter - MAS permitir se for um atalho configurado
      if (browserKeysToBlock.includes(e.key)) {
        const keyLower = e.key.toLowerCase();
        // Permitir se for uma tecla de atalho (ex: Tab como conjure)
        if (!allowedKeybindings.includes(keyLower)) {
          e.preventDefault();
          return;
        }
      }

      // Bloquear Ctrl/Cmd + Sistema keys
      if (systemKeysToBlock.includes(e.key.toLowerCase())) {
        e.preventDefault();
        return;
      }

      // Handler normal do jogo
      if (e.key === 'F1') {
        e.preventDefault();
        this.toggleCollisionDebug();
        return;
      }

      const key = e.key.toLowerCase();

      // ✅ ESC fecha qualquer menu aberto
      if (e.key === 'Escape') {
        e.preventDefault();
        if (this.inventoryUI.visible) {
          this.inventoryUI.close();
          return;
        }
        if (this.statsUI.visible) {
          this.statsUI.close();
          return;
        }
        if (this.cardMenuUI?.visible) {
          this.cardMenuUI.close();
          return;
        }
        if (this.conjurationSystem?.isConjuring()) {
          this.conjurationSystem.deactivate();
          return;
        }
        return;
      }

      // ✅ Bloquear menus durante conjuração (permite apenas ESC e Conjure para fechar)
      if (this.conjurationSystem?.isConjuring()) {
        console.log('[CombatScene] 🔮 Bloqueando tecla durante conjuração:', key);
        return; // Permite que apenas Conjure (já foi processado) e ESC (já foi processado) funcionem
      }

      // ✅ INVENTORY TOGGLE (tecla configurada ou 'e' como alternativa)
      if (key === this.keybindings.inventory || key === 'e') {
        e.preventDefault();
        if (!this.mySessionId) return;
        console.log('[CombatScene] 📦 Inventory toggle (tecla:', key, ') - visível agora:', this.inventoryUI.visible);
        this.inventoryUI.toggle();
        return;
      }

      // ✅ STATS TOGGLE
      if (key === this.keybindings.stats) {
        e.preventDefault();
        console.log('[CombatScene] 📊 Stats toggle (tecla:', key, ') - visível agora:', this.statsUI.visible);
        this.statsUI.toggle();
        return;
      }

      // ✅ CARDS TOGGLE
      if (key === this.keybindings.cards) {
        e.preventDefault();
        console.log('[CombatScene] 🃏 Cards toggle (tecla:', key, ') - visível agora:', this.cardMenuUI?.visible);
        this.cardMenuUI?.toggle();
        return;
      }

      // ✅ FIRE ACTIONS (dispara card via keybindings)
      // Suporta tanto teclas Numpad quanto teclado normal
      console.log(`[CombatScene] ⌨️ DEBUG: e.key="${e.key}", e.code="${e.code}"`);

      if (this.matchesKey(e, this.keybindings.fire1)) {
        e.preventDefault();
        console.log('[CombatScene] 🔥 Fire1 key (', this.keybindings.fire1, ') ✅ DISPARADO');
        this.fireSlot(0);
        return;
      }
      if (this.matchesKey(e, this.keybindings.fire2)) {
        e.preventDefault();
        console.log('[CombatScene] 🔥 Fire2 key (', this.keybindings.fire2, ') ✅ DISPARADO');
        this.fireSlot(1);
        return;
      }
      if (this.matchesKey(e, this.keybindings.fire3)) {
        e.preventDefault();
        console.log('[CombatScene] 🔥 Fire3 key (', this.keybindings.fire3, ') ✅ DISPARADO');
        this.fireSlot(2);
        return;
      }

      // ✅ CONJURE TOGGLE (abre/fecha painel de conjuração)
      if (key === this.keybindings.conjure) {
        console.log('[CombatScene] 🎯 Conjure key detectado:', key, '| isConjuring:', this.conjurationSystem?.isConjuring());
        e.preventDefault();
        if (this.conjurationSystem?.isConjuring()) {
          console.log('[CombatScene] 🔮 Desativando conjuração (tecla:', key, ')');
          this.conjurationSystem.deactivate();
        } else if (!this.inventoryUI.visible && !this.cardMenuUI?.visible) {
          console.log('[CombatScene] 🔮 Ativando conjuração (tecla:', key, ')');
          this.conjurationSystem?.activate();
          console.log('[CombatScene] ✅ activate() foi chamado');
        }
        return;
      }
    }, true); // true = usar captura para máxima prioridade
  }

  /**
   * Verifica se um evento de teclado corresponde a um keybinding
   * Suporta tanto teclas Numpad/Key (via e.code) quanto caracteres normais (via e.key)
   */
  private matchesKey(event: KeyboardEvent, binding: string): boolean {
    // Se o binding começa com "Numpad", "Key" ou "Digit", comparar via e.code
    if (binding.startsWith('Numpad') || binding.startsWith('Key') || binding.startsWith('Digit')) {
      return event.code === binding;
    }
    // Caso contrário, comparar via e.key (ex: "q", "f", "i")
    return event.key.toLowerCase() === binding.toLowerCase();
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

    // Atualizar animação de respiração do preview
    this.inventoryUI.updateBreathAnimation(deltaTime);

    // Atualizar ConjurationSystem
    if (this.conjurationSystem) {
      this.conjurationSystem.update(deltaTime);
    }

    if (!this.inventoryUI.visible && !this.cardMenuUI?.visible && !this.conjurationSystem?.isConjuring()) {
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

    this.monsters.forEach(monster => {
      const st = monster.getState();
      if (st.targetPlayerId) {
        const target = this.players.get(st.targetPlayerId);
        if (target) {
          monster.setAttackDirection(target.x - st.x, target.y - st.y);
        } else {
          monster.setAttackDirection(0, 0);
        }
      } else {
        monster.setAttackDirection(0, 0);
      }
      monster.update(deltaTime);
    });
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
        this.inventoryUI.update(myState.inventory, myState.equipment, myState.gold, myState);
        this.statsUI.updateFromState(myState);

        // Atualizar SpellSlotsUI com estado de magia
        if (this.spellSlotsUI) {
          this.spellSlotsUI.update(myState);
        }

        // Sincronizar modo de conjuração
        if (this.conjurationSystem && this.spellSlotsUI) {
          this.spellSlotsUI.setConjuringMode(this.conjurationSystem.isConjuring());
        }
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
    this.statsUI.layout(window.innerWidth, window.innerHeight);
    if (this.statsButtonConfig) this.applyStatsButtonConfig(this.statsButtonConfig);
    else this.statsButton.position.set(window.innerWidth - 110, window.innerHeight - 60);
  }

  private async loadUiConfigs() {
    try {
      const res = await fetch(`${getApiBase()}/api/ui/configs?ts=${Date.now()}`, { cache: 'no-store' });
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
    console.log('[CombatScene] healthCfg', healthCfg);
    const skillCfg = this.uiConfigs.get('skill_bar') || null;
    const statsCfg = this.uiConfigs.get('stats_ui') || null;
    const statsBtnCfg = this.uiConfigs.get('stats_button') || null;
    await this.healthManaBar.ready;
    if (healthCfg) {
      console.log('[CombatScene] applying health cfg', healthCfg.anchor);
      await this.healthManaBar.applyConfig(healthCfg);
    }
    if (skillCfg) this.skillBar.applyConfig(skillCfg);
    const invCfg = this.uiConfigs.get('inventory_ui') || null;
    if (invCfg) this.inventoryUI.applyConfig(invCfg);
    if (statsCfg) this.statsUI.applyConfig(statsCfg);
    if (statsBtnCfg) {
      this.statsButtonConfig = statsBtnCfg;
      this.applyStatsButtonConfig(statsBtnCfg);
    }
    this.healthManaBar.layout(window.innerWidth, window.innerHeight);
    this.skillBar.layout(window.innerWidth, window.innerHeight);
    this.statsUI.layout(window.innerWidth, window.innerHeight);
  }

  private applyStatsButtonConfig(cfg: any) {
    if (!cfg) return;
    const anchor = cfg.anchor || 'bottom-right';
    const scale = cfg.scale ?? 1;
    const offsetX = cfg.offsetX ?? -110;
    const offsetY = cfg.offsetY ?? -60;
    const width = 90 * scale;
    const height = 34 * scale;
    let x = 0, y = 0;
    switch (anchor) {
      case 'bottom-right':
        x = window.innerWidth - width + offsetX; y = window.innerHeight - height + offsetY; break;
      case 'bottom-left':
        x = offsetX; y = window.innerHeight - height + offsetY; break;
      case 'top-left':
        x = offsetX; y = offsetY; break;
      case 'top-right':
        x = window.innerWidth - width + offsetX; y = offsetY; break;
      case 'center':
        x = (window.innerWidth - width) / 2 + offsetX; y = (window.innerHeight - height) / 2 + offsetY; break;
      default:
        x = window.innerWidth - width + offsetX; y = window.innerHeight - height + offsetY; break;
    }
    this.statsButton.position.set(x, y);
    this.statsButton.scale.set(scale);

    const ov = cfg.elementOverrides || {};
    const btnOv = ov.buttonBg || {};
    if (typeof btnOv.x === 'number') this.statsButtonBg.x = btnOv.x;
    if (typeof btnOv.y === 'number') this.statsButtonBg.y = btnOv.y;
    if (typeof btnOv.scale === 'number') this.statsButtonBg.scale.set(btnOv.scale);
    if (typeof btnOv.alpha === 'number') this.statsButtonBg.alpha = btnOv.alpha;
    if (btnOv.tint) this.statsButtonBg.tint = parseInt(String(btnOv.tint).replace('#', '0x'));

    const textOv = ov.buttonText || {};
    if (typeof textOv.x === 'number') this.statsButtonText.x = textOv.x;
    if (typeof textOv.y === 'number') this.statsButtonText.y = textOv.y;
    if (typeof textOv.scale === 'number') this.statsButtonText.scale.set(textOv.scale);
    if (typeof textOv.alpha === 'number') this.statsButtonText.alpha = textOv.alpha;
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

  private fireSlot(slotIndex: number) {
    const room = this.network.getCurrentRoom();
    if (!room || !this.mySessionId) return;

    const myState = room.state.players.get(this.mySessionId);
    if (!myState?.spellSlots) return;

    // Verificar se há card ativo no slot especificado
    const slot = myState.spellSlots.get(String(slotIndex));
    if (!slot) {
      this.showToast(`Slot ${slotIndex + 1} vazio!`);
      return;
    }

    // Obter alvo selecionado
    const targetId = this.targetingSystem.getSelectedTargetId();
    const targetEntity = targetId ? this.monsters.get(targetId) : null;
    const targetX = targetEntity?.getState().x ?? (this.clickMoveTarget?.x ?? myState.x);
    const targetY = targetEntity?.getState().y ?? (this.clickMoveTarget?.y ?? myState.y);

    // 🔊 Som de disparar magia
    this.audioManager.playSound('spell-cast', 0.7);

    room.send('conjure:fire', {
      slotIndex,
      targetX,
      targetY,
      targetId: targetId || undefined
    });

    console.log(`[CombatScene] Disparando card do slot ${slotIndex}: ${slot.cardName}`);
  }

  private getClassConfig(classType: string) {
    return (CLASSES as any)[classType] || (CLASSES as any).mage || (CLASSES as any).warrior;
  }

  private screenShake(intensity: number = 10, duration: number = 100) {
    const startTime = Date.now();
    const originalX = this.world.position.x;
    const originalY = this.world.position.y;

    const shake = () => {
      const elapsed = Date.now() - startTime;
      if (elapsed > duration) {
        this.world.position.set(originalX, originalY);
        return;
      }
      const x = originalX + (Math.random() - 0.5) * intensity;
      const y = originalY + (Math.random() - 0.5) * intensity;
      this.world.position.set(x, y);
      requestAnimationFrame(shake);
    };
    requestAnimationFrame(shake);
  }

  private flashDamage(duration: number = 100, alpha: number = 0.6) {
    const flash = new Graphics();
    flash.rect(0, 0, window.innerWidth, window.innerHeight);
    flash.fill({ color: 0xffffff, alpha });
    flash.zIndex = 2500;
    this.addChild(flash);

    const startTime = Date.now();
    const fadeOut = () => {
      const elapsed = Date.now() - startTime;
      if (elapsed > duration) {
        this.removeChild(flash);
        flash.destroy();
        return;
      }
      const progress = elapsed / duration;
      flash.alpha = alpha * (1 - progress);
      requestAnimationFrame(fadeOut);
    };
    requestAnimationFrame(fadeOut);
  }
}
