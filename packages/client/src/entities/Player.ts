// packages/client/src/entities/Player.ts
// ATUALIZAÇÃO: Renderizar baseado em visualLayers.json global

import { Container, Graphics, Text, Sprite } from 'pixi.js';
import * as PIXI from 'pixi.js';
import type { PlayerState } from '@zyra/shared';
import { ItemRegistry } from '@zyra/shared';

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
  private shadow: Graphics;
  private readonly shadowAlpha = 0.35;
  private readonly shadowWidthFactor = 0.5;
  private readonly shadowHeightFactor = 0.14;
  private shadowOffset = -5;
  private visualBaseY = 0;
  
  private hpBar: Graphics;
  private nameLabel: Text;
  private levelLabel: Text;
  private highlight: Graphics | null = null;
  
  private targetX: number;
  private targetY: number;
  private lerpSpeed: number = 0.15;
  private animationTicker: number = 0;
  private moveTicker: number = 0;
  private moveBlend: number = 0;
  private lastBodyBounce: number = 0;
  private facingDirection: number = 1;
  private lastServerX: number;
  private lastRenderX: number;
  private lastRenderY: number;
  private equipmentListenerBound = false;
  private mirrorModes = new Map<Sprite, { mode: string; scale: number }>();

  // Cache da configuração global
  private static globalLayersConfig: LayerConfig[] | null = null;

private updateEquipmentVisuals() {
    if (!this.state.equipment || !this.state.equipment.equipped) return;

    // Limpar sprites de equipamento antigos (exceto corpo base)
    this.layerSprites.forEach((sprite, key) => {
        if (key !== 'bodies') {  // Preservar corpo
            this.visualContainer.removeChild(sprite);
            this.mirrorModes.delete(sprite);
            sprite.destroy();
            this.layerSprites.delete(key);
        }
    });

    // Renderizar cada item equipado
    this.state.equipment.equipped.forEach((equippedItem) => {
        const itemTemplate = ItemRegistry.getTemplate(equippedItem.itemId);
        if (!itemTemplate || !itemTemplate.data?.visualLayers) {
            console.warn(`[Player] Item ${equippedItem.itemId} has no visual layers`);
            return;
        }

        // ✅ Renderizar camadas visuais do item
        itemTemplate.data.visualLayers.forEach((layer: any) => {
            this.renderEquipmentLayer(layer, equippedItem.slot);
        });
    });

    this.visualContainer.sortChildren();
}

private async renderEquipmentLayer(layer: any, slot: string) {
    const type = layer.type === 'faces' ? 'eyes' : layer.type;
    const path = `/assets/sprites/${type}/${layer.asset}.png`;

    try {
        const texture = await PIXI.Assets.load(path);
        const sprite = new Sprite(texture);
        sprite.anchor.set(0.5);
        sprite.x = layer.offsetX || 0;
        sprite.y = layer.offsetY || 0;
        const scale = layer.scale || 1.0;
        sprite.scale.set(scale);
        sprite.rotation = ((layer.rotation || 0) * Math.PI) / 180;
        sprite.zIndex = layer.zIndex || 2;
        if (typeof layer.width === 'number' && typeof layer.height === 'number') {
            sprite.width = layer.width * scale;
            sprite.height = layer.height * scale;
        }

        const mirrorMode = layer.mirrorMode || 'mirror';
        this.mirrorModes.set(sprite, { mode: mirrorMode, scale });
        this.applyMirrorModes();

        // Aplicar tints
        if (layer.colorTint && layer.colorTint.startsWith('#')) {
            sprite.tint = parseInt(layer.colorTint.replace('#', '0x'));
        }

        this.visualContainer.addChild(sprite);
        this.layerSprites.set(`${slot}_${layer.type}`, sprite);
    } catch (e) {
        console.error(`[Player] Failed to load equipment layer ${path}:`, e);
    }
}

  constructor(state: PlayerState, isLocalPlayer: boolean) {
    super();
    this.state = state;
    this.lastServerX = state.x;
    this.lastRenderX = state.x;
    this.lastRenderY = state.y;
    
    this.targetX = state.x;
    this.targetY = state.y;
    this.position.set(state.x, state.y);

    this.visualContainer = new Container();
    this.visualContainer.sortableChildren = true;
    this.visualBaseY = this.visualContainer.y;

    this.shadow = new Graphics();

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

    this.addChild(this.shadow, this.visualContainer, this.hpBar, this.nameLabel, this.levelLabel);

    // Carregar e renderizar camadas
    this.loadAndRenderLayers();

    // Listeners de mudança
    this.state.onChange(() => {
      if (this.state.x < this.lastServerX) this.facingDirection = -1;
      else if (this.state.x > this.lastServerX) this.facingDirection = 1;
      this.lastServerX = this.state.x;

      this.targetX = this.state.x;
      this.targetY = this.state.y;
      if (!this.equipmentListenerBound) {
        // Listener for equipment changes
        this.state.equipment.equipped.onChange(() => {
          this.updateEquipmentVisuals();
        });
        this.equipmentListenerBound = true;
      }

      
      this.updateEquipmentVisuals();
      this.updateVisuals();
    });

    this.updateShadow();
  }

  private updateShadow() {
    const body = this.layerSprites.get('bodies');
    const baseW = body?.width ?? 58;
    const baseH = body?.height ?? 58;
    const bodyBounce = this.lastBodyBounce;
    const shadowBounce = bodyBounce * (0.015 / 0.04);

    const rawScaleX = Math.abs(this.visualContainer.scale.x || 1);
    const rawScaleY = Math.abs(this.visualContainer.scale.y || 1);
    const baseScaleX = rawScaleX / Math.max(0.001, 1 - bodyBounce);
    const baseScaleY = rawScaleY / Math.max(0.001, 1 + bodyBounce);
    const effectiveW = baseW * baseScaleX;
    const effectiveH = baseH * baseScaleY;

    const rx = Math.max(4, effectiveW * this.shadowWidthFactor * (1 + shadowBounce));
    const ry = Math.max(2, effectiveH * this.shadowHeightFactor * (1 + shadowBounce));
    const y = effectiveH / 2 + this.shadowOffset;

    this.shadow.clear();
    this.shadow.ellipse(0, y, rx, ry).fill({ color: 0x000000, alpha: this.shadowAlpha });
  }

  

  /**
   * Carregar configuração global de camadas e renderizar
   */
  private async loadAndRenderLayers() {
    // Carregar config global se ainda não foi carregada
    if (!Player.globalLayersConfig) {
      try {
        const res = await fetch('http://localhost:2567/api/visual/global-layers');
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
    const type = layer.type === 'faces' ? 'eyes' : layer.type;
    const path = `/assets/sprites/${type}/${layer.asset}.png`;

    try {
      const texture = await PIXI.Assets.load(path);
      const sprite = new Sprite(texture);
      sprite.anchor.set(0.5);
      sprite.x = layer.offsetX;
      sprite.y = layer.offsetY;
      const scale = layer.scale || 1.0;
      sprite.scale.set(scale);
      sprite.rotation = (layer.rotation * Math.PI) / 180;
      sprite.width = layer.width * scale;
      sprite.height = layer.height * scale;
      sprite.zIndex = layer.zIndex;

      const mirrorMode = (layer as any).mirrorMode || 'mirror';
      this.mirrorModes.set(sprite, { mode: mirrorMode, scale });
      this.applyMirrorModes();

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
    const prevX = this.x;
    const prevY = this.y;

    // Movimento suave
    this.x += (this.targetX - this.x) * this.lerpSpeed;
    this.y += (this.targetY - this.y) * this.lerpSpeed;
    const renderDeltaX = this.x - this.lastRenderX;
    if (Math.abs(renderDeltaX) > 0.05) {
      this.facingDirection = renderDeltaX > 0 ? -1 : 1;
    }
    this.lastRenderX = this.x;

    const stepDist = Math.hypot(this.x - prevX, this.y - prevY);
    const isMoving = stepDist > 0.02;
    const targetMoveBlend = isMoving ? 1 : 0;
    this.moveBlend += (targetMoveBlend - this.moveBlend) * 0.12;

    // Animação de respiração
    this.animationTicker += 0.045 * deltaTime;
    this.moveTicker += 0.18 * deltaTime;

    const idleFactor = 1 - this.moveBlend;
    const idleBounce = Math.sin(this.animationTicker) * 0.04 * idleFactor;
    const moveBounce = Math.sin(this.moveTicker) * 0.05 * this.moveBlend;
    const bounce = idleBounce + moveBounce;
    this.lastBodyBounce = bounce;
    
    this.visualContainer.scale.y = 1 + bounce;
    this.visualContainer.scale.x = this.facingDirection * (1 - bounce);

    const moveBob = Math.sin(this.moveTicker * 1.6) * 2.0 * this.moveBlend;
    this.visualContainer.y = this.visualBaseY - moveBob;
    
    if (this.highlight) {
      this.highlight.scale.x = 1 - bounce;
      this.highlight.scale.y = 1 + bounce;
    }

    this.applyMirrorModes();
    this.updateShadow();
    this.lastRenderY = this.y;
  }

  public setShadowOffset(offset: number) {
    if (!Number.isFinite(offset)) return;
    this.shadowOffset = offset;
    this.updateShadow();
  }

  private applyMirrorModes() {
    const facingLeft = this.facingDirection === -1;
    this.mirrorModes.forEach((meta, sprite) => {
      const mag = Math.abs(sprite.scale.x) || meta.scale || 1;
      if (meta.mode === 'swap') {
        sprite.scale.x = facingLeft ? -mag : mag;
      } else {
        sprite.scale.x = mag;
      }
    });
  }
}
