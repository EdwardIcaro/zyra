import { Container, Graphics, Text } from 'pixi.js';
import type { MonsterState } from '@zyra/shared';

export class MonsterEntity extends Container {
  private state: MonsterState;
  private circle: Graphics;
  private nameText: Text;
  private hpBar: Graphics;
  private aggroIndicator: Graphics;

  constructor(state: MonsterState) {
    super();
    this.state = state;

    // Cor baseada no template (será customizado)
    const color = 0xa33; // Vermelho padrão

    // Circle
    this.circle = new Graphics()
      .circle(0, 0, 22)
      .fill(color)
      .stroke({ width: 3, color: 0x000000 });
    
    // Name
    this.nameText = new Text({
      text: `${state.name} (Lv${state.level})`,
      style: {
        fontFamily: 'Arial',
        fontSize: 14,
        fill: 0xffffff,
        stroke: { color: 0x000000, width: 3 }
      }
    });
    this.nameText.anchor.set(0.5, 1);
    this.nameText.position.set(0, -30);

    // HP bar
    this.hpBar = new Graphics();
    this.updateHPBar();

    // Aggro indicator (mostrar quando agredir)
    this.aggroIndicator = new Graphics()
      .circle(0, -10, 4)
      .fill(0xff0000);
    this.aggroIndicator.visible = false;

    this.addChild(this.circle, this.nameText, this.hpBar, this.aggroIndicator);

    // Listen for state changes
    this.state.onChange(() => {
      this.position.set(this.state.x, this.state.y);
      this.updateHPBar();
      this.updateAggro();
    });

    this.position.set(state.x, state.y);
  }

  private updateHPBar() {
    this.hpBar.clear();
    
    if (this.state.currentHp === this.state.maxHp) {
      return; // Não mostrar HP bar se estiver cheio
    }

    const barWidth = 44;
    const barHeight = 4;
    const hpPercent = this.state.currentHp / this.state.maxHp;

    // Background
    this.hpBar
      .rect(-barWidth / 2, -36, barWidth, barHeight)
      .fill(0x333333);

    // HP
    const hpColor = hpPercent > 0.5 ? 0x00ff00 : hpPercent > 0.25 ? 0xffaa00 : 0xff0000;
    this.hpBar
      .rect(-barWidth / 2, -36, barWidth * hpPercent, barHeight)
      .fill(hpColor);
  }

  private updateAggro() {
    // Mostrar indicador vermelho se estiver com target
    this.aggroIndicator.visible = this.state.targetPlayerId !== '';
  }

  update(_deltaTime: number) {
    // Interpolação pode ser adicionada aqui
  }

  getState(): MonsterState {
    return this.state;
  }
}