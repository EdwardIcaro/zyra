import { Graphics } from 'pixi.js';
import type { MonsterEntity } from '../entities/Monster';

type TargetPickResult = { monster: MonsterEntity; changed: boolean };
type TargetChangeHandler = (targetId: string | null, target: MonsterEntity | null) => void;

export class TargetingSystem {
  private selectedTargetId: string | null = null;
  private selectedTarget: MonsterEntity | null = null;
  private indicator: Graphics;
  private pulseTime = 0;
  private attackFlashUntil = 0;
  private indicatorColor = 0;
  onTargetChanged?: TargetChangeHandler;

  constructor() {
    this.indicator = new Graphics();
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
      const dist = Math.hypot(dx, dy);
      const radius = 26;

      if (dist <= radius && (!closest || dist < closest.dist)) {
        closest = { id, monster, dist };
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
    monster.addChild(this.indicator);
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
    const isUnderAttack = Date.now() < this.attackFlashUntil;
    const color = isUnderAttack ? 0xff3333 : this.getColorForType(state.type);

    if (color === this.indicatorColor) return;

    this.indicatorColor = color;
    this.indicator.clear();
    this.indicator
      .circle(0, 0, 30)
      .stroke({ width: 4, color, alpha: 0.9 });
    this.indicator
      .circle(0, 0, 36)
      .stroke({ width: 2, color, alpha: 0.4 });
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
