import { Assets, Container, Graphics, Sprite, Text, Texture } from 'pixi.js';
import type { MonsterState } from '@zyra/shared';

export class MonsterEntity extends Container {
  private state: MonsterState;
  private bodyLayer: Container;
  private bodyCircle: Graphics | null = null;
  private bodySprite: Sprite | null = null;
  private shadow: Graphics | null = null;
  private glow: Graphics | null = null;
  private aura: Graphics | null = null;
  private nameText: Text;
  private hpBar: Graphics;
  private aggroIndicator: Graphics;
  private aggroRangeCircle: Graphics | null = null;
  private aggroDebugVisible = false;
  private lastSpriteFilename = '';
  private scaleValue = 1;
  private breathingTicker = 0;
  private lastHp: number;
  private lastAttackAt: number;
  private damageFlashMs = 0;
  private attackFlashMs = 0;
  private readonly baseRadius = 22;
  private readonly baseNameOffset = -30;
  private readonly baseHpOffset = -36;
  private readonly baseShadowOffset = 18;
  private readonly baseShadowAlpha = 0.35;
  private readonly shadowWidthFactor = 0.5;
  private readonly shadowHeightFactor = 0.14;

  constructor(state: MonsterState) {
    super();
    this.state = state;
    this.lastHp = state.currentHp;
    this.lastAttackAt = state.lastAttackAt || 0;

    this.bodyLayer = new Container();
    this.bodyLayer.sortableChildren = true;

    // Name
    this.nameText = new Text({
      text: `${state.name} (Lv${state.level})`,
      style: {
        fontFamily: 'Arial',
        fontSize: 14,
        fill: 0xffffff,
        stroke: { color: 0x000000, width: 3 }
      }
    });
    this.nameText.anchor.set(0.5, 1);

    // HP bar
    this.hpBar = new Graphics();

    // Aggro indicator
    this.aggroIndicator = new Graphics()
      .circle(0, -10, 4)
      .fill(0xff0000);
    this.aggroIndicator.visible = false;

    this.addChild(this.bodyLayer, this.hpBar, this.nameText, this.aggroIndicator);

    this.scaleValue = this.getScale();
    this.updateLayout();
    this.updateHPBar();

    this.ensureFallbackBody();
    this.updateShadow();
    void this.applyAppearance();

    // Listen for state changes
    this.state.onChange(() => {
      this.position.set(this.state.x, this.state.y);
      this.scaleValue = this.getScale();
      this.updateLayout();
      this.updateHPBar();
      this.updateAggro();
      this.updateShadow();
      this.updateAggroRangeVisual();

      if (this.state.currentHp < this.lastHp) {
        this.damageFlashMs = 150;
      }
      this.lastHp = this.state.currentHp;

      if (this.state.lastAttackAt > this.lastAttackAt) {
        this.attackFlashMs = 120;
        this.lastAttackAt = this.state.lastAttackAt;
      }

      if (this.state.spriteFilename !== this.lastSpriteFilename) {
        void this.applyAppearance();
      }

      this.nameText.text = `${this.state.name} (Lv${this.state.level})`;
    });

    this.position.set(state.x, state.y);
  }

  private getScale() {
    const raw = this.state.scale || 1;
    return Math.max(0.01, raw);
  }

  private updateLayout() {
    this.nameText.position.set(0, this.baseNameOffset * this.scaleValue);
    this.aggroIndicator.position.set(0, -10 * this.scaleValue);
  }

  private updateShadow() {
    if (!this.state.shadowEnabled) {
      if (this.shadow) this.shadow.visible = false;
      return;
    }

    if (!this.shadow) {
      const shadow = new Graphics();
      const alpha = typeof this.state.shadowAlpha === 'number' ? this.state.shadowAlpha : this.baseShadowAlpha;
      shadow.ellipse(0, 0, this.baseRadius, 6).fill({ color: 0x000000, alpha });
      shadow.zIndex = 0;
      this.shadow = shadow;
      this.bodyLayer.addChild(shadow);
    }

    this.shadow.visible = true;
    const alpha = typeof this.state.shadowAlpha === 'number' ? this.state.shadowAlpha : this.baseShadowAlpha;
    this.shadow.alpha = alpha;
    this.shadow.position.set(0, this.getShadowOffset());
    const baseSize = this.getShadowBaseSize();
    this.drawShadow(baseSize * this.shadowWidthFactor * this.scaleValue, baseSize * this.shadowHeightFactor * this.scaleValue, alpha);
  }

  private updateShadowDynamic(effect: string, floatOffset: number) {
    if (!this.shadow || !this.state.shadowEnabled) return;

    const alphaBase = typeof this.state.shadowAlpha === 'number' ? this.state.shadowAlpha : this.baseShadowAlpha;
    const shadowBounce = Math.sin(this.breathingTicker) * 0.015;
    const baseSize = this.getShadowBaseSize();
    let shadowScaleX = baseSize * this.shadowWidthFactor * this.scaleValue * (1 + shadowBounce);
    let shadowScaleY = baseSize * this.shadowHeightFactor * this.scaleValue * (1 + shadowBounce);

    if (effect === 'slime') {
      const squish = Math.sin(this.breathingTicker * 1.6) * 0.03;
      shadowScaleX *= (1 + squish);
      shadowScaleY *= (1 - squish);
    }

    if (effect === 'float') {
      const floatT = Math.min(1, Math.abs(floatOffset) / 2);
      const floatScaleFactor = 1 - floatT * 0.06;
      shadowScaleX *= floatScaleFactor;
      shadowScaleY *= floatScaleFactor;
      this.shadow.alpha = alphaBase * (0.85 + (1 - floatT) * 0.15);
    } else {
      this.shadow.alpha = alphaBase;
    }

    this.shadow.position.set(0, this.getShadowOffset());
    this.drawShadow(shadowScaleX, shadowScaleY, this.shadow.alpha);
  }

  private ensureFallbackBody() {
    if (this.bodyCircle) return;
    const color = 0xa33;
    this.bodyCircle = new Graphics()
      .circle(0, 0, this.baseRadius)
      .fill(color)
      .stroke({ width: 3, color: 0x000000 });
    this.bodyCircle.zIndex = 2;
    this.bodyLayer.addChild(this.bodyCircle);
  }

  private ensureGlow() {
    if (this.glow) return;
    const glow = new Graphics();
    glow.ellipse(0, 0, this.baseRadius * 1.3, this.baseRadius * 0.9)
      .fill({ color: 0x88ffcc, alpha: 0.2 });
    glow.zIndex = 1;
    this.glow = glow;
    this.bodyLayer.addChild(glow);
  }

  private ensureAura() {
    if (this.aura) return;
    const aura = new Graphics();
    aura.ellipse(0, 0, this.baseRadius * 1.6, this.baseRadius * 1.1)
      .fill({ color: 0x66ccff, alpha: 0.15 });
    aura.zIndex = 1;
    this.aura = aura;
    this.bodyLayer.addChild(aura);
  }

  private async applyAppearance() {
    const spriteFilename = this.state.spriteFilename || '';
    if (!spriteFilename) {
      this.lastSpriteFilename = '';
      if (this.bodySprite) {
        this.bodyLayer.removeChild(this.bodySprite);
        this.bodySprite.destroy();
        this.bodySprite = null;
      }
      this.ensureFallbackBody();
      return;
    }

    if (spriteFilename === this.lastSpriteFilename && this.bodySprite) return;
    this.lastSpriteFilename = spriteFilename;

    try {
      const texture = await Assets.load(`/assets/monsters/${spriteFilename}`);
      const sprite = new Sprite(texture);
      sprite.anchor.set(0.5);
      sprite.zIndex = 2;
      if (this.bodyCircle) {
        this.bodyLayer.removeChild(this.bodyCircle);
        this.bodyCircle.destroy();
        this.bodyCircle = null;
      }
      if (this.bodySprite) {
        this.bodyLayer.removeChild(this.bodySprite);
        this.bodySprite.destroy();
      }
      this.bodySprite = sprite;
      this.bodyLayer.addChild(sprite);
    } catch (e) {
      this.ensureFallbackBody();
    }
  }

  private updateHPBar() {
    this.hpBar.clear();

    if (this.state.currentHp === this.state.maxHp) {
      return;
    }

    const barWidth = 44;
    const barHeight = 4;
    const barY = this.baseHpOffset * this.scaleValue;
    const hpPercent = this.state.currentHp / this.state.maxHp;

    this.hpBar
      .rect(-barWidth / 2, barY, barWidth, barHeight)
      .fill(0x333333);

    const hpColor = hpPercent > 0.5 ? 0x00ff00 : hpPercent > 0.25 ? 0xffaa00 : 0xff0000;
    this.hpBar
      .rect(-barWidth / 2, barY, barWidth * hpPercent, barHeight)
      .fill(hpColor);
  }

  private updateAggroRangeVisual() {
    if (!this.aggroDebugVisible) {
      if (this.aggroRangeCircle) this.aggroRangeCircle.visible = false;
      return;
    }

    const radius = (this.state.aggroRange || 0) * Math.max(0.1, (this.state.sandboxScale || 1));
    if (radius <= 0) {
      if (this.aggroRangeCircle) this.aggroRangeCircle.visible = false;
      return;
    }

    if (!this.aggroRangeCircle) {
      const circle = new Graphics();
      circle.zIndex = -1;
      this.aggroRangeCircle = circle;
      this.bodyLayer.addChild(circle);
    }

    this.aggroRangeCircle.visible = true;
    this.aggroRangeCircle.clear();
    this.aggroRangeCircle.circle(0, 0, radius).stroke({ width: 2, color: 0xffcc33, alpha: 0.25 });
  }

  setAggroDebugVisible(visible: boolean) {
    this.aggroDebugVisible = visible;
    this.updateAggroRangeVisual();
  }

  private updateAggro() {
    this.aggroIndicator.visible = this.state.targetPlayerId !== '';
  }

  update(deltaTime: number) {
    const dtMs = deltaTime * (1000 / 60);
    this.breathingTicker += 0.1 * deltaTime;
    const bounce = Math.sin(this.breathingTicker) * 0.04;
    const baseScale = this.scaleValue * (1 + bounce);

    let scaleX = baseScale;
    let scaleY = baseScale;
    let effectAlpha = 1.0;
    const effect = this.state.visualEffect || 'none';

    if (effect === 'slime') {
      const squish = Math.sin(this.breathingTicker * 1.6) * 0.06;
      scaleX = baseScale * (1 + squish);
      scaleY = baseScale * (1 - squish);
    } else if (effect === 'pulse') {
      effectAlpha = 0.92 + Math.sin(this.breathingTicker * 1.5) * 0.08;
    }

    const floatOffset = effect === 'float' ? Math.sin(this.breathingTicker * 1.2) * 2 : 0;

    if (this.bodySprite) {
      this.bodySprite.scale.set(scaleX, scaleY);
      this.bodySprite.y = floatOffset;
    }
    if (this.bodyCircle) {
      this.bodyCircle.scale.set(scaleX, scaleY);
      this.bodyCircle.y = floatOffset;
    }

    this.updateShadowDynamic(effect, floatOffset);

    if (this.glow) {
      this.glow.visible = effect === 'glow';
    }
    if (this.aura) {
      this.aura.visible = effect === 'aura';
    }

    if (effect === 'glow') {
      this.ensureGlow();
      if (this.glow) {
        const glowAlpha = 0.15 + Math.sin(this.breathingTicker * 1.4) * 0.08;
        this.glow.alpha = glowAlpha;
        this.glow.scale.set(this.scaleValue * 1.25);
        this.glow.y = floatOffset;
      }
    } else if (this.glow) {
      this.glow.visible = false;
    }

    if (effect === 'aura') {
      this.ensureAura();
      if (this.aura) {
        const auraAlpha = 0.12 + Math.sin(this.breathingTicker * 1.1) * 0.06;
        this.aura.alpha = auraAlpha;
        this.aura.scale.set(this.scaleValue * 1.4);
        this.aura.y = floatOffset;
      }
    } else if (this.aura) {
      this.aura.visible = false;
    }

    if (this.damageFlashMs > 0) this.damageFlashMs -= dtMs;
    if (this.attackFlashMs > 0) this.attackFlashMs -= dtMs;
    const flashActive = this.damageFlashMs > 0 || this.attackFlashMs > 0;
    const alpha = flashActive ? 0.8 : effectAlpha;

    if (this.bodySprite) {
      this.bodySprite.alpha = alpha;
    }
    if (this.bodyCircle) {
      this.bodyCircle.alpha = alpha;
    }
  }

  getState(): MonsterState {
    return this.state;
  }

  getSelectionTexture(): Texture | null {
    return this.bodySprite?.texture ?? null;
  }

  getSelectionBaseRadius(): number {
    return this.baseRadius;
  }

  getSelectionBaseSize(): { width: number; height: number } {
    const texture = this.getSelectionTexture();
    if (texture && texture.width > 0 && texture.height > 0) {
      return { width: texture.width, height: texture.height };
    }

    const size = this.baseRadius * 2;
    return { width: size, height: size };
  }

  private getShadowBaseSize(): number {
    const size = this.getSelectionBaseSize();
    return Math.max(size.width, size.height, this.baseRadius * 2);
  }

  private getShadowOffset(): number {
    const size = this.getSelectionBaseSize();
    const halfHeight = Math.max(size.height, this.baseRadius * 2) * 0.5;
    const offset = typeof this.state.shadowOffset === 'number' ? this.state.shadowOffset : this.baseShadowOffset;
    return (halfHeight + offset) * this.scaleValue;
  }

  private drawShadow(radiusX: number, radiusY: number, alpha: number) {
    if (!this.shadow) return;
    this.shadow.clear();
    this.shadow.ellipse(0, 0, radiusX, radiusY).fill({ color: 0x000000, alpha });
  }
}
