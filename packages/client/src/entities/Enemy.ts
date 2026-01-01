import { Container, Graphics } from 'pixi.js';
import type { EnemyState } from '@zyra/shared';

export class EnemyEntity extends Container {
  private state: EnemyState;
  private circle: Graphics;
  private hpBar: Graphics;

  constructor(state: EnemyState) {
    super();
    this.state = state;

    this.circle = new Graphics()
      .circle(0, 0, 22)
      .fill(0xa33)
      .stroke({ width: 3, color: 0x000000 });
    
    this.hpBar = new Graphics();
    this.updateHPBar();

    this.addChild(this.circle, this.hpBar);

    this.state.onChange(() => {
      this.position.set(this.state.x, this.state.y);
      this.updateHPBar();
    });

    this.position.set(state.x, state.y);
  }

  private updateHPBar() {
    this.hpBar.clear();
    
    const barWidth = 40;
    const barHeight = 5;
    const hpPercent = this.state.currentHp / this.state.maxHp;

    this.hpBar
      .rect(-barWidth / 2, -30, barWidth, barHeight)
      .fill(0x333333);

    this.hpBar
      .rect(-barWidth / 2, -30, barWidth * hpPercent, barHeight)
      .fill(0xff0000);
  }

  update(_deltaTime: number) {
    // Smooth interpolation could be added here
  }
}