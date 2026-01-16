// packages/client/src/systems/TargetingSystem.ts
// 🔧 MEGA UPDATE - ETAPA 4: Sistema de Seleção de Alvos

import type { MonsterEntity } from '../entities/Monster';

export interface TargetableEntity {
  id: string;
  x: number;
  y: number;
  currentHp: number;
  maxHp: number;
  isDead?: boolean;
}

export class TargetingSystem {
  private selectedTargetId: string | null = null;
  private availableTargets: Map<string, TargetableEntity> = new Map();
  private playerPosition: { x: number; y: number } = { x: 0, y: 0 };
  
  private readonly AUTO_TARGET_RADIUS = 800; // Distância máxima para auto-targeting
  private readonly SELECTION_CLICK_RADIUS = 50; // Raio de click para selecionar

  /**
   * Atualiza posição do jogador (para cálculos de distância)
   */
  updatePlayerPosition(x: number, y: number): void {
    this.playerPosition = { x, y };
  }

  /**
   * Atualiza lista de alvos disponíveis
   */
  updateTargets(monsters: Map<string, MonsterEntity>): void {
    this.availableTargets.clear();
    
    monsters.forEach((monster, id) => {
      const state = monster.getState();
      if (!state.isDead && state.currentHp > 0) {
        this.availableTargets.set(id, {
          id,
          x: state.x,
          y: state.y,
          currentHp: state.currentHp,
          maxHp: state.maxHp,
          isDead: state.isDead
        });
      }
    });

    // Limpar seleção se alvo morreu
    if (this.selectedTargetId && !this.availableTargets.has(this.selectedTargetId)) {
      this.selectedTargetId = null;
    }
  }

  /**
   * Tenta selecionar alvo por click (worldX, worldY)
   */
  selectTargetByClick(worldX: number, worldY: number): string | null {
    let closestTarget: TargetableEntity | null = null;
    let closestDistance = this.SELECTION_CLICK_RADIUS;

    for (const target of this.availableTargets.values()) {
      const distance = Math.hypot(target.x - worldX, target.y - worldY);
      
      if (distance < closestDistance) {
        closestDistance = distance;
        closestTarget = target;
      }
    }

    if (closestTarget) {
      this.selectedTargetId = closestTarget.id;
      console.log(`[Targeting] Selecionado: ${closestTarget.id}`);
      return closestTarget.id;
    }

    return null;
  }

  /**
   * Auto-targeting: Seleciona inimigo mais próximo do cursor
   */
  autoSelectNearestToCursor(cursorWorldX: number, cursorWorldY: number): string | null {
    let closestTarget: TargetableEntity | null = null;
    let closestDistance = this.AUTO_TARGET_RADIUS;

    for (const target of this.availableTargets.values()) {
      const distance = Math.hypot(target.x - cursorWorldX, target.y - cursorWorldY);
      
      if (distance < closestDistance) {
        closestDistance = distance;
        closestTarget = target;
      }
    }

    if (closestTarget) {
      this.selectedTargetId = closestTarget.id;
      return closestTarget.id;
    }

    return null;
  }

  /**
   * Ciclar alvos com TAB (prioriza menor HP ou mais próximo)
   */
  cycleTarget(prioritizeLowestHp: boolean = false): string | null {
    if (this.availableTargets.size === 0) return null;

    const targets = Array.from(this.availableTargets.values());

    // Ordenar alvos
    if (prioritizeLowestHp) {
      // Priorizar menor HP
      targets.sort((a, b) => {
        const hpPercentA = a.currentHp / a.maxHp;
        const hpPercentB = b.currentHp / b.maxHp;
        return hpPercentA - hpPercentB;
      });
    } else {
      // Priorizar mais próximo do player
      targets.sort((a, b) => {
        const distA = Math.hypot(a.x - this.playerPosition.x, a.y - this.playerPosition.y);
        const distB = Math.hypot(b.x - this.playerPosition.x, b.y - this.playerPosition.y);
        return distA - distB;
      });
    }

    // Se não há alvo selecionado, pegar o primeiro
    if (!this.selectedTargetId) {
      this.selectedTargetId = targets[0]?.id || null;
      return this.selectedTargetId;
    }

    // Encontrar índice do alvo atual e pegar o próximo
    const currentIndex = targets.findIndex(t => t.id === this.selectedTargetId);
    
    if (currentIndex === -1) {
      // Alvo atual não existe mais, pegar o primeiro
      this.selectedTargetId = targets[0]?.id || null;
    } else {
      // Pegar próximo (circular)
      const nextIndex = (currentIndex + 1) % targets.length;
      this.selectedTargetId = targets[nextIndex]?.id || null;
    }

    console.log(`[Targeting] Ciclo → ${this.selectedTargetId}`);
    return this.selectedTargetId;
  }

  /**
   * Limpar seleção
   */
  clearTarget(): void {
    this.selectedTargetId = null;
  }

  /**
   * Obter ID do alvo selecionado
   */
  getSelectedTargetId(): string | null {
    return this.selectedTargetId;
  }

  /**
   * Obter dados do alvo selecionado
   */
  getSelectedTarget(): TargetableEntity | null {
    if (!this.selectedTargetId) return null;
    return this.availableTargets.get(this.selectedTargetId) || null;
  }

  /**
   * Verificar se tem alvo válido
   */
  hasValidTarget(): boolean {
    if (!this.selectedTargetId) return false;
    const target = this.availableTargets.get(this.selectedTargetId);
    return !!target && !target.isDead && target.currentHp > 0;
  }

  /**
   * Obter distância até o alvo atual
   */
  getDistanceToTarget(): number {
    const target = this.getSelectedTarget();
    if (!target) return Infinity;
    
    return Math.hypot(
      target.x - this.playerPosition.x,
      target.y - this.playerPosition.y
    );
  }
}
