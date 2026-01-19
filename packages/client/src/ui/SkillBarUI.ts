import { Container, Graphics, Text } from 'pixi.js';

export class SkillBarUI extends Container {
  private slotBg: Graphics;
  private cooldownOverlay: Graphics;
  private chargeBarBg: Graphics;
  private chargeBarFill: Graphics;
  private keyText: Text;
  private labelText: Text;
  private slotSize = 54;
  private barWidth = 64;
  private barHeight = 6;
  private cooldownProgress = 1;
  private layoutConfig: {
    anchor?: string;
    offsetX?: number;
    offsetY?: number;
    scale?: number;
  } | null = null;
  private elementOverrides: Record<string, any> = {};
  private placeholderContext: Record<string, any> = {};
  private keyTemplate = 'Q';
  private labelTemplate = 'Basic';

  constructor() {
    super();

    this.slotBg = new Graphics();
    this.cooldownOverlay = new Graphics();
    this.chargeBarBg = new Graphics();
    this.chargeBarFill = new Graphics();

    this.keyText = new Text({
      text: 'Q',
      style: {
        fontFamily: 'Georgia',
        fontSize: 16,
        fill: 0xffffff,
        fontWeight: 'bold',
        stroke: { color: 0x000000, width: 2 }
      }
    });
    this.keyText.anchor.set(0.5);
    this.keyText.position.set(0, -6);

    this.labelText = new Text({
      text: 'Basic',
      style: {
        fontFamily: 'Arial',
        fontSize: 10,
        fill: 0xd8d8d8,
        stroke: { color: 0x000000, width: 2 }
      }
    });
    this.labelText.anchor.set(0.5);
    this.labelText.position.set(0, 14);

    this.addChild(this.slotBg, this.cooldownOverlay, this.chargeBarBg, this.chargeBarFill, this.keyText, this.labelText);
    this.redraw();
  }

  setCooldownProgress(progress: number) {
    this.cooldownProgress = Math.max(0, Math.min(1, progress));
    this.redraw();
  }

  setPlaceholderContext(context: Record<string, any>) {
    this.placeholderContext = context || {};
    this.updateTexts();
  }

  applyConfig(config: any) {
    if (!config) return;
    this.layoutConfig = {
      anchor: config.anchor,
      offsetX: config.offsetX,
      offsetY: config.offsetY,
      scale: config.scale
    };
    if (typeof config.slotSize === 'number') this.slotSize = config.slotSize;
    if (typeof config.barWidth === 'number') this.barWidth = config.barWidth;
    if (typeof config.barHeight === 'number') this.barHeight = config.barHeight;
    if (config.elementOverrides) this.elementOverrides = config.elementOverrides;

    if (config.colors) {
      (this as any)._slotColor = config.colors.slot;
      (this as any)._cooldownColor = config.colors.cooldown;
      (this as any)._chargeColor = config.colors.charge;
    }
    if (config.keyText) this.keyTemplate = config.keyText;
    if (config.labelText) this.labelTemplate = config.labelText;

    this.redraw();
  }

  layout(screenWidth: number, screenHeight: number) {
    const anchor = this.layoutConfig?.anchor || 'bottom-center';
    const offsetX = this.layoutConfig?.offsetX ?? 0;
    const offsetY = this.layoutConfig?.offsetY ?? 70;
    const scale = this.layoutConfig?.scale ?? 1;
    this.scale.set(scale);

    const width = Math.max(this.slotSize, this.barWidth) * scale;
    const height = (this.slotSize + this.barHeight + 12) * scale;

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
      case 'bottom-left':
        x = offsetX; y = screenHeight - height - offsetY; break;
      case 'bottom-right':
        x = screenWidth - width - offsetX; y = screenHeight - height - offsetY; break;
      default:
        x = (screenWidth - width) / 2 + offsetX; y = screenHeight - height - offsetY; break;
    }
    this.position.set(x, y);
  }

  private redraw() {
    const half = this.slotSize / 2;
    const barY = half + 8;
    const slotColor = (this as any)._slotColor || '#2a2a2a';
    const cooldownColor = (this as any)._cooldownColor || '#000000';
    const chargeColor = (this as any)._chargeColor || '#39d98a';

    this.slotBg.clear()
      .roundRect(-half, -half, this.slotSize, this.slotSize, 6)
      .fill(parseInt(slotColor.replace('#', '0x')))
      .stroke({ width: 2, color: 0x111111, alpha: 0.9 });

    this.cooldownOverlay.clear();
    if (this.cooldownProgress < 1) {
      const remaining = 1 - this.cooldownProgress;
      const height = this.slotSize * remaining;
      this.cooldownOverlay
        .rect(-half, half - height, this.slotSize, height)
        .fill(parseInt(cooldownColor.replace('#', '0x')), 0.45);
    }

    this.chargeBarBg.clear()
      .rect(-this.barWidth / 2, barY, this.barWidth, this.barHeight)
      .fill(0x1a1a1a);

    this.chargeBarFill.clear()
      .rect(-this.barWidth / 2, barY, this.barWidth * this.cooldownProgress, this.barHeight)
      .fill(parseInt(chargeColor.replace('#', '0x')));

    this.applyElementOverrides();
    this.updateTexts();
  }

  private applyElementOverrides() {
    const ov = this.elementOverrides || {};
    const apply = (target: any, id: string) => {
      const cfg = ov[id];
      if (!cfg) return;
      if (typeof cfg.x === 'number') target.x = cfg.x;
      if (typeof cfg.y === 'number') target.y = cfg.y;
      if (typeof cfg.scale === 'number') target.scale.set(cfg.scale);
      if (typeof cfg.width === 'number') target.width = cfg.width;
      if (typeof cfg.height === 'number') target.height = cfg.height;
      if (typeof cfg.alpha === 'number') target.alpha = cfg.alpha;
      if (cfg.tint) target.tint = parseInt(cfg.tint.replace('#', '0x'));
      if (typeof cfg.fontSize === 'number' && target.style) target.style.fontSize = cfg.fontSize;
      if (cfg.font && target.style) target.style.fontFamily = cfg.font.includes('font-sheet2') ? 'FontSheet2' : 'FontSheet';
    };
    apply(this.slotBg, 'slotBg');
    apply(this.cooldownOverlay, 'cooldownOverlay');
    apply(this.chargeBarBg, 'chargeBarBg');
    apply(this.chargeBarFill, 'chargeBarFill');
    apply(this.keyText, 'keyText');
    apply(this.labelText, 'labelText');
  }

  private updateTexts() {
    if (this.keyText) this.keyText.text = this.replacePlaceholders(this.keyTemplate);
    if (this.labelText) this.labelText.text = this.replacePlaceholders(this.labelTemplate);
  }

  private replacePlaceholders(text: string) {
    return (text || '').replace(/\{player\.([a-zA-Z0-9_]+)\}/g, (_m, key) => {
      const val = (this.placeholderContext?.player || {})[key];
      return val === undefined || val === null ? '' : String(val);
    });
  }
}
