import { Container, Graphics, Text } from 'pixi.js';
import type { DroppedItemState } from '@zyra/shared';

export class DroppedItemEntity extends Container {
  private state: DroppedItemState;
  private background: Graphics;
  private icon: Text;
  private nameText: Text;
  
  // Controle de Estado
  private isBeingDestroyed: boolean = false;

  // Animações
  private floatOffset = 0;
  private floatSpeed = 0.05; 
  private pulseOffset = 0;
  private pulseSpeed = 0.03;
  private baseScale = 1;

  constructor(state: DroppedItemState) {
    super();
    this.state = state;

    // Background glow com pulsação
    this.background = new Graphics()
      .circle(0, 0, 20)
      .fill({ color: 0xffaa00, alpha: 0.3 });

    // Icon Map atualizado
    const iconMap: Record<string, string> = {
      'gold': '💰',
      'mat_ink': '🖋️',
      'mat_blood': '🩸',
      'mat_wolf_pelt': '🐺',
      'potion_hp_small': '🧪',
      'weapon_ink_blade': '⚔️',
      'weapon_wolf_fang': '🗡️'
    };

    this.icon = new Text({
      text: iconMap[state.itemId] || '📦',
      style: { fontSize: 24 }
    });
    this.icon.anchor.set(0.5);

    // Name Text
    this.nameText = new Text({
      text: this.getItemDisplayName(state.itemId, state.quantity),
      style: {
        fontFamily: 'Arial',
        fontSize: 12,
        fill: 0xffffff,
        stroke: { color: 0x000000, width: 2 }
      }
    });
    this.nameText.anchor.set(0.5);
    this.nameText.position.set(0, 30);
    this.nameText.visible = false;

    this.addChild(this.background, this.icon, this.nameText);

    // Interatividade
    this.eventMode = 'static';
    this.cursor = 'pointer';

    this.on('pointerover', () => {
      this.nameText.visible = true;
      this.baseScale = 1.3;
    });

    this.on('pointerout', () => {
      this.nameText.visible = false;
      this.baseScale = 1;
    });

    // Sync inicial e mudanças de estado
    this.state.onChange(() => {
      if (!this.isBeingDestroyed) {
        this.position.set(this.state.x, this.state.y);
      }
    });

    this.position.set(state.x, state.y);

    // Iniciamos a animação de spawn
    this.playSpawnAnimation();
  }

  private getItemDisplayName(itemId: string, quantity: number): string {
    const names: Record<string, string> = {
      'gold': 'Gold',
      'mat_ink': 'Ink',
      'mat_blood': 'Blood',
      'mat_wolf_pelt': 'Wolf Pelt',
      'potion_hp_small': 'HP Potion',
      'weapon_ink_blade': 'Ink Blade',
      'weapon_wolf_fang': 'Wolf Fang'
    };
    const name = names[itemId] || itemId;
    return quantity > 1 ? `${name} x${quantity}` : name;
  }

  private playSpawnAnimation() {
    // CORREÇÃO: Usamos uma animação interna controlada pelo tempo para evitar erros de null
    const startY = this.y;
    const jumpHeight = 30;
    const duration = 400; // ms
    const startTime = Date.now();

    const tick = () => {
      if (this.isBeingDestroyed || this.destroyed) return;

      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      const jumpProgress = 1 - Math.pow(1 - progress, 2);
      this.y = startY - (jumpHeight * jumpProgress * (1 - progress));

      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        this.y = startY;
      }
    };

    tick();
  }

  /**
   * Chamado a cada frame pela CombatScene.ts
   */
  update(_deltaTime: number) {
    // Verificação de segurança para evitar o erro "Cannot set properties of null"
    if (this.isBeingDestroyed || this.destroyed || !this.icon || !this.background) return;

    // Floating suave
    this.floatOffset += this.floatSpeed;
    this.icon.y = Math.sin(this.floatOffset) * 3;
    
    // Pulse escala
    this.pulseOffset += this.pulseSpeed;
    const pulseScale = 1 + Math.sin(this.pulseOffset) * 0.1;
    
    // Aplicação da escala
    this.scale.set(this.baseScale * pulseScale);

    // Background alfa
    this.background.alpha = 0.2 + Math.sin(this.pulseOffset) * 0.1;

    // Rotação suave
    this.icon.rotation += 0.005;
  }

  /**
   * Sobrescrita do destroy para garantir que animações parem
   */
  destroy(options?: any) {
    this.isBeingDestroyed = true;
    super.destroy(options);
  }

  getState(): DroppedItemState {
    return this.state;
  }
}