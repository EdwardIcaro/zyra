import { Assets, BitmapText, Container, Graphics, Sprite, Texture } from 'pixi.js';

type HealthManaBarConfig = {
  anchor?: string;
  offsetX?: number;
  offsetY?: number;
  scale?: number;
  assets?: {
    panel?: string;
    hpFill?: string;
    hpOverlay?: string;
    manaFill?: string;
    manaOverlay?: string;
  };
  fonts?: {
    name?: string;
    values?: string;
  };
  text?: {
    name?: string;
    level?: string;
    levelLabel?: string;
    levelNumber?: string;
    hp?: string;
    mana?: string;
  };
  elementOverrides?: Record<string, {
    x?: number;
    y?: number;
    scale?: number;
    width?: number;
    height?: number;
    alpha?: number;
    tint?: string;
    font?: string;
    fontSize?: number;
  }>;
};

type Identity = {
  name: string;
  level: number;
};

export class HealthManaBar extends Container {
  static readonly PANEL_W = 400;
  static readonly PANEL_H = 80;

  static readonly BAR_W = 360;
  static readonly BAR_H = 20;

  private panel!: Sprite;

  private hpFill!: Sprite;
  private hpShadow!: Sprite;
  private hpOverlay!: Sprite;
  private hpMask!: Graphics;
  private hpShadowMask!: Graphics;

  private manaFill!: Sprite;
  private manaOverlay!: Sprite;
  private manaMask!: Graphics;

  private nameText!: BitmapText;
  private levelLabelText!: BitmapText;
  private levelNumberText!: BitmapText;
  private hpValueText!: BitmapText;
  private manaValueText!: BitmapText;

  private identity: Identity = { name: '', level: 1 };
  private hp = { current: 1, max: 1 };
  private mana = { current: 1, max: 1 };

  private hpPercent = 1;
  private hpShadowPercent = 1;
  private lastHpDecreaseAt = 0;

  private config: HealthManaBarConfig | null = null;
  private textTemplates = {
    name: '{player.name}',
    levelLabel: 'LEVEL',
    levelNumber: '{player.level}',
    hp: '{player.currentHp}/{player.maxHp}',
    mana: '{player.currentMana}/{player.maxMana}'
  };
  private hpBarWidth = HealthManaBar.BAR_W;
  private hpBarHeight = HealthManaBar.BAR_H;
  private manaBarWidth = HealthManaBar.BAR_W;
  private manaBarHeight = HealthManaBar.BAR_H;

  readonly ready: Promise<void>;

  constructor() {
    super();
    this.ready = this.loadAndBuild();
  }

  static async create(): Promise<HealthManaBar> {
    const bar = new HealthManaBar();
    await bar.ready;
    return bar;
  }

  layout(screenWidth: number, screenHeight: number) {
    const scale = this.config?.scale ?? 1;
    this.scale.set(scale);

    const width = HealthManaBar.PANEL_W * scale;
    const height = HealthManaBar.PANEL_H * scale;
    const anchor = this.config?.anchor || 'bottom-left';
    const offsetX = this.config?.offsetX ?? 20;
    const offsetY = this.config?.offsetY ?? 20;

    let x = 0;
    let y = 0;
    switch (anchor) {
      case 'top-left':
        x = offsetX; y = offsetY; break;
      case 'top-center':
        x = (screenWidth - width) / 2 + offsetX; y = offsetY; break;
      case 'top-right':
        x = screenWidth - width - offsetX; y = offsetY; break;
      case 'center-left':
        x = offsetX; y = (screenHeight - height) / 2 + offsetY; break;
      case 'center':
        x = (screenWidth - width) / 2 + offsetX; y = (screenHeight - height) / 2 + offsetY; break;
      case 'center-right':
        x = screenWidth - width - offsetX; y = (screenHeight - height) / 2 + offsetY; break;
      case 'bottom-center':
        x = (screenWidth - width) / 2 + offsetX; y = screenHeight - height - offsetY; break;
      case 'bottom-right':
        x = screenWidth - width - offsetX; y = screenHeight - height - offsetY; break;
      default:
        x = offsetX; y = screenHeight - height - offsetY; break;
    }

    this.position.set(x, y);
  }

  setIdentity(name: string, level: number) {
    this.identity = { name, level };
    this.redrawText();
  }

  setHp(current: number, max: number) {
    const safeMax = Math.max(1, Math.floor(max));
    const safeCurrent = Math.max(0, Math.min(safeMax, Math.floor(current)));

    const prevPercent = this.hpPercent;
    this.hp = { current: safeCurrent, max: safeMax };
    this.hpPercent = safeCurrent / safeMax;

    this.redrawHpMain();

    if (this.hpPercent >= prevPercent) {
      this.hpShadowPercent = this.hpPercent;
      this.redrawHpShadow();
    } else {
      this.lastHpDecreaseAt = Date.now();
    }

    this.redrawText();
  }

  setMana(current: number, max: number) {
    const safeMax = Math.max(1, Math.floor(max));
    const safeCurrent = Math.max(0, Math.min(safeMax, Math.floor(current)));
    this.mana = { current: safeCurrent, max: safeMax };

    const percent = safeCurrent / safeMax;
    this.redrawMana(percent);
    this.redrawText();
  }

  async applyConfig(config: HealthManaBarConfig | null) {
    this.config = config;
    if (config?.assets) {
      const assets = config.assets;
      const toLoad = [
        assets.panel,
        assets.hpFill,
        assets.hpOverlay,
        assets.manaFill,
        assets.manaOverlay
      ].filter(Boolean).map(name => `/assets/ui/${name}`);
      if (toLoad.length) await Assets.load(toLoad);

      if (assets.panel) this.panel.texture = Texture.from(`/assets/ui/${assets.panel}`);
      if (assets.hpFill) {
        const tex = Texture.from(`/assets/ui/${assets.hpFill}`);
        this.hpFill.texture = tex;
        this.hpShadow.texture = tex;
      }
      if (assets.hpOverlay) this.hpOverlay.texture = Texture.from(`/assets/ui/${assets.hpOverlay}`);
      if (assets.manaFill) this.manaFill.texture = Texture.from(`/assets/ui/${assets.manaFill}`);
      if (assets.manaOverlay) this.manaOverlay.texture = Texture.from(`/assets/ui/${assets.manaOverlay}`);
    }

    if (config?.fonts) {
      const fonts = config.fonts;
      const toLoad = [fonts.name, fonts.values].filter(Boolean).map(name => `/assets/fonts/${name}`);
      if (toLoad.length) await Assets.load(toLoad);
    }

    if (config?.text) {
      this.textTemplates = {
        name: config.text.name ?? this.textTemplates.name,
        levelLabel: (config.text as any).levelLabel ?? (config.text as any).level ?? this.textTemplates.levelLabel,
        levelNumber: (config.text as any).levelNumber ?? '{player.level}',
        hp: config.text.hp ?? this.textTemplates.hp,
        mana: config.text.mana ?? this.textTemplates.mana
      };
    }

    this.applyElementOverrides();
    this.redrawHpMain();
    this.redrawHpShadow();
    this.redrawMana(this.mana.current / Math.max(1, this.mana.max));
    this.redrawText();
  }

  update(dtMs: number) {
    if (!this.hpShadowMask) return;

    const now = Date.now();
    const delayMs = 140;
    if (this.hpShadowPercent > this.hpPercent && now - this.lastHpDecreaseAt >= delayMs) {
      const shrinkPerSecond = 0.55;
      const next = this.hpShadowPercent - (dtMs / 1000) * shrinkPerSecond;
      this.hpShadowPercent = Math.max(this.hpPercent, next);
      this.redrawHpShadow();
    }
  }

  private async loadAndBuild() {
    await Assets.load([
      '/assets/ui/panel-base.png',
      '/assets/ui/hp-fill.png',
      '/assets/ui/mana-fill.png',
      '/assets/ui/hp-border-overlay.png',
      '/assets/ui/mana-border-overlay.png',
      '/assets/fonts/font-sheet.fnt',
      '/assets/fonts/font-sheet2.fnt'
    ]);

    const panelTexture = Texture.from('/assets/ui/panel-base.png');
    const hpFillTexture = Texture.from('/assets/ui/hp-fill.png');
    const manaFillTexture = Texture.from('/assets/ui/mana-fill.png');
    const hpOverlayTexture = Texture.from('/assets/ui/hp-border-overlay.png');
    const manaOverlayTexture = Texture.from('/assets/ui/mana-border-overlay.png');

    const backgroundLayer = new Container();
    const hpLayer = new Container();
    const manaLayer = new Container();
    const textLayer = new Container();

    this.panel = new Sprite(panelTexture);
    this.panel.position.set(0, 0);
    backgroundLayer.addChild(this.panel);

    const barX = (HealthManaBar.PANEL_W - HealthManaBar.BAR_W) / 2;
    const hpY = 18;
    const manaY = 46;

    this.hpShadow = new Sprite(hpFillTexture);
    this.hpShadow.position.set(barX, hpY);
    this.hpShadow.alpha = 0.65;
    this.hpShadow.tint = 0x7f0e0e;
    this.hpShadowMask = new Graphics();
    this.hpShadowMask.position.set(barX, hpY);
    this.hpShadowMask.alpha = 0;
    this.hpShadow.mask = this.hpShadowMask;

    this.hpFill = new Sprite(hpFillTexture);
    this.hpFill.position.set(barX, hpY);
    this.hpMask = new Graphics();
    this.hpMask.position.set(barX, hpY);
    this.hpMask.alpha = 0;
    this.hpFill.mask = this.hpMask;

    this.hpOverlay = new Sprite(hpOverlayTexture);
    this.hpOverlay.position.set(barX, hpY);

    hpLayer.addChild(this.hpShadow, this.hpFill, this.hpOverlay, this.hpShadowMask, this.hpMask);

    this.manaFill = new Sprite(manaFillTexture);
    this.manaFill.position.set(barX, manaY);
    this.manaMask = new Graphics();
    this.manaMask.position.set(barX, manaY);
    this.manaMask.alpha = 0;
    this.manaFill.mask = this.manaMask;

    this.manaOverlay = new Sprite(manaOverlayTexture);
    this.manaOverlay.position.set(barX, manaY);

    manaLayer.addChild(this.manaFill, this.manaOverlay, this.manaMask);

    this.nameText = new BitmapText({
      text: '',
      style: { fontFamily: 'FontSheet', fontSize: 18 }
    });
    this.nameText.position.set(18, 4);

    this.levelLabelText = new BitmapText({
      text: '',
      style: { fontFamily: 'FontSheet', fontSize: 18 }
    });
    this.levelLabelText.position.set(0, 4);

    this.levelNumberText = new BitmapText({
      text: '',
      style: { fontFamily: 'FontSheet2', fontSize: 16 }
    });
    this.levelNumberText.position.set(0, 6);

    this.hpValueText = new BitmapText({
      text: '',
      style: { fontFamily: 'FontSheet2', fontSize: 16 }
    });
    this.hpValueText.position.set(HealthManaBar.PANEL_W / 2, hpY + 2);

    this.manaValueText = new BitmapText({
      text: '',
      style: { fontFamily: 'FontSheet2', fontSize: 16 }
    });
    this.manaValueText.position.set(HealthManaBar.PANEL_W / 2, manaY + 2);

    textLayer.addChild(this.nameText, this.levelLabelText, this.levelNumberText, this.hpValueText, this.manaValueText);

    this.addChild(backgroundLayer, hpLayer, manaLayer, textLayer);

    this.layout(window.innerWidth, window.innerHeight);
    this.setIdentity('Player', 1);
    this.setHp(1, 1);
    this.setMana(1, 1);
  }

  private redrawHpMain() {
    const w = this.hpBarWidth * this.hpPercent;
    this.hpMask.clear().rect(0, 0, w, this.hpBarHeight).fill(0xffffff);
  }

  private redrawHpShadow() {
    const w = this.hpBarWidth * this.hpShadowPercent;
    this.hpShadowMask.clear().rect(0, 0, w, this.hpBarHeight).fill(0xffffff);
  }

  private redrawMana(percent: number) {
    const w = this.manaBarWidth * Math.max(0, Math.min(1, percent));
    this.manaMask.clear().rect(0, 0, w, this.manaBarHeight).fill(0xffffff);
  }

  private redrawText() {
    if (!this.nameText) return;

    const name = this.identity.name || 'Player';
    const upperName = name.toUpperCase();
    const level = Math.max(1, Math.floor(this.identity.level));
    const hpText = `${this.formatNumber(this.hp.current)}/${this.formatNumber(this.hp.max)}`;
    const manaText = `${this.formatNumber(this.mana.current)}/${this.formatNumber(this.mana.max)}`;

    this.nameText.text = this.replacePlaceholders(this.textTemplates.name, upperName, level, hpText, manaText);
    this.levelLabelText.text = this.replacePlaceholders(this.textTemplates.levelLabel, upperName, level, hpText, manaText);
    this.levelNumberText.text = this.replacePlaceholders(this.textTemplates.levelNumber, upperName, level, hpText, manaText);
    this.hpValueText.text = this.replacePlaceholders(this.textTemplates.hp, upperName, level, hpText, manaText);
    this.manaValueText.text = this.replacePlaceholders(this.textTemplates.mana, upperName, level, hpText, manaText);

    const rightMargin = 18;
    const gap = 6;
    this.levelNumberText.position.x = HealthManaBar.PANEL_W - rightMargin - this.levelNumberText.width;
    this.levelLabelText.position.x = this.levelNumberText.position.x - gap - this.levelLabelText.width;
    this.hpValueText.position.x = HealthManaBar.PANEL_W / 2 - this.hpValueText.width / 2;
    this.manaValueText.position.x = HealthManaBar.PANEL_W / 2 - this.manaValueText.width / 2;

    this.applyElementOverrides();
  }

  private replacePlaceholders(template: string, name: string, level: number, hpText: string, manaText: string) {
    return template
      .replace(/\{player\.name\}/g, name)
      .replace(/\{player\.level\}/g, String(level))
      .replace(/\{player\.currentHp\}/g, String(Math.floor(this.hp.current)))
      .replace(/\{player\.maxHp\}/g, String(Math.floor(this.hp.max)))
      .replace(/\{player\.currentMana\}/g, String(Math.floor(this.mana.current)))
      .replace(/\{player\.maxMana\}/g, String(Math.floor(this.mana.max)))
      .replace(/\{player\.hpText\}/g, hpText)
      .replace(/\{player\.manaText\}/g, manaText);
  }

  private applyElementOverrides() {
    const overrides = this.config?.elementOverrides;
    if (!overrides) return;

    const applySprite = (sprite: Sprite, id: string) => {
      const ov = overrides[id];
      if (!ov) return;
      if (typeof ov.x === 'number') sprite.x = ov.x;
      if (typeof ov.y === 'number') sprite.y = ov.y;
      if (typeof ov.scale === 'number') sprite.scale.set(ov.scale);
      if (typeof ov.width === 'number') sprite.width = ov.width;
      if (typeof ov.height === 'number') sprite.height = ov.height;
      if (typeof ov.alpha === 'number') sprite.alpha = ov.alpha;
      if (ov.tint) sprite.tint = parseInt(ov.tint.replace('#', '0x'));
    };

    const applyText = (text: BitmapText, id: string) => {
      const ov = overrides[id];
      if (!ov) return;
      if (typeof ov.x === 'number') text.x = ov.x;
      if (typeof ov.y === 'number') text.y = ov.y;
      if (typeof ov.alpha === 'number') text.alpha = ov.alpha;
      if ((text as any).style) {
        if (typeof ov.fontSize === 'number') (text as any).style.fontSize = ov.fontSize;
        if (ov.font) (text as any).style.fontFamily = ov.font.includes('font-sheet2') ? 'FontSheet2' : 'FontSheet';
      } else {
        if (typeof ov.fontSize === 'number') (text as any).fontSize = ov.fontSize;
        if (ov.font) (text as any).fontName = ov.font.includes('font-sheet2') ? 'FontSheet2' : 'FontSheet';
      }
    };

    applySprite(this.panel, 'panel');
    applySprite(this.hpFill, 'hpFill');
    this.hpShadow.position.set(this.hpFill.x, this.hpFill.y);
    this.hpShadow.scale.set(this.hpFill.scale.x, this.hpFill.scale.y);
    this.hpShadow.width = this.hpFill.width;
    this.hpShadow.height = this.hpFill.height;
    applySprite(this.hpOverlay, 'hpOverlay');
    applySprite(this.manaFill, 'manaFill');
    applySprite(this.manaOverlay, 'manaOverlay');

    applyText(this.nameText, 'nameText');
    const legacyLevel = overrides.levelText;
    if (legacyLevel && !overrides.levelLabelText) overrides.levelLabelText = legacyLevel;
    if (legacyLevel && !overrides.levelNumberText) overrides.levelNumberText = legacyLevel;

    applyText(this.levelLabelText, 'levelLabelText');
    applyText(this.levelNumberText, 'levelNumberText');
    applyText(this.hpValueText, 'hpText');
    applyText(this.manaValueText, 'manaText');

    // Use the actual fill sprite dimensions after overrides so masks match preview even when user resizes via scale.
    this.hpBarWidth = this.hpFill.width || HealthManaBar.BAR_W;
    this.hpBarHeight = this.hpFill.height || HealthManaBar.BAR_H;
    this.manaBarWidth = this.manaFill.width || HealthManaBar.BAR_W;
    this.manaBarHeight = this.manaFill.height || HealthManaBar.BAR_H;

    this.hpMask.position.set(this.hpFill.x, this.hpFill.y);
    this.hpShadowMask.position.set(this.hpFill.x, this.hpFill.y);
    this.manaMask.position.set(this.manaFill.x, this.manaFill.y);

    this.redrawHpMain();
    this.redrawHpShadow();
    this.redrawMana(this.mana.current / Math.max(1, this.mana.max));
  }

  private formatNumber(value: number): string {
    return Math.round(value).toLocaleString('en-US');
  }
}
