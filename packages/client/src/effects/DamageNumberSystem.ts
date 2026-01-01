import { Container } from 'pixi.js';
import { DamageNumber } from './DamageNumber';

export class DamageNumberSystem extends Container {
  private numbers: DamageNumber[] = [];

  show(damage: number, x: number, y: number, isCrit = false) {
    const num = new DamageNumber(damage, x, y, isCrit);
    this.numbers.push(num);
    this.addChild(num);
  }

  update() {
    for (let i = this.numbers.length - 1; i >= 0; i--) {
      const num = this.numbers[i];
      
      // Verificação de segurança para o TypeScript
      if (!num) continue;

      const alive = num.update();
      
      if (!alive) {
        this.removeChild(num);
        this.numbers.splice(i, 1);
        num.destroy({ children: true });
      }
    }
  }
}