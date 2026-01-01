import { Container, Text } from 'pixi.js';

export class DamageNumber extends Container {
  private text: Text;
  private life = 60; // frames
  private velocity = { x: 0, y: -2 };

  constructor(damage: number, x: number, y: number, isCrit = false) {
    super();
    this.position.set(x, y);

    this.text = new Text({
      text: damage.toString(),
      style: {
        fontSize: isCrit ? 32 : 24,
        fill: isCrit ? 0xff0000 : 0xffffff,
        fontFamily: 'Arial',
        fontWeight: 'bold',
        stroke: { color: 0x000000, width: 4 }
      }
    });
    this.text.anchor.set(0.5);
    this.addChild(this.text);

    // Random offset horizontal
    this.velocity.x = (Math.random() - 0.5) * 2;
  }

  update(): boolean {
    this.x += this.velocity.x;
    this.y += this.velocity.y;
    this.life--;
    this.alpha = this.life / 60;

    return this.life > 0;
  }
}