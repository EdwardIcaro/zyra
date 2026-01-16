import { Container, Graphics, Text } from 'pixi.js';
import type { MonsterEntity } from '../entities/Monster';
import type { MonsterState } from '@zyra/shared';

export class TargetFrameUI extends Container {
  private targetState: MonsterState | null = null;
  private resourceText: Text;
  private titleText: Text;
  private hpBg: Graphics;
  private hpFill: Graphics;
  private hpText: Text;
  private barWidth = 140;
  private barHeight = 10;
  private barY = -10;

  constructor() {
    super();

    this.resourceText = new Text({
      text: 'Top Reso: Green Roses',
      style: {
        fontFamily: 'Arial',
        fontSize: 10,
        fill: 0x7dff7d,
        stroke: { color: 0x000000, width: 2 }
      }
    });
    this.resourceText.anchor.set(0.5, 1);
    this.resourceText.position.set(0, -36);

    this.titleText = new Text({
      text: '',
      style: {
        fontFamily: 'Georgia',
        fontSize: 13,
        fill: 0xffffff,
        stroke: { color: 0x000000, width: 2 }
      }
    });
    this.titleText.anchor.set(0.5, 1);
    this.titleText.position.set(0, -22);

    this.hpBg = new Graphics();

    this.hpFill = new Graphics();

    this.hpText = new Text({
      text: '100%',
      style: {
        fontFamily: 'Arial',
        fontSize: 11,
        fill: 0xffffff
      }
    });
    this.hpText.anchor.set(0.5);
    this.hpText.position.set(0, this.barY + this.barHeight / 2 - 1);

    this.addChild(this.resourceText, this.titleText, this.hpBg, this.hpFill, this.hpText);
    this.visible = false;
  }

  attachTo(monster: MonsterEntity) {
    this.targetState = monster.getState();
    if (this.parent) this.parent.removeChild(this);
    monster.addChild(this);
    this.position.set(0, -72);
    this.visible = true;
    this.update();
  }

  clear() {
    if (this.parent) this.parent.removeChild(this);
    this.targetState = null;
    this.visible = false;
  }

  update() {
    if (!this.targetState) return;

    const currentHp = Math.max(0, this.targetState.currentHp);
    const maxHp = Math.max(1, this.targetState.maxHp);
    const hpPercent = Math.max(0, Math.min(1, currentHp / maxHp));
    const hpColor = hpPercent > 0.5 ? 0x00ff00 : 0xff3333;

    this.titleText.text = `${this.targetState.name} Lv${this.targetState.level}`;
    this.resourceText.text = 'Top Reso: Green Roses';
    this.hpBg.clear()
      .rect(-this.barWidth / 2, this.barY, this.barWidth, this.barHeight)
      .fill(0x3b0b0b)
      .stroke({ width: 1, color: 0x000000, alpha: 0.7 });
    this.hpFill.clear()
      .rect(-this.barWidth / 2, this.barY, this.barWidth * hpPercent, this.barHeight)
      .fill(hpColor);
    this.hpText.text = `${this.formatNumber(currentHp)}/${this.formatNumber(maxHp)}`;
  }

  private formatNumber(value: number): string {
    return Math.round(value).toLocaleString('en-US');
  }
}
