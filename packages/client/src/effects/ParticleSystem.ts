import { Container, Graphics } from 'pixi.js';

interface Particle {
  sprite: Graphics;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
}

export class ParticleSystem extends Container {
  private particles: Particle[] = [];

  // Renomeado para evitar conflito com o 'emit' interno do PixiJS
  spawn(x: number, y: number, color: number, count = 10) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count;
      const speed = 2 + Math.random() * 2;
      
      const particle = new Graphics()
        .circle(0, 0, 3)
        .fill(color);
      
      particle.position.set(x, y);
      this.addChild(particle);

      this.particles.push({
        sprite: particle,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 30,
        maxLife: 30
      });
    }
  }

  update() {
    this.particles = this.particles.filter(p => {
      p.sprite.x += p.vx;
      p.sprite.y += p.vy;
      p.life--;
      p.sprite.alpha = p.life / p.maxLife;

      if (p.life <= 0) {
        this.removeChild(p.sprite);
        p.sprite.destroy(); // Adicionado para liberar memória da GPU
        return false;
      }
      return true;
    });
  }
}