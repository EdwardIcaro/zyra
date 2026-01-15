import { Container, Graphics, Text } from 'pixi.js';
import type { Point } from 'pixi.js';

export class GestureTrailUI extends Container {
  private trail: Graphics;
  private feedbackText: Text;
  private readonly TRAIL_COLOR = 0x00ffff;
  private readonly TRAIL_WIDTH = 3;

  constructor() {
    super();
    this.zIndex = 5000;
    
    this.trail = new Graphics();
    this.addChild(this.trail);

    this.feedbackText = new Text({
      text: '',
      style: {
        fontSize: 24,
        fill: 0xffffff,
        fontWeight: 'bold',
        stroke: { color: 0x000000, width: 4 }
      }
    });
    this.feedbackText.anchor.set(0.5);
    this.feedbackText.visible = false;
    this.addChild(this.feedbackText);
  }

  updateTrail(points: Point[]): void {
    this.trail.clear();
    
    if (points.length < 2) return;

    const first = points[0];
    if (!first) return; // ✅ Guard clause

    this.trail.moveTo(first.x, first.y);
    
    for (let i = 1; i < points.length; i++) {
      const point = points[i];
      if (!point) continue; // ✅ Guard clause
      this.trail.lineTo(point.x, point.y);
    }

    this.trail.stroke({
      width: this.TRAIL_WIDTH,
      color: this.TRAIL_COLOR,
      alpha: 0.8
    });

    // Ponto inicial (verde)
    if (first) {
      this.trail.circle(first.x, first.y, 5).fill(0x00ff00);
    }
    
    // Ponto final (vermelho)
    const last = points[points.length - 1];
    if (last) { // ✅ Guard clause
      this.trail.circle(last.x, last.y, 5).fill(0xff0000);
    }
  }

  showResult(gesture: string, confidence: number, position: { x: number, y: number }): void {
    if (gesture === 'none') {
      this.feedbackText.text = '❌ Gesto não reconhecido';
      this.feedbackText.style.fill = 0xff4444;
    } else {
      const emoji = this.getGestureEmoji(gesture);
      const percent = Math.round(confidence * 100);
      this.feedbackText.text = `${emoji} ${gesture.toUpperCase()} (${percent}%)`;
      this.feedbackText.style.fill = 0x44ff44;
    }

    this.feedbackText.position.set(position.x, position.y - 50);
    this.feedbackText.visible = true;

    setTimeout(() => {
      this.feedbackText.visible = false;
    }, 1000);
  }

  clear(): void {
    this.trail.clear();
    this.feedbackText.visible = false;
  }

  private getGestureEmoji(gesture: string): string {
    const emojis: Record<string, string> = {
      'circle': '🔥',
      'zigzag': '⚡',
      'triangle': '🛡️',
      'line': '❄️',
      'slash': '⚔️'
    };
    return emojis[gesture] || '✨';
  }
}