import { Container, Graphics, Text } from 'pixi.js';
import { PlayerState, getRequiredXP } from '@zyra/shared';
import { BuffBarUI } from './BuffBarUI';

export class GameHUD extends Container {
  static readonly XP_BAR_WIDTH = 200;
  static readonly XP_BAR_HEIGHT = 10;
  static readonly BUFF_ICON_ROW_HEIGHT = 24;
  static readonly BUFF_XP_GAP = 8;
  static readonly XP_BLOCK_HEIGHT = 24;
  static readonly HEIGHT = GameHUD.BUFF_ICON_ROW_HEIGHT + GameHUD.BUFF_XP_GAP + GameHUD.XP_BLOCK_HEIGHT;

  private expBar: Graphics;
  private expText: Text;
  private buffBar: BuffBarUI;
  private buffTemplates = new Map<string, any>();
  private lastPlayer: PlayerState | null = null;
  private lastExperience = 0;
  private expContainer: Container | null = null;

  constructor() {
    super();
    this.createHUD();
  }

  private createHUD() {
    this.buffBar = new BuffBarUI();
    this.buffBar.position.set(0, 0);
    this.addChild(this.buffBar);

    // Experience Bar (below buff row)
    this.expContainer = new Container();
    this.expContainer.position.set(0, GameHUD.BUFF_ICON_ROW_HEIGHT + GameHUD.BUFF_XP_GAP);
    const expContainer = this.expContainer;

    const expBg = new Graphics()
      .rect(0, 0, GameHUD.XP_BAR_WIDTH, GameHUD.XP_BAR_HEIGHT)
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
    this.lastPlayer = player;

    // Experience Bar - Usando getRequiredXP do shared
    const requiredXP = getRequiredXP(player.level);
    const expValue = typeof player.experience === 'number' ? player.experience : 0;
    const expPercent = Math.max(0, Math.min(1, expValue / requiredXP));

    // 🎬 Detectar ganho de XP e criar efeito flutuante
    const xpGain = expValue - this.lastExperience;
    if (xpGain > 0) {
      this.createXPFloatingText(xpGain);
    }
    this.lastExperience = expValue;

    this.expBar.clear()
      .rect(0, 0, GameHUD.XP_BAR_WIDTH * expPercent, GameHUD.XP_BAR_HEIGHT)
      .fill(0xf1c40f); // Amarelo/Dourado para XP

    this.expText.text = `${Math.floor(expValue)} / ${requiredXP} XP`;

    this.buffBar.updateBuffs(player.buffs, this.buffTemplates);
  }

  /**
   * Criar texto flutuante "+XXX XP" com animação de fade-out
   */
  private createXPFloatingText(xpAmount: number) {
    if (!this.expContainer) return;

    const floatingText = new Text({
      text: `+${xpAmount} XP`,
      style: {
        fontSize: 16,
        fill: 0xFFFF00,
        fontFamily: 'Arial',
        fontWeight: 'bold',
        stroke: { color: 0x000000, width: 2 }
      }
    });
    floatingText.anchor.set(0.5);
    floatingText.x = GameHUD.XP_BAR_WIDTH / 2;
    floatingText.y = 10;
    floatingText.alpha = 1;
    this.expContainer.addChild(floatingText);

    // Animar: subir e fade-out em 1 segundo
    const startTime = Date.now();
    const duration = 1000;
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(1, elapsed / duration);

      floatingText.y = 10 - progress * 50; // Subir 50px
      floatingText.alpha = 1 - progress;

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        this.expContainer!.removeChild(floatingText);
        floatingText.destroy();
      }
    };
    requestAnimationFrame(animate);
  }

  tick(nowMs: number) {
    if (!this.lastPlayer) return;
    this.buffBar.tick(nowMs);
  }

  onResize() {
    // Implementar se precisar reposicionar a UI em telas menores
  }

  setBuffTemplates(templates: Map<string, any>) {
    this.buffTemplates = templates;
    this.buffBar.setTemplates(templates);
  }
}
