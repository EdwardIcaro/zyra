// packages/client/src/ui/TargetFrameUI.ts
// 🔧 MEGA UPDATE - ETAPA 4: Frame do Alvo Selecionado

import { Container, Graphics, Text } from 'pixi.js';
import type { TargetableEntity } from '../systems/TargetingSystem';

export class TargetFrameUI extends Container {
  private background: Graphics;
  private nameText: Text;
  private hpBar: Graphics;
  private hpText: Text;
  private selectionRing: Graphics;
  
  private targetEntity: TargetableEntity | null = null;
  private ringAnimation: number = 0;

  constructor() {
    super();
    this.zIndex = 4000; // Acima de gestos
    
    // Painel de fundo (canto superior esquerdo)
    this.background = new Graphics();
    this.background.roundRect(0, 0, 250, 80, 8)
      .fill(0x000000, 0.8)
      .stroke({ width: 2, color: 0xd4af37 });
    this.addChild(this.background);

    // Nome do alvo
    this.nameText = new Text({
      text: '',
      style: {
        fontSize: 18,
        fill: 0xffffff,
        fontWeight: 'bold',
        fontFamily: 'Georgia'
      }
    });
    this.nameText.position.set(10, 10);
    this.addChild(this.nameText);

    // Barra de HP (fundo)
    this.hpBar = new Graphics();
    this.addChild(this.hpBar);

    // Texto de HP
    this.hpText = new Text({
      text: '',
      style: {
        fontSize: 14,
        fill: 0xffffff,
        fontFamily: 'Arial'
      }
    });
    this.hpText.position.set(15, 52);
    this.addChild(this.hpText);

    // Anel de seleção (visual no mundo)
    this.selectionRing = new Graphics();
    this.selectionRing.zIndex = 150; // Entre monstros e projéteis
    
    this.visible = false;
    this.position.set(20, 80); // Posição fixa na tela
  }

  /**
   * Atualizar com novo alvo
   */
  updateTarget(target: TargetableEntity | null): void {
    this.targetEntity = target;
    
    if (!target) {
      this.visible = false;
      this.selectionRing.clear();
      return;
    }

    this.visible = true;
    
    // Atualizar nome
    this.nameText.text = `Target: ${target.id.substring(0, 8)}...`;
    
    // Atualizar HP
    this.updateHPBar(target.currentHp, target.maxHp);
  }

  /**
   * Atualizar barra de HP
   */
  private updateHPBar(current: number, max: number): void {
    const barWidth = 230;
    const barHeight = 16;
    const hpPercent = Math.max(0, Math.min(1, current / max));

    this.hpBar.clear();

    // Fundo
    this.hpBar.rect(10, 40, barWidth, barHeight)
      .fill(0x333333);

    // HP atual
    const hpColor = hpPercent > 0.5 ? 0x00ff00 : hpPercent > 0.25 ? 0xffaa00 : 0xff0000;
    this.hpBar.rect(10, 40, barWidth * hpPercent, barHeight)
      .fill(hpColor);

    // Borda
    this.hpBar.rect(10, 40, barWidth, barHeight)
      .stroke({ width: 1, color: 0xffffff, alpha: 0.5 });

    // Texto
    this.hpText.text = `${Math.floor(current)} / ${max} HP`;
  }

  /**
   * Desenhar anel de seleção ao redor do alvo (no mundo)
   */
  drawSelectionRing(worldContainer: Container, targetX: number, targetY: number): void {
    if (!this.targetEntity) {
      this.selectionRing.clear();
      return;
    }

    // Remover do container anterior (se existir)
    if (this.selectionRing.parent) {
      this.selectionRing.parent.removeChild(this.selectionRing);
    }

    // Adicionar ao mundo
    worldContainer.addChild(this.selectionRing);

    // Posição no mundo
    this.selectionRing.position.set(targetX, targetY);

    // Animação pulsante
    this.ringAnimation += 0.05;
    const pulseScale = 1 + Math.sin(this.ringAnimation) * 0.1;
    const pulseAlpha = 0.6 + Math.sin(this.ringAnimation * 2) * 0.2;

    // Desenhar anel
    this.selectionRing.clear();
    
    // Anel externo brilhante
    this.selectionRing.circle(0, 0, 35 * pulseScale)
      .stroke({ width: 3, color: 0xffff00, alpha: pulseAlpha });
    
    // Anel interno
    this.selectionRing.circle(0, 0, 30)
      .stroke({ width: 2, color: 0xffffff, alpha: 0.8 });
    
    // Marcadores direcionais (4 pontos)
    const markerSize = 8;
    const markerDist = 40 * pulseScale;
    
    for (let i = 0; i < 4; i++) {
      const angle = (Math.PI / 2) * i + this.ringAnimation * 0.5;
      const mx = Math.cos(angle) * markerDist;
      const my = Math.sin(angle) * markerDist;
      
      this.selectionRing.rect(mx - markerSize / 2, my - markerSize / 2, markerSize, markerSize)
        .fill(0xffff00, pulseAlpha);
    }
  }

  /**
   * Limpar anel de seleção
   */
  clearSelectionRing(): void {
    this.selectionRing.clear();
    if (this.selectionRing.parent) {
      this.selectionRing.parent.removeChild(this.selectionRing);
    }
  }

  /**
   * Chamado a cada frame
   */
  animate(): void {
    if (this.targetEntity && this.visible) {
      // Animação do anel acontece no drawSelectionRing
      // Aqui podemos adicionar outras animações do painel se necessário
    }
  }
}