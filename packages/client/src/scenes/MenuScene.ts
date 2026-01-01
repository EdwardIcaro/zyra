import { Container, Graphics, Text } from 'pixi.js';
import { CLASSES } from '@zyra/shared';
import type { Game } from '../game/Game';

export class MenuScene extends Container {
  private game: Game;
  private selectedClass: string = 'warrior';
  private usernameInput: string = 'Player';

  constructor(game: Game) {
    super();
    this.game = game;
    this.createMenu();
  }

  private createMenu() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    // Background
    const bg = new Graphics()
      .rect(0, 0, width, height)
      .fill(0x1a1a1a);
    this.addChild(bg);

    // Title
    const title = new Text({
      text: 'ZYRA\nInkbound Chronicles',
      style: {
        fontFamily: 'Georgia',
        fontSize: 72,
        fill: 0xf4e4bc,
        align: 'center'
      }
    });
    title.anchor.set(0.5);
    title.position.set(width / 2, height / 4);
    this.addChild(title);

    // Class selection
    const classY = height / 2;
    let classX = width / 2 - 300;

    Object.entries(CLASSES).forEach(([key, config]) => {
      const button = this.createClassButton(config.name, config.color, classX, classY, key);
      this.addChild(button);
      classX += 150;
    });

    // Start button
    const startButton = this.createButton('START GAME', width / 2, height * 0.75, () => {
      // CORREÇÃO: Passando os 4 argumentos necessários para o Game.ts
      // Como esta é a MenuScene (geralmente usada para testes/debug), 
      // passamos isNew = true e um ID genérico 1.
      this.game.joinCombat(this.usernameInput, this.selectedClass, true, 1);
    });
    this.addChild(startButton);
  }

  private createClassButton(name: string, color: string, x: number, y: number, classKey: string): Container {
    const container = new Container();
    container.position.set(x, y);
    container.eventMode = 'static';
    container.cursor = 'pointer';

    const bg = new Graphics()
      .rect(-50, -30, 100, 60)
      .fill(parseInt(color.replace('#', '0x')));
    
    const text = new Text({
      text: name[0],
      style: {
        fontFamily: 'Georgia',
        fontSize: 32,
        fill: 0xffffff
      }
    });
    text.anchor.set(0.5);

    container.addChild(bg, text);

    container.on('pointerdown', () => {
      this.selectedClass = classKey;
      console.info(`Selected class: ${name}`);
    });

    return container;
  }

  private createButton(text: string, x: number, y: number, onClick: () => void): Container {
    const container = new Container();
    container.position.set(x, y);
    container.eventMode = 'static';
    container.cursor = 'pointer';

    const bg = new Graphics()
      .roundRect(-150, -40, 300, 80, 10)
      .fill(0x8b1a1a);
    
    const label = new Text({
      text,
      style: {
        fontFamily: 'Georgia',
        fontSize: 32,
        fill: 0xf4e4bc
      }
    });
    label.anchor.set(0.5);

    container.addChild(bg, label);
    container.on('pointerdown', onClick);

    return container;
  }
}