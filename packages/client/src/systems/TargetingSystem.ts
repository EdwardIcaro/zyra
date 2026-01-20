import { Container, Graphics, Sprite } from 'pixi.js';
import type { MonsterEntity } from '../entities/Monster';

type TargetPickResult = { monster: MonsterEntity; changed: boolean };
type TargetChangeHandler = (targetId: string | null, target: MonsterEntity | null) => void;

export class TargetingSystem {
  private selectedTargetId: string | null = null;
  private selectedTarget: MonsterEntity | null = null;
  private indicator: Container;
  private indicatorVisual: Sprite | Graphics | null = null;
  private indicatorSpriteKey = '';
  private alphaMaskCache = new Map<string, { width: number; height: number; data: Uint8ClampedArray }>();
  private pulseTime = 0;
  private attackFlashUntil = 0;
  private indicatorColor = 0;
  private indicatorScale = 0;
  onTargetChanged?: TargetChangeHandler;

  constructor() {
    this.indicator = new Container();
    this.indicator.visible = false;
  }

  getSelectedTargetId(): string | null {
    return this.selectedTargetId;
  }

  hasTarget(): boolean {
    return !!this.selectedTargetId && !!this.selectedTarget;
  }

  trySelectTarget(worldX: number, worldY: number, monsters: Map<string, MonsterEntity>): TargetPickResult | null {
    let closest: { id: string; monster: MonsterEntity; dist: number } | null = null;

    for (const [id, monster] of monsters.entries()) {
      const dx = monster.x - worldX;
      const dy = monster.y - worldY;
      const state = monster.getState();
      const sandboxScale = Math.max(0.01, state.sandboxScale || 1);
      const scale = Math.max(0.01, (state.scale || 1) * sandboxScale);
      const texture = monster.getSelectionTexture();

      if (texture) {
        const baseSize = monster.getSelectionBaseSize();
        const halfW = (baseSize.width * scale) / 2;
        const halfH = (baseSize.height * scale) / 2;

        if (Math.abs(dx) > halfW || Math.abs(dy) > halfH) continue;

        const localX = dx / scale + baseSize.width / 2;
        const localY = dy / scale + baseSize.height / 2;

        const mask = this.getAlphaMask(texture);
        if (mask) {
          const ix = Math.floor(localX);
          const iy = Math.floor(localY);
          if (ix < 0 || iy < 0 || ix >= mask.width || iy >= mask.height) continue;
          const alpha = mask.data[(iy * mask.width + ix) * 4 + 3] ?? 0;
          if (alpha < 10) continue;
        }

        const dist = Math.hypot(dx, dy);
        if (!closest || dist < closest.dist) {
          closest = { id, monster, dist };
        }
      } else {
        const radius = monster.getSelectionBaseRadius() * scale;
        const dist = Math.hypot(dx, dy);
        if (dist <= radius && (!closest || dist < closest.dist)) {
          closest = { id, monster, dist };
        }
      }
    }

    if (!closest) return null;

    const changed = this.selectedTargetId !== closest.id;
    if (changed) {
      this.setTarget(closest.id, closest.monster);
    }

    return { monster: closest.monster, changed };
  }

  clearTarget() {
    if (!this.selectedTargetId) return;

    this.selectedTargetId = null;
    this.selectedTarget = null;
    this.detachIndicator();
    this.pulseTime = 0;
    this.attackFlashUntil = 0;
    this.onTargetChanged?.(null, null);
  }

  private setTarget(id: string, monster: MonsterEntity) {
    this.selectedTargetId = id;
    this.selectedTarget = monster;
    this.refreshIndicator();
    this.attachIndicator(monster);
    this.onTargetChanged?.(id, monster);
  }

  private attachIndicator(monster: MonsterEntity) {
    if (this.indicator.parent) this.indicator.parent.removeChild(this.indicator);
    this.indicator.visible = true;
    this.indicator.position.set(0, 0);
    monster.addChildAt(this.indicator, 0);
  }

  private detachIndicator() {
    if (this.indicator.parent) this.indicator.parent.removeChild(this.indicator);
    this.indicator.visible = false;
  }

  update(deltaTime: number) {
    if (!this.indicator.visible) return;

    this.pulseTime += deltaTime * 0.12;
    const scale = 1 + Math.sin(this.pulseTime) * 0.08;
    this.indicator.scale.set(scale);
    this.indicator.alpha = 0.85 + Math.sin(this.pulseTime + 1.2) * 0.1;
    this.refreshIndicator();
  }

  flashUnderAttack(durationMs: number = 300) {
    this.attackFlashUntil = Date.now() + durationMs;
    this.refreshIndicator();
  }

  private refreshIndicator() {
    if (!this.selectedTarget) return;

    const state = this.selectedTarget.getState();
    const color = 0xffff00;
    const sandboxScale = Math.max(0.01, state.sandboxScale || 1);
    const scale = Math.max(0.01, (state.scale || 1) * sandboxScale);
    const spriteKey = state.spriteFilename || '';
    const needsRebuild = this.indicatorSpriteKey !== spriteKey || !this.indicatorVisual;

    if (!needsRebuild && color === this.indicatorColor && Math.abs(scale - this.indicatorScale) < 0.001) return;

    this.indicatorColor = color;
    this.indicatorScale = scale;

    if (needsRebuild) {
      this.buildIndicatorVisual(this.selectedTarget, spriteKey);
    }

    if (!this.indicatorVisual) return;

    if (this.indicatorVisual instanceof Sprite) {
      this.indicatorVisual.tint = color;
      this.indicatorVisual.scale.set(scale);
    } else {
      const radius = this.selectedTarget.getSelectionBaseRadius() * scale;
      this.indicatorVisual.clear();
      this.indicatorVisual
        .circle(0, 0, radius)
        .fill({ color, alpha: 0.25 })
        .stroke({ width: 2, color, alpha: 0.6 });
    }
  }

  private buildIndicatorVisual(monster: MonsterEntity, spriteKey: string) {
    this.indicator.removeChildren();
    this.indicatorVisual = null;
    this.indicatorSpriteKey = spriteKey;

    const texture = monster.getSelectionTexture();
    if (texture) {
      const sprite = new Sprite(texture);
      sprite.anchor.set(0.5);
      sprite.alpha = 0.45;
      sprite.zIndex = 0;
      this.indicatorVisual = sprite;
      this.indicator.addChild(sprite);
    } else {
      const circle = new Graphics();
      circle.zIndex = 0;
      this.indicatorVisual = circle;
      this.indicator.addChild(circle);
    }
  }

  private getAlphaMask(texture: Sprite['texture']) {
    const baseTexture = texture.baseTexture;
    const key = String(
      (baseTexture as any).cacheId ??
      (baseTexture as any).uid ??
      baseTexture.label ??
      baseTexture.resource?.url ??
      ''
    );

    if (!key) return null;
    const cached = this.alphaMaskCache.get(key);
    if (cached) return cached;

    const source = (baseTexture.resource as any)?.source;
    if (!source) return null;

    const width = texture.width || source.width || 0;
    const height = texture.height || source.height || 0;
    if (width <= 0 || height <= 0) return null;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    try {
      ctx.drawImage(source, 0, 0, width, height);
    } catch {
      return null;
    }

    const data = ctx.getImageData(0, 0, width, height).data;
    const mask = { width, height, data };
    this.alphaMaskCache.set(key, mask);
    return mask;
  }

  private getColorForType(type: string): number {
    switch (type) {
      case 'beast':
        return 0xffcc33;
      case 'undead':
        return 0x66ccff;
      case 'demon':
        return 0xff3366;
      case 'elemental':
        return 0x33ffcc;
      case 'humanoid':
        return 0x99ff66;
      default:
        return 0xffff00;
    }
  }
}
