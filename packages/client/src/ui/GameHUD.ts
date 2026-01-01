import { Container, Graphics, Text } from 'pixi.js';
import { PlayerState, getRequiredXP } from '@zyra/shared';

export class GameHUD extends Container {
  private hpBar: Graphics;
  private hpText: Text;
  private manaBar: Graphics;
  private manaText: Text;
  private levelText: Text;
  private expBar: Graphics;
  private expText: Text;

  constructor() {
    super();
    this.createHUD();
  }

  private createHUD() {
    const padding = 20;
    const barWidth = 200;
    const barHeight = 20;

    // HP Container
    const hpContainer = new Container();
    hpContainer.position.set(padding, padding);
    
    const hpLabel = new Text({
      text: 'HP',
      style: { fontSize: 16, fill: 0xffffff, fontFamily: 'Georgia' }
    });
    hpContainer.addChild(hpLabel);

    const hpBg = new Graphics()
      .rect(0, 25, barWidth, barHeight)
      .fill(0x333333);
    hpContainer.addChild(hpBg);

    this.hpBar = new Graphics();
    hpContainer.addChild(this.hpBar);

    this.hpText = new Text({
      text: '100/100',
      style: { fontSize: 14, fill: 0xffffff, fontFamily: 'Arial' }
    });
    this.hpText.position.set(5, 28);
    hpContainer.addChild(this.hpText);

    this.addChild(hpContainer);

    // Mana Container
    const manaContainer = new Container();
    manaContainer.position.set(padding, padding + 55);
    
    const manaLabel = new Text({
      text: 'MANA',
      style: { fontSize: 16, fill: 0xffffff, fontFamily: 'Georgia' }
    });
    manaContainer.addChild(manaLabel);

    const manaBg = new Graphics()
      .rect(0, 25, barWidth, barHeight)
      .fill(0x333333);
    manaContainer.addChild(manaBg);

    this.manaBar = new Graphics();
    manaContainer.addChild(this.manaBar);

    this.manaText = new Text({
      text: '50/50',
      style: { fontSize: 14, fill: 0xffffff, fontFamily: 'Arial' }
    });
    this.manaText.position.set(5, 28);
    manaContainer.addChild(this.manaText);

    this.addChild(manaContainer);

    // Level
    this.levelText = new Text({
      text: 'Level 1',
      style: { fontSize: 20, fill: 0xf4e4bc, fontFamily: 'Georgia', fontWeight: 'bold' }
    });
    this.levelText.position.set(padding, padding + 110);
    this.addChild(this.levelText);

    // Experience Bar
    const expContainer = new Container();
    expContainer.position.set(padding, padding + 140);

    const expBg = new Graphics()
      .rect(0, 0, barWidth, 10)
      .fill(0x333333);
    expContainer.addChild(expBg);

    this.expBar = new Graphics();
    expContainer.addChild(this.expBar);

    this.expText = new Text({
      text: '0/100 XP',
      style: { fontSize: 12, fill: 0xffffff, fontFamily: 'Arial' }
    });
    this.expText.position.set(0, 12);
    expContainer.addChild(this.expText);

    this.addChild(expContainer);
  }

  /**
   * Atualiza a interface com os dados do jogador vindos do servidor
   */
  update(player: PlayerState, _wave?: number) {
    const barWidth = 200;
    const barHeight = 20;

    // HP Bar - Cor verde vibrante
    const hpPercent = Math.max(0, Math.min(1, player.currentHp / player.maxHp));
    this.hpBar.clear()
      .rect(0, 25, barWidth * hpPercent, barHeight)
      .fill(0x2ecc71);
    this.hpText.text = `${Math.floor(player.currentHp)}/${player.maxHp}`;

    // Mana Bar - Azul vibrante
    const manaPercent = Math.max(0, Math.min(1, player.currentMana / player.maxMana));
    this.manaBar.clear()
      .rect(0, 25, barWidth * manaPercent, barHeight)
      .fill(0x3498db);
    this.manaText.text = `${Math.floor(player.currentMana)}/${player.maxMana}`;

    // Level
    this.levelText.text = `Level ${player.level}`;

    // Experience Bar - Usando getRequiredXP do shared
    const requiredXP = getRequiredXP(player.level);
    const expPercent = Math.max(0, Math.min(1, player.experience / requiredXP));
    
    this.expBar.clear()
      .rect(0, 0, barWidth * expPercent, 10)
      .fill(0xf1c40f); // Amarelo/Dourado para XP
    
    this.expText.text = `${Math.floor(player.experience)} / ${requiredXP} XP`;
  }

  onResize() {
    // Implementar se precisar reposicionar a UI em telas menores
  }
}