import { Container, Graphics, Text } from 'pixi.js';
import type { PlayerState } from '@zyra/shared';

export class HUD extends Container {
  private hpBar: Graphics;
  private manaBar: Graphics;
  private levelText: Text;
  private expBar: Graphics;

  constructor() {
    super();
    this.createHUD();
  }

  private createHUD() {
    // HP Bar
    this.hpBar = new Graphics();
    this.hpBar.position.set(20, 20);
    this.addChild(this.hpBar);

    // Mana Bar
    this.manaBar = new Graphics();
    this.manaBar.position.set(20, 50);
    this.addChild(this.manaBar);

    // Level
    this.levelText = new Text({
      text: 'Level 1',
      style: {
        fontFamily: 'Georgia',
        fontSize: 24,
        fill: 0xf4e4bc
      }
    });
    this.levelText.position.set(20, 80);
    this.addChild(this.levelText);

    // Experience Bar
    this.expBar = new Graphics();
    this.expBar.position.set(20, 110);
    this.addChild(this.expBar);
  }

  update(player: PlayerState) {
    this.updateBar(this.hpBar, player.currentHp, player.maxHp, 0x00ff00);
    this.updateBar(this.manaBar, player.currentMana, player.maxMana, 0x0088ff);
    this.levelText.text = `Level ${player.level}`;
    this.updateBar(this.expBar, player.experience, player.experienceToNext, 0xffaa00);
  }

  private updateBar(bar: Graphics, current: number, max: number, color: number) {
    bar.clear();
    
    const width = 200;
    const height = 20;
    const percent = current / max;

    // Background
    bar.rect(0, 0, width, height).fill(0x333333);

    // Fill
    bar.rect(0, 0, width * percent, height).fill(color);

    // Text
    const text = new Text({
      text: `${Math.floor(current)}/${max}`,
      style: {
        fontFamily: 'Arial',
        fontSize: 14,
        fill: 0xffffff
      }
    });
    text.anchor.set(0.5);
    text.position.set(width / 2, height / 2);
    bar.addChild(text);
  }
}