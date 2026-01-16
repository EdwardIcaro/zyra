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

  private redraw() {
    const half = this.slotSize / 2;
    const barY = half + 8;

    this.slotBg.clear()
      .roundRect(-half, -half, this.slotSize, this.slotSize, 6)
      .fill(0x2a2a2a)
      .stroke({ width: 2, color: 0x111111, alpha: 0.9 });

    this.cooldownOverlay.clear();
    if (this.cooldownProgress < 1) {
      const remaining = 1 - this.cooldownProgress;
      const height = this.slotSize * remaining;
      this.cooldownOverlay
        .rect(-half, half - height, this.slotSize, height)
        .fill(0x000000, 0.45);
    }

    this.chargeBarBg.clear()
      .rect(-this.barWidth / 2, barY, this.barWidth, this.barHeight)
      .fill(0x1a1a1a);

    this.chargeBarFill.clear()
      .rect(-this.barWidth / 2, barY, this.barWidth * this.cooldownProgress, this.barHeight)
      .fill(0x39d98a);
  }
}
