// 📄 [NEW] packages/client/src/entities/PlayerRenderer.ts

import { Container, Sprite } from 'pixi.js';
import * as PIXI from 'pixi.js';
import type { PlayerState } from '@zyra/shared';

interface VisualLayer {
  spritePath: string;
  offsetX: number;
  offsetY: number;
  scale: number;
  zOrder: number;
  colorTint?: string | null;
}

interface VisualConfig {
  id: number;
  type: string;
  layers: VisualLayer[];
  overrides: {
    hideEyes?: boolean;
    hideHat?: boolean;
  };
}

export class PlayerRenderer extends Container {
  private state: PlayerState;
  private layerSprites: Map<number, Sprite> = new Map();
  
  // Cache de configurações visuais
  private static visualConfigs: Record<string, VisualConfig> | null = null;

  constructor(state: PlayerState) {
    super();
    this.state = state;
    
    this.sortableChildren = true;
    
    // Carregar configs e renderizar
    this.loadAndRender();
    
    // Listener para mudanças no estado
    this.state.onChange(() => {
      this.rebuild();
    });
  }

  /**
   * Carregar configurações visuais do servidor
   */
  private async loadVisualConfigs() {
    if (PlayerRenderer.visualConfigs) return;

    try {
      const res = await fetch('http://localhost:2567/api/visual/configs');
      if (res.ok) {
        const data = await res.json();
        PlayerRenderer.visualConfigs = data.configs;
        const count = PlayerRenderer.visualConfigs ? Object.keys(PlayerRenderer.visualConfigs).length : 0;
        console.log('[PlayerRenderer] Visual configs loaded:', count);
      }
    } catch (e) {
      console.error('[PlayerRenderer] Failed to load visual configs:', e);
      PlayerRenderer.visualConfigs = {};
    }
  }

  /**
   * Carregar e renderizar camadas
   */
  private async loadAndRender() {
    await this.loadVisualConfigs();
    await this.rebuild();
  }

  /**
   * ✨ CORE: Construir camadas dinamicamente por player
   */
  private async rebuild() {
    // Limpar sprites antigos
    this.layerSprites.forEach(sprite => {
      this.removeChild(sprite);
      sprite.destroy();
    });
    this.layerSprites.clear();

    const layers = this.buildLayers(this.state);

    // Renderizar cada camada
    for (const layer of layers) {
      await this.renderLayer(layer);
    }

    this.sortChildren();
  }

  /**
   * 🎯 Algoritmo de Construção de Camadas
   */
  private buildLayers(player: PlayerState): VisualLayer[] {
    const layers: VisualLayer[] = [];

    // 1. Base: CORPO (sempre visível)
    layers.push({
      spritePath: 'bodies/ball_red.png',
      offsetX: 0,
      offsetY: 0,
      scale: 1.0,
      zOrder: 1,
      colorTint: player.bodyColor || '#FF6B6B'
    });

    // 2. OLHOS do player (se não sobrescrito por equipamentos)
    const hideEyes = this.hasOverride(player, 'hideEyes');
    if (player.eyeTypeId && !hideEyes) {
      const eyeConfig = this.getConfig('EYE', player.eyeTypeId);
      if (eyeConfig) {
        layers.push(...eyeConfig.layers.map(l => ({
          ...l,
          colorTint: l.colorTint || player.bodyColor // Aplicar cor do player se não tiver tint próprio
        })));
      }
    }

    // 3. EQUIPAMENTOS (chapéus, máscaras, armas)
    for (const visualId of player.equippedVisualIds) {
      const config = this.getConfigById(visualId);
      if (!config) continue;

      // Aplicar overrides ANTES de adicionar layers
      if (config.overrides.hideEyes) {
        // Remover olhos das camadas
        const eyeIndex = layers.findIndex(l => l.spritePath.startsWith('eyes/'));
        if (eyeIndex !== -1) layers.splice(eyeIndex, 1);
      }

      if (config.overrides.hideHat) {
        // Remover chapéus anteriores
        const hatIndex = layers.findIndex(l => l.spritePath.startsWith('hats/'));
        if (hatIndex !== -1) layers.splice(hatIndex, 1);
      }

      // Adicionar layers do equipamento
      layers.push(...config.layers);
    }

    // Ordenar por zOrder
    return layers.sort((a, b) => a.zOrder - b.zOrder);
  }

  /**
   * Verificar se algum equipamento tem determinado override
   */
  private hasOverride(player: PlayerState, overrideKey: string): boolean {
    for (const visualId of player.equippedVisualIds) {
      const config = this.getConfigById(visualId);
      if (config?.overrides[overrideKey as keyof typeof config.overrides]) {
        return true;
      }
    }
    return false;
  }

  /**
   * Buscar config por tipo e targetId
   */
  private getConfig(type: string, targetId: number): VisualConfig | null {
    if (!PlayerRenderer.visualConfigs) return null;
    const key = `${type}_${targetId}`;
    return PlayerRenderer.visualConfigs[key] || null;
  }

  /**
   * Buscar config por ID direto
   */
  private getConfigById(id: number): VisualConfig | null {
    if (!PlayerRenderer.visualConfigs) return null;
    
    for (const config of Object.values(PlayerRenderer.visualConfigs)) {
      if (config.id === id) return config;
    }
    
    return null;
  }

  /**
   * Renderizar uma camada individual
   */
  private async renderLayer(layer: VisualLayer) {
    const path = `/assets/sprites/${layer.spritePath}`;

    try {
      const texture = await PIXI.Assets.load(path);
      const sprite = new Sprite(texture);
      sprite.anchor.set(0.5);
      sprite.x = layer.offsetX;
      sprite.y = layer.offsetY;
      sprite.scale.set(layer.scale);
      sprite.zIndex = layer.zOrder;

      // Aplicar tint de cor
      if (layer.colorTint && layer.colorTint.startsWith('#')) {
        sprite.tint = parseInt(layer.colorTint.replace('#', '0x'));
      }

      this.addChild(sprite);
      this.layerSprites.set(layer.zOrder, sprite);
    } catch (e) {
      console.error(`[PlayerRenderer] Failed to load ${path}:`, e);
    }
  }
}