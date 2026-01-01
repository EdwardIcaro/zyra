import { Container, Graphics } from 'pixi.js';
import type { ProjectileState } from '@zyra/shared';

export class ProjectileEntity extends Container {
  private state: ProjectileState;
  private circle: Graphics;

  constructor(state: ProjectileState) {
    super();
    this.state = state;

    const color = parseInt(state.color.replace('#', '0x'));

    this.circle = new Graphics()
      .circle(0, 0, 10)
      .fill(color);
    
    this.addChild(this.circle);

    this.state.onChange(() => {
      this.position.set(this.state.x, this.state.y);
    });

    this.position.set(state.x, state.y);
  }

  update(_deltaTime: number) {
    // Smooth interpolation could be added here
  }
}