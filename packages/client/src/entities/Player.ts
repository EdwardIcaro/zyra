import { Container, Graphics, Text, Sprite } from 'pixi.js';
import type { PlayerState } from '@zyra/shared';

export class Player extends Container {
  private state: PlayerState;
  
  private visualContainer: Container;
  private bodySprite: Sprite;
  private faceSprite: Sprite;
  private hatSprite: Sprite | null = null;
  
  private hpBar: Graphics;
  private nameLabel: Text;
  private levelLabel: Text;
  private highlight: Graphics | null = null;
  
  private targetX: number;
  private targetY: number;
  private lerpSpeed: number = 0.15;
  private animationTicker: number = 0;

  private facingDirection: number = 1;

  constructor(state: PlayerState, isLocalPlayer: boolean) {
    super();
    this.state = state;
    
    this.targetX = state.x;
    this.targetY = state.y;
    this.position.set(state.x, state.y);

    this.visualContainer = new Container();

    // ==================== CORPO ====================
    this.bodySprite = Sprite.from(state.visualBody || 'ball_red');
    this.bodySprite.anchor.set(0.5);
    this.bodySprite.width = 58;
    this.bodySprite.height = 58;

    // ==================== ROSTO (OLHOS) - DINÂMICO ====================
    this.faceSprite = Sprite.from(state.visualFace || 'eyes_determined');
    this.faceSprite.anchor.set(0.5);
    
    // ← LENDO DO SCHEMA (não mais hardcoded!)
    this.faceSprite.width = state.faceWidth || 35;
    this.faceSprite.height = state.faceHeight || 18;
    this.faceSprite.position.set(
      state.faceOffsetX || 0, 
      state.faceOffsetY || 5
    );
    this.faceSprite.scale.set(state.faceScale || 1.0);
    this.faceSprite.rotation = ((state.faceRotation || 0) * Math.PI) / 180;

    this.visualContainer.addChild(this.bodySprite, this.faceSprite);

    // ==================== CHAPÉU - DINÂMICO ====================
    if (state.visualHat && state.visualHat !== 'none') {
      this.hatSprite = Sprite.from(state.visualHat);
      this.hatSprite.anchor.set(0.5);
      
      // ← LENDO DO SCHEMA
      this.hatSprite.width = state.hatWidth || 60;
      this.hatSprite.height = state.hatHeight || 45;
      this.hatSprite.position.set(
        state.hatOffsetX || 0,
        state.hatOffsetY || -20
      );
      this.hatSprite.scale.set(state.hatScale || 1.0);
      this.hatSprite.rotation = ((state.hatRotation || 0) * Math.PI) / 180;
      
      this.visualContainer.addChild(this.hatSprite);
    }

    // ==================== UI ELEMENTS ====================
    this.hpBar = new Graphics();
    
    this.nameLabel = new Text({ 
      text: state.username, 
      style: { 
        fontFamily: 'Georgia', 
        fontSize: 14, 
        fill: 0xffffff, 
        stroke: { color: 0x000000, width: 2 } 
      } 
    });
    this.nameLabel.anchor.set(0.5);
    this.nameLabel.position.set(0, -55);

    this.levelLabel = new Text({ 
      text: `Lv.${state.level}`, 
      style: { 
        fontFamily: 'Arial', 
        fontSize: 12, 
        fill: 0xf1c40f, 
        fontWeight: 'bold', 
        stroke: { color: 0x000000, width: 2 } 
      } 
    });
    this.levelLabel.anchor.set(0.5);
    this.levelLabel.position.set(0, -72);

    // Highlight para player local
    if (isLocalPlayer) {
      this.highlight = new Graphics()
        .circle(0, 0, 26)
        .stroke({ width: 2, color: 0xffff00 });
      this.addChild(this.highlight);
    }

    this.addChild(this.visualContainer, this.hpBar, this.nameLabel, this.levelLabel);

    // ==================== LISTENERS DE MUDANÇA ====================
    this.state.onChange(() => {
      this.targetX = this.state.x;
      this.targetY = this.state.y;
      
      // Direção
      if (this.state.x < this.position.x) this.facingDirection = -1;
      else if (this.state.x > this.position.x) this.facingDirection = 1;

      this.updateVisuals();
      this.updateVisualConfig(); // ← NOVO
    });
  }

  /**
   * NOVO: Atualiza configurações visuais dinamicamente se mudarem
   */
  private updateVisualConfig() {
    // Face
    if (this.faceSprite) {
      this.faceSprite.width = this.state.faceWidth || 35;
      this.faceSprite.height = this.state.faceHeight || 18;
      this.faceSprite.position.set(
        this.state.faceOffsetX || 0,
        this.state.faceOffsetY || 5
      );
      this.faceSprite.scale.set(this.state.faceScale || 1.0);
      this.faceSprite.rotation = ((this.state.faceRotation || 0) * Math.PI) / 180;
    }

    // Hat
    if (this.hatSprite) {
      this.hatSprite.width = this.state.hatWidth || 60;
      this.hatSprite.height = this.state.hatHeight || 45;
      this.hatSprite.position.set(
        this.state.hatOffsetX || 0,
        this.state.hatOffsetY || -20
      );
      this.hatSprite.scale.set(this.state.hatScale || 1.0);
      this.hatSprite.rotation = ((this.state.hatRotation || 0) * Math.PI) / 180;
    }
  }

  private updateVisuals() {
    this.hpBar.clear();
    const hpPercent = Math.max(0, this.state.currentHp / this.state.maxHp);
    this.hpBar.rect(-25, -40, 50, 6).fill(0x333333);
    this.hpBar.rect(-25, -40, 50 * hpPercent, 6).fill(hpPercent > 0.3 ? 0x00ff00 : 0xff3333);
    this.levelLabel.text = `Lv.${this.state.level}`;
  }

  public update(deltaTime: number) {
    // Movimento suave
    this.x += (this.targetX - this.x) * this.lerpSpeed;
    this.y += (this.targetY - this.y) * this.lerpSpeed;

    // Animação de respiração
    this.animationTicker += 0.1 * deltaTime;
    const bounce = Math.sin(this.animationTicker) * 0.04;
    
    this.visualContainer.scale.y = 1 + bounce;
    this.visualContainer.scale.x = this.facingDirection * (1 - bounce);
    
    if (this.highlight) {
      this.highlight.scale.x = 1 - bounce;
      this.highlight.scale.y = 1 + bounce;
    }
  }
}