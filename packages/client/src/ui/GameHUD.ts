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

  constructor() {
    super();
    this.createHUD();
  }

  private createHUD() {
    this.buffBar = new BuffBarUI();
    this.buffBar.position.set(0, 0);
    this.addChild(this.buffBar);

    // Experience Bar (below buff row)
    const expContainer = new Container();
    expContainer.position.set(0, GameHUD.BUFF_ICON_ROW_HEIGHT + GameHUD.BUFF_XP_GAP);

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
    const expPercent = Math.max(0, Math.min(1, player.experience / requiredXP));
    
    this.expBar.clear()
      .rect(0, 0, GameHUD.XP_BAR_WIDTH * expPercent, GameHUD.XP_BAR_HEIGHT)
      .fill(0xf1c40f); // Amarelo/Dourado para XP
    
    this.expText.text = `${Math.floor(player.experience)} / ${requiredXP} XP`;

    this.buffBar.updateBuffs(player.buffs, this.buffTemplates);
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
