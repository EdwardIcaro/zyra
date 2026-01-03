// packages/client/src/entities/Player.ts
// ATUALIZAÇÃO: Renderizar baseado em visualLayers.json global

import { Container, Graphics, Text, Sprite } from 'pixi.js';
import * as PIXI from 'pixi.js';
import type { PlayerState } from '@zyra/shared';

interface LayerConfig {
  zIndex: number;
  type: string;
  asset: string;
  offsetX: number;
  offsetY: number;
  scale: number;
  rotation: number;
  width: number;
  height: number;
}

export class Player extends Container {
  private state: PlayerState;
  
  private visualContainer: Container;
  private layerSprites: Map<string, Sprite> = new Map();
  
  private hpBar: Graphics;
  private nameLabel: Text;
  private levelLabel: Text;
  private highlight: Graphics | null = null;
  
  private targetX: number;
  private targetY: number;
  private lerpSpeed: number = 0.15;
  private animationTicker: number = 0;
  private facingDirection: number = 1;

  // Cache da configuração global
  private static globalLayersConfig: LayerConfig[] | null = null;

  constructor(state: PlayerState, isLocalPlayer: boolean) {
    super();
    this.state = state;
    
    this.targetX = state.x;
    this.targetY = state.y;
    this.position.set(state.x, state.y);

    this.visualContainer = new Container();
    this.visualContainer.sortableChildren = true;

    // UI Elements
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

    // Carregar e renderizar camadas
    this.loadAndRenderLayers();

    // Listeners de mudança
    this.state.onChange(() => {
      this.targetX = this.state.x;
      this.targetY = this.state.y;
      
      if (this.state.x < this.position.x) this.facingDirection = -1;
      else if (this.state.x > this.position.x) this.facingDirection = 1;

      this.updateVisuals();
    });
  }

  /**
   * Carregar configuração global de camadas e renderizar
   */
  private async loadAndRenderLayers() {
    // Carregar config global se ainda não foi carregada
    if (!Player.globalLayersConfig) {
      try {
        const res = await fetch('http://localhost:2567/api/admin/visual/global-layers');
        if (res.ok) {
          const data = await res.json();
          Player.globalLayersConfig = data.layers || [];
          const count = Player.globalLayersConfig?.length ?? 0;
          console.log('[Player] Global layers loaded:', count);
        }
      } catch (e) {
        console.error('[Player] Failed to load global layers:', e);
        Player.globalLayersConfig = [];
      }
    }

    // Se não há config, usar fallback
    if (!Player.globalLayersConfig || Player.globalLayersConfig.length === 0) {
      await this.renderFallbackLayers();
      return;
    }

    // TypeScript null-check (já validamos acima, mas TS não infere)
    const layers = Player.globalLayersConfig;
    if (!layers) return;

    // Renderizar cada camada
    for (const layer of layers) {
      await this.renderLayer(layer);
    }

    // Aplicar cores customizadas
    this.applyCustomColors();
  }

  /**
   * Renderizar uma camada individual
   */
  private async renderLayer(layer: LayerConfig) {
    const path = `/assets/sprites/${layer.type}/${layer.asset}.png`;

    try {
      const texture = await PIXI.Assets.load(path);
      const sprite = new Sprite(texture);
      sprite.anchor.set(0.5);
      sprite.x = layer.offsetX;
      sprite.y = layer.offsetY;
      sprite.scale.set(layer.scale);
      sprite.rotation = (layer.rotation * Math.PI) / 180;
      sprite.width = layer.width * layer.scale;
      sprite.height = layer.height * layer.scale;
      sprite.zIndex = layer.zIndex;

      this.visualContainer.addChild(sprite);
      this.layerSprites.set(layer.type, sprite);
    } catch (e) {
      console.error(`[Player] Failed to load layer ${layer.type}:`, e);
    }
  }

  /**
   * Fallback caso não haja configuração global
   */
  private async renderFallbackLayers() {
    try {
      // Corpo
      const bodyTexture = await PIXI.Assets.load(`/assets/sprites/bodies/${this.state.visualBody}.png`);
      const bodySprite = new Sprite(bodyTexture);
      bodySprite.anchor.set(0.5);
      bodySprite.width = 58;
      bodySprite.height = 58;
      bodySprite.zIndex = 0;
      this.visualContainer.addChild(bodySprite);
      this.layerSprites.set('bodies', bodySprite);

      // Olhos
      const eyeTexture = await PIXI.Assets.load(`/assets/sprites/eyes/${this.state.visualFace}.png`);
      const eyeSprite = new Sprite(eyeTexture);
      eyeSprite.anchor.set(0.5);
      eyeSprite.y = 5;
      eyeSprite.width = 35;
      eyeSprite.height = 18;
      eyeSprite.zIndex = 1;
      this.visualContainer.addChild(eyeSprite);
      this.layerSprites.set('eyes', eyeSprite);

      // Chapéu (se houver)
      if (this.state.visualHat && this.state.visualHat !== 'none') {
        const hatTexture = await PIXI.Assets.load(`/assets/sprites/hats/${this.state.visualHat}.png`);
        const hatSprite = new Sprite(hatTexture);
        hatSprite.anchor.set(0.5);
        hatSprite.y = -20;
        hatSprite.width = 60;
        hatSprite.height = 45;
        hatSprite.zIndex = 2;
        this.visualContainer.addChild(hatSprite);
        this.layerSprites.set('hats', hatSprite);
      }
    } catch (e) {
      console.error('[Player] Failed to render fallback layers:', e);
    }

    this.applyCustomColors();
  }

  /**
   * Aplicar cores customizadas aos sprites
   */
  private applyCustomColors() {
    // Aplicar bodyColor ao corpo
    const bodySprite = this.layerSprites.get('bodies');
    if (bodySprite && this.state.bodyColor && this.state.bodyColor.startsWith('#')) {
      bodySprite.tint = parseInt(this.state.bodyColor.replace('#', '0x'));
    }

    // Aplicar eyeColor aos olhos
    const eyeSprite = this.layerSprites.get('eyes');
    if (eyeSprite && this.state.eyeColor && this.state.eyeColor.startsWith('#')) {
      eyeSprite.tint = parseInt(this.state.eyeColor.replace('#', '0x'));
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