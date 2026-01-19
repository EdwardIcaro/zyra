import { Container, Graphics, Text } from 'pixi.js';
import type { BuffState } from '@zyra/shared';

type BuffTemplate = {
  id: string;
  name: string;
  description?: string;
  duration_ms?: number;
  effects?: Record<string, number | string>;
  visual_color?: number;
};

export class BuffBarUI extends Container {
  private iconSize = 24;
  private gap = 6;
  private tooltip: Container;
  private tooltipText: Text;
  private tooltipBg: Graphics;
  private buffIcons = new Map<string, Container>();
  private activeBuffs: Map<string, BuffState> | null = null;

  constructor() {
    super();
    this.tooltip = new Container();
    this.tooltipBg = new Graphics();
    this.tooltipText = new Text({
      text: '',
      style: { fontSize: 12, fill: 0xffffff, fontFamily: 'Arial' }
    });
    this.tooltipText.position.set(6, 4);
    this.tooltip.addChild(this.tooltipBg, this.tooltipText);
    this.tooltip.visible = false;
    this.addChild(this.tooltip);
  }

  updateBuffs(buffs: Map<string, BuffState>, templates: Map<string, BuffTemplate>) {
    this.activeBuffs = buffs;
    const activeIds = new Set<string>();
    let index = 0;

    buffs.forEach((buff) => {
      activeIds.add(buff.buffId);
      let icon = this.buffIcons.get(buff.buffId);
      if (!icon) {
        icon = this.createIcon(buff.buffId);
        this.buffIcons.set(buff.buffId, icon);
        this.addChild(icon);
      }
      icon.position.set(index * (this.iconSize + this.gap), 0);
      this.updateIcon(icon, buff, templates.get(buff.buffId));
      index++;
    });

    for (const [id, icon] of this.buffIcons.entries()) {
      if (!activeIds.has(id)) {
        this.removeChild(icon);
        this.buffIcons.delete(id);
        icon.destroy({ children: true });
      }
    }
  }

  private createIcon(buffId: string): Container {
    const icon = new Container();
    icon.eventMode = 'static';
    icon.cursor = 'pointer';
    icon.name = buffId;

    const bg = new Graphics();
    bg.roundRect(0, 0, this.iconSize, this.iconSize, 4).fill(0x222222).stroke({ width: 1, color: 0x000000 });
    icon.addChild(bg);

    icon.on('pointerover', () => this.showTooltip(buffId, icon));
    icon.on('pointerout', () => this.hideTooltip());

    return icon;
  }

  private updateIcon(icon: Container, buff: BuffState, template?: BuffTemplate) {
    const bg = icon.children[0] as Graphics;
    const color = template?.visual_color ?? 0x7dff7d;
    bg.clear()
      .roundRect(0, 0, this.iconSize, this.iconSize, 4)
      .fill(0x1a1a1a)
      .stroke({ width: 2, color, alpha: 0.9 });

    const stackTextId = `${buff.buffId}_stack`;
    let stackText = icon.getChildByName(stackTextId) as Text | null;
    if (!stackText) {
      stackText = new Text({
        text: '',
        style: { fontSize: 10, fill: 0xffffff, fontFamily: 'Arial' }
      });
      stackText.name = stackTextId;
      stackText.position.set(this.iconSize - 10, this.iconSize - 12);
      icon.addChild(stackText);
    }
    stackText.text = buff.stacks > 1 ? String(buff.stacks) : '';

    const timerTextId = `${buff.buffId}_timer`;
    let timerText = icon.getChildByName(timerTextId) as Text | null;
    if (!timerText) {
      timerText = new Text({
        text: '',
        style: { fontSize: 10, fill: 0xffffff, fontFamily: 'Arial', stroke: { color: 0x000000, width: 2 } }
      });
      timerText.name = timerTextId;
      timerText.anchor.set(0, 0.5);
      timerText.position.set(2, this.iconSize - 7);
      timerText.visible = false;
      icon.addChild(timerText);
    }
  }

  tick(nowMs: number) {
    if (!this.activeBuffs) return;

    this.activeBuffs.forEach((buff) => {
      const icon = this.buffIcons.get(buff.buffId);
      if (!icon) return;

      const timerText = icon.getChildByName(`${buff.buffId}_timer`) as Text | null;
      const expiresAt = buff.expiresAt || 0;

      if (expiresAt > 0) {
        const remainingMs = expiresAt - nowMs;
        if (remainingMs > 0 && remainingMs <= 60000) {
          const seconds = Math.max(1, Math.ceil(remainingMs / 1000));
          if (timerText) {
            timerText.text = `${seconds}s`;
            timerText.visible = true;
          }
          const phase = Math.floor(nowMs / 300) % 2;
          icon.alpha = phase === 0 ? 1 : 0.35;
          return;
        }
      }

      if (timerText) timerText.visible = false;
      icon.alpha = 1;
    });
  }

  private showTooltip(buffId: string, icon: Container) {
    const template = (icon.parent as BuffBarUI).getTemplate(buffId);
    if (!template) return;

    const lines: string[] = [];
    lines.push(template.name || buffId);

    if (template.duration_ms && template.duration_ms > 0) {
      const mins = Math.ceil(template.duration_ms / 60000);
      lines.push(`Duração: ${mins} min`);
    } else {
      lines.push('Duração: permanente');
    }

    if (template.effects) {
      const effects = template.effects;
      const labels: Record<string, string> = {
        hpBonus: 'HP',
        damageBonus: 'Dano',
        defenseBonus: 'Defesa',
        speedBonus: 'Mov. Veloc.',
        expBonus: 'XP',
        goldBonus: 'Gold',
        attackSpeedBonus: 'Atk Speed',
        critChanceBonus: 'Crit Chance'
      };
      Object.entries(effects).forEach(([key, value]) => {
        if (key === 'effectType' || key === 'damagePerTick' || key === 'tickInterval') return;
        if (typeof value !== 'number') return;
        const label = labels[key] || key;
        lines.push(`${label}: ${value}%`);
      });
      if (effects.effectType === 'dot' && effects.damagePerTick && effects.tickInterval) {
        const secs = Math.max(1, Math.round(Number(effects.tickInterval) / 1000));
        lines.push(`DoT: ${effects.damagePerTick} a cada ${secs}s`);
      }
    }

    this.tooltipText.text = lines.join('\n');
    const width = this.tooltipText.width + 12;
    const height = this.tooltipText.height + 8;
    this.tooltipBg.clear()
      .roundRect(0, 0, width, height, 6)
      .fill(0x111111)
      .stroke({ width: 1, color: 0x000000, alpha: 0.8 });
    this.tooltip.position.set(icon.x, icon.y - height - 6);
    this.tooltip.visible = true;
  }

  private hideTooltip() {
    this.tooltip.visible = false;
  }

  private getTemplate(buffId: string): BuffTemplate | undefined {
    return (this as any).templates?.get(buffId);
  }

  setTemplates(templates: Map<string, BuffTemplate>) {
    (this as any).templates = templates;
  }
}
