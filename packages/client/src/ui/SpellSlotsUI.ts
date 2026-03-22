/**
 * HUD de Slots de Magia (REDESIGN)
 * Exibe 2 slots fixos: ATIVO (Q) + PASSIVO
 * Visual: estilo do ícone enviado (quadrado com tecla, label, barra de raridade)
 */

import { Assets, Container, Graphics, Sprite, Text, TextStyle } from 'pixi.js';
import type { Room } from 'colyseus.js';
import type { PlayerState, SpellSlotSchema } from '@zyra/shared';

interface SpellSlotUIElement {
  container: Container;
  background: Graphics;
  keyText: Text;
  labelText: Text;
  rarityBar: Graphics;
  durationBalloon: Container;
  durationText: Text;
  cooldownOverlay?: Graphics;
  cooldownBar?: Graphics;
  cooldownTimer?: Text;
  currentSlot?: any;
}

export class SpellSlotsUI {
  private stage: Container;
  private room: Room;
  private mainContainer: Container;

  // Slots fixos sempre visíveis (3 ativos + 1 passivo)
  private activeSlotUIs: SpellSlotUIElement[] = [];
  private passiveSlotUI: SpellSlotUIElement | null = null;

  // Mapa de dados de slots
  private activeSlots = new Map<string, SpellSlotSchema>();
  private passiveSlots = new Map<string, SpellSlotSchema>();

  // Mapa de cards com duração
  private cardDurations = new Map<string, number>();

  private slotWidth = 70;
  private slotHeight = 85;
  private slotPadding = 15;

  // Cores de raridade
  private rarityColors: { [key: string]: number } = {
    C: 0x888888,
    B: 0x3ab83a,
    A: 0x9b59b6,
    S: 0xe67e22,
    X: 0xFFD700
  };

  constructor(stage: Container, room: Room) {
    this.stage = stage;
    this.room = room;
    this.mainContainer = new Container();
    this.mainContainer.zIndex = 100;
    this.stage.addChild(this.mainContainer);

    // Criar slots fixos na inicialização
    this.createFixedSlots();
  }

  /**
   * Registrar durações dos cards disponíveis
   */
  public setCardDurations(cards: any[]) {
    if (Array.isArray(cards)) {
      cards.forEach(card => {
        if (card.id && card.duration) {
          this.cardDurations.set(card.id, card.duration);
        }
      });
    }
  }

  /**
   * Criar 3 slots ativos + 1 passivo (sempre visíveis)
   */
  private createFixedSlots() {
    const containerWidth = this.stage.width || 1024;
    const totalWidth = this.slotWidth * 3 + this.slotPadding * 2;
    const baseX = (containerWidth - totalWidth - this.slotWidth - this.slotPadding) / 2;
    const baseY = this.stage.height - 150;

    // Criar 3 slots ativos (teclas 1, 2, 3 / Numpad1, 2, 3)
    for (let i = 0; i < 3; i++) {
      const slotUI = this.createEmptySlotElement(String(i + 1), true);
      slotUI.container.x = baseX + i * (this.slotWidth + this.slotPadding);
      slotUI.container.y = baseY;
      this.mainContainer.addChild(slotUI.container);
      this.activeSlotUIs.push(slotUI);
    }

    // Slot passivo à direita
    this.passiveSlotUI = this.createEmptySlotElement('', false);
    this.passiveSlotUI.container.x = baseX + totalWidth + this.slotPadding;
    this.passiveSlotUI.container.y = baseY;
    this.mainContainer.addChild(this.passiveSlotUI.container);
  }

  /**
   * Criar elemento visual de slot vazio (estilo do ícone enviado)
   */
  private createEmptySlotElement(keyLabel: string, isActive: boolean): SpellSlotUIElement {
    const container = new Container();
    container.sortableChildren = true;

    // Background principal (quadrado arredondado)
    const background = new Graphics();
    background.roundRect(0, 0, this.slotWidth, this.slotHeight - 8, 12);
    background.fill({ color: 0x1a1a1a, alpha: 0.95 });
    const borderColor = isActive ? 0xFFD700 : 0xC0C0C0;
    background.stroke({ color: borderColor, width: 2.5 });
    background.zIndex = 1;
    container.addChild(background);

    // Texto da tecla (grande, topo central)
    const keyText = new Text({
      text: keyLabel || '—',
      style: new TextStyle({
        fontFamily: 'Arial Black',
        fontSize: 32,
        fill: 0xFFFFFF,
        fontWeight: 'bold',
        align: 'center'
      })
    });
    keyText.anchor.set(0.5);
    keyText.x = this.slotWidth / 2;
    keyText.y = 16;
    keyText.zIndex = 2;
    keyText.alpha = keyLabel ? 1 : 0.4;
    container.addChild(keyText);

    // Label do card ou placeholder
    const labelText = new Text({
      text: 'Vazio',
      style: new TextStyle({
        fontFamily: 'Arial',
        fontSize: 12,
        fill: 0xCCCCCC,
        align: 'center',
        fontWeight: 'bold'
      })
    });
    labelText.anchor.set(0.5);
    labelText.x = this.slotWidth / 2;
    labelText.y = 62;
    labelText.zIndex = 2;
    labelText.alpha = 0.7;
    container.addChild(labelText);

    // Barra de raridade (rodapé, estilo do ícone)
    const rarityBar = new Graphics();
    rarityBar.rect(0, this.slotHeight - 8, this.slotWidth, 8);
    rarityBar.fill({ color: 0x888888, alpha: 0.9 });
    rarityBar.zIndex = 2;
    container.addChild(rarityBar);

    // Balão de duração (canto superior direito)
    const durationBalloon = new Container();
    durationBalloon.zIndex = 10;
    durationBalloon.x = this.slotWidth - 10;
    durationBalloon.y = -8;

    const balloonBg = new Graphics();
    balloonBg.circle(0, 0, 12);
    balloonBg.fill({ color: 0x1a1a1a, alpha: 0.95 });
    balloonBg.stroke({ color: 0xFFD700, width: 1.5 });
    durationBalloon.addChild(balloonBg);

    const durationText = new Text({
      text: '0s',
      style: new TextStyle({
        fontFamily: 'Arial',
        fontSize: 9,
        fill: 0xFFD700,
        fontWeight: 'bold',
        align: 'center'
      })
    });
    durationText.anchor.set(0.5);
    durationText.x = 0;
    durationText.y = -1;
    durationBalloon.addChild(durationText);

    container.addChild(durationBalloon);

    // Cooldown overlay (escuro, aparece quando em cooldown)
    const cooldownOverlay = new Graphics();
    cooldownOverlay.rect(0, 0, this.slotWidth, this.slotHeight - 8);
    cooldownOverlay.fill({ color: 0x000000, alpha: 0.7 });
    cooldownOverlay.zIndex = 5;
    cooldownOverlay.visible = false;
    container.addChild(cooldownOverlay);

    // Barra de cooldown (vermelha, encolhe com o tempo)
    const cooldownBar = new Graphics();
    cooldownBar.rect(0, this.slotHeight - 8, this.slotWidth, 8);
    cooldownBar.fill({ color: 0xFF0000, alpha: 0.9 });
    cooldownBar.zIndex = 6;
    cooldownBar.visible = false;
    container.addChild(cooldownBar);

    // Timer de cooldown (texto no centro)
    const cooldownTimer = new Text({
      text: '0.0s',
      style: new TextStyle({
        fontFamily: 'Arial Black',
        fontSize: 14,
        fill: 0xFFFFFF,
        fontWeight: 'bold',
        align: 'center',
        stroke: { color: 0x000000, width: 2 }
      })
    });
    cooldownTimer.anchor.set(0.5);
    cooldownTimer.x = this.slotWidth / 2;
    cooldownTimer.y = this.slotHeight / 2;
    cooldownTimer.zIndex = 7;
    cooldownTimer.visible = false;
    container.addChild(cooldownTimer);

    return {
      container,
      background,
      keyText,
      labelText,
      rarityBar,
      durationBalloon,
      durationText,
      cooldownOverlay,
      cooldownBar,
      cooldownTimer
    };
  }

  /**
   * Sincronizar quando um novo slot é adicionado
   */
  public addSlot(slot: SpellSlotSchema, slotKey: string) {
    const isPassive = slot.slotType === 'passive';
    const slotMap = isPassive ? this.passiveSlots : this.activeSlots;

    slotMap.set(slotKey, slot);
    this.updateSlotVisuals();
  }

  /**
   * Remover slot quando expirar
   */
  public removeSlot(slotKey: string) {
    const inActive = this.activeSlots.has(slotKey);
    const inPassive = this.passiveSlots.has(slotKey);

    if (inActive) this.activeSlots.delete(slotKey);
    if (inPassive) this.passiveSlots.delete(slotKey);

    this.updateSlotVisuals();
  }

  /**
   * Atualizar visuais dos 3 slots ativos + 1 passivo
   */
  private updateSlotVisuals() {
    if (this.activeSlotUIs.length === 0 || !this.passiveSlotUI) return;

    // Atualizar 3 slots ativos
    for (let i = 0; i < 3; i++) {
      const slotUI = this.activeSlotUIs[i];
      if (!slotUI) continue;
      const slot = this.activeSlots.get(String(i)) || null;
      if (slot) {
        this.updateSlotElement(slotUI, slot, String(i + 1), true);
      } else {
        this.resetSlotElement(slotUI, String(i + 1), true);
      }
    }

    // Atualizar slot passivo
    const passiveSlot = Array.from(this.passiveSlots.values())[0] || null;
    if (passiveSlot) {
      this.updateSlotElement(this.passiveSlotUI, passiveSlot, '', false);
    } else {
      this.resetSlotElement(this.passiveSlotUI, '', false);
    }
  }

  /**
   * Atualizar elemento de slot com dados de card
   */
  private updateSlotElement(uiElement: SpellSlotUIElement, slot: SpellSlotSchema, keyLabel: string, isActive: boolean) {
    // Atualizar tecla
    uiElement.keyText.text = keyLabel || '—';
    uiElement.keyText.alpha = 1;

    // Atualizar label (nome do card em estilo do ícone)
    uiElement.labelText.text = slot.cardName || 'Card';
    uiElement.labelText.style.fill = isActive ? 0xFFD700 : 0xCCCCCC;

    // Atualizar barra de raridade
    const rarityColor = 0x3ab83a; // Verde padrão até que rarity seja adicionado ao schema
    uiElement.rarityBar.clear();
    uiElement.rarityBar.rect(0, this.slotHeight - 8, this.slotWidth, 8);
    uiElement.rarityBar.fill({ color: rarityColor, alpha: 0.95 });

    // Atualizar balão de duração (obtém do mapa de cards)
    const cardDuration = this.cardDurations.get(slot.cardId) || 0;
    const durationSeconds = cardDuration ? (cardDuration / 1000) : 0;

    // Armazenar o slot para atualizar o tempo restante no update()
    uiElement.currentSlot = slot;
    uiElement.durationText.text = `${durationSeconds.toFixed(0)}s`;
    uiElement.durationBalloon.visible = true;

    // Atualizar borda
    const borderColor = isActive ? 0xFFD700 : 0xC0C0C0;
    (uiElement.background as any).clear();
    (uiElement.background as any).roundRect(0, 0, this.slotWidth, this.slotHeight - 8, 12);
    (uiElement.background as any).fill({ color: 0x1a1a1a, alpha: 0.95 });
    (uiElement.background as any).stroke({ color: borderColor, width: 2.5 });
  }

  /**
   * Resetar elemento de slot para vazio
   */
  private resetSlotElement(uiElement: SpellSlotUIElement, keyLabel: string, isActive: boolean) {
    uiElement.keyText.text = keyLabel || '—';
    uiElement.keyText.alpha = keyLabel ? 1 : 0.4;
    uiElement.labelText.text = 'Vazio';
    uiElement.labelText.style.fill = 0xCCCCCC;
    uiElement.labelText.alpha = 0.7;

    // Barra cinzenta padrão
    uiElement.rarityBar.clear();
    uiElement.rarityBar.rect(0, this.slotHeight - 8, this.slotWidth, 8);
    uiElement.rarityBar.fill({ color: 0x888888, alpha: 0.9 });

    // Esconder balão de duração
    uiElement.durationBalloon.visible = false;

    // Borda
    const borderColor = isActive ? 0xFFD700 : 0xC0C0C0;
    (uiElement.background as any).clear();
    (uiElement.background as any).roundRect(0, 0, this.slotWidth, this.slotHeight - 8, 12);
    (uiElement.background as any).fill({ color: 0x1a1a1a, alpha: 0.95 });
    (uiElement.background as any).stroke({ color: borderColor, width: 2.5 });
  }

  /**
   * Atualizar a cada frame
   */
  public update(playerState: PlayerState) {
    if (!playerState?.spellSlots) return;

    // Sincronizar mapa de slots com servidor
    playerState.spellSlots.forEach((slot, slotKey) => {
      const isPassive = slot.slotType === 'passive';
      const slotMap = isPassive ? this.passiveSlots : this.activeSlots;
      if (!slotMap.has(slotKey)) {
        this.addSlot(slot, slotKey);
      }
    });

    // Remover slots que não existem mais
    const serverSlotKeys = new Set<string>();
    playerState.spellSlots.forEach((_, key) => serverSlotKeys.add(key));

    this.activeSlots.forEach((_, key) => {
      if (!serverSlotKeys.has(key)) {
        this.removeSlot(key);
      }
    });

    this.passiveSlots.forEach((_, key) => {
      if (!serverSlotKeys.has(key)) {
        this.removeSlot(key);
      }
    });

    this.updateSlotVisuals();

    // Atualizar tempo restante nos balões
    this.updateDurationBalloons(playerState);
  }

  /**
   * Atualizar duração em tempo real nos balões
   */
  private updateDurationBalloons(playerState: PlayerState) {
    // Atualizar 3 slots ativos
    for (let i = 0; i < 3; i++) {
      const slotUI = this.activeSlotUIs[i];
      const slot = playerState.spellSlots?.get(String(i));
      if (slotUI?.currentSlot && slot) {
        const timeRemaining = Math.max(0, slot.timeRemaining || 0);
        const secondsRemaining = timeRemaining / 1000;
        slotUI.durationText.text = `${secondsRemaining.toFixed(1)}s`;

        // Cor do texto muda conforme tempo restante
        if (secondsRemaining < 2) {
          (slotUI.durationText.style as any).fill = 0xFF0000; // Vermelho
        } else if (secondsRemaining < 5) {
          (slotUI.durationText.style as any).fill = 0xFFA500; // Laranja
        } else {
          (slotUI.durationText.style as any).fill = 0xFFD700; // Dourado
        }

        // 🎬 Atualizar overlay de cooldown
        const maxDuration = this.cardDurations.get(slot.cardId) || 1000;
        const isOnCooldown = timeRemaining > 0;

        if (slotUI.cooldownOverlay) slotUI.cooldownOverlay.visible = isOnCooldown;
        if (slotUI.cooldownBar) {
          slotUI.cooldownBar.visible = isOnCooldown;
          const cooldownPercent = Math.max(0, timeRemaining / maxDuration);
          slotUI.cooldownBar.width = this.slotWidth * cooldownPercent;
        }
        if (slotUI.cooldownTimer) {
          slotUI.cooldownTimer.visible = isOnCooldown;
          slotUI.cooldownTimer.text = `${secondsRemaining.toFixed(1)}s`;
        }
      }
    }

    // Atualizar slot passivo
    if (this.passiveSlotUI?.currentSlot && playerState.spellSlots) {
      const passiveSlot = Array.from(playerState.spellSlots.values()).find(s => s.slotType === 'passive');
      if (passiveSlot) {
        const timeRemaining = Math.max(0, passiveSlot.timeRemaining || 0);
        const secondsRemaining = timeRemaining / 1000;
        this.passiveSlotUI.durationText.text = `${secondsRemaining.toFixed(1)}s`;

        // Cor do texto muda conforme tempo restante
        if (secondsRemaining < 2) {
          (this.passiveSlotUI.durationText.style as any).fill = 0xFF0000; // Vermelho
        } else if (secondsRemaining < 5) {
          (this.passiveSlotUI.durationText.style as any).fill = 0xFFA500; // Laranja
        } else {
          (this.passiveSlotUI.durationText.style as any).fill = 0xFFD700; // Dourado
        }

        // 🎬 Atualizar overlay de cooldown
        const maxDuration = this.cardDurations.get(passiveSlot.cardId) || 1000;
        const isOnCooldown = timeRemaining > 0;

        if (this.passiveSlotUI.cooldownOverlay) this.passiveSlotUI.cooldownOverlay.visible = isOnCooldown;
        if (this.passiveSlotUI.cooldownBar) {
          this.passiveSlotUI.cooldownBar.visible = isOnCooldown;
          const cooldownPercent = Math.max(0, timeRemaining / maxDuration);
          this.passiveSlotUI.cooldownBar.width = this.slotWidth * cooldownPercent;
        }
        if (this.passiveSlotUI.cooldownTimer) {
          this.passiveSlotUI.cooldownTimer.visible = isOnCooldown;
          this.passiveSlotUI.cooldownTimer.text = `${secondsRemaining.toFixed(1)}s`;
        }
      }
    }
  }

  public setConjuringMode(isConjuring: boolean) {
    // Modo de conjuração
  }

  public destroy() {
    if (this.stage.children.includes(this.mainContainer)) {
      this.stage.removeChild(this.mainContainer);
    }
  }
}
