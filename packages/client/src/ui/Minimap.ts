import { Container, Graphics } from 'pixi.js';

export class Minimap extends Container {
  private background: Graphics;
  private playerDot: Graphics;
  private enemyDots: Map<string, Graphics> = new Map();
  
  private readonly SIZE = 150;
  private readonly SCALE = 0.1; // 10% do mundo real

  constructor() {
    super();
    this.createMinimap();
    
    // Position no canto superior direito
    this.position.set(window.innerWidth - this.SIZE - 20, 20);
  }

  private createMinimap() {
    // Background
    this.background = new Graphics()
      .rect(0, 0, this.SIZE, this.SIZE)
      .fill(0x000000, 0.7)
      .stroke({ width: 2, color: 0xd4af37 });
    this.addChild(this.background);

    // Player dot
    this.playerDot = new Graphics()
      .circle(0, 0, 3)
      .fill(0x00ff00);
    this.addChild(this.playerDot);
  }

  update(playerX: number, playerY: number, enemies: Map<string, { x: number; y: number }>) {
    // Update player position (center of minimap)
    this.playerDot.position.set(this.SIZE / 2, this.SIZE / 2);

    // Update enemies relative to player
    const currentEnemies = new Set<string>();

    enemies.forEach((enemy, id) => {
      currentEnemies.add(id);
      
      let dot = this.enemyDots.get(id);
      if (!dot) {
        dot = new Graphics().circle(0, 0, 2).fill(0xff0000);
        this.enemyDots.set(id, dot);
        this.addChild(dot);
      }

      // Position relative to player
      const relX = (enemy.x - playerX) * this.SCALE;
      const relY = (enemy.y - playerY) * this.SCALE;
      
      dot.position.set(
        this.SIZE / 2 + relX,
        this.SIZE / 2 + relY
      );

      // Hide if outside minimap bounds
      dot.visible = Math.abs(relX) < this.SIZE / 2 && Math.abs(relY) < this.SIZE / 2;
    });

    // Remove dots de inimigos que não existem mais
    this.enemyDots.forEach((dot, id) => {
      if (!currentEnemies.has(id)) {
        this.removeChild(dot);
        this.enemyDots.delete(id);
      }
    });
  }

  onResize() {
    this.position.set(window.innerWidth - this.SIZE - 20, 20);
  }
}
