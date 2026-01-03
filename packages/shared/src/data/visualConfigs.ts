// 📄 [NEW] packages/shared/src/data/visualConfigs.ts

export interface VisualLayer {
  spritePath: string;
  offsetX: number;
  offsetY: number;
  scale: number;
  zOrder: number;
  colorTint?: string | null;
}

export interface VisualConfig {
  id: number;
  type: string;
  targetId: number;
  layers: VisualLayer[];
  overrides: {
    hideEyes?: boolean;
    hideHat?: boolean;
  };
}

export interface VisualConfigsData {
  version: string;
  lastUpdated: string;
  configs: Record<string, VisualConfig>;
}

// ✅ Exportar diretamente como constante TypeScript
export const VISUAL_CONFIGS: VisualConfigsData = {
  version: "1.0.0",
  lastUpdated: "2025-01-03T00:00:00.000Z",
  configs: {
    EYE_1: {
      id: 1,
      type: "EYE",
      targetId: 1,
      layers: [
        {
          spritePath: "faces/eyes_determined.png",
          offsetX: 0,
          offsetY: 5,
          scale: 1.0,
          zOrder: 2,
          colorTint: null
        }
      ],
      overrides: {}
    },
    EYE_2: {
      id: 2,
      type: "EYE",
      targetId: 2,
      layers: [
        {
          spritePath: "faces/eyes_happy.png",
          offsetX: 0,
          offsetY: 5,
          scale: 1.0,
          zOrder: 2,
          colorTint: null
        }
      ],
      overrides: {}
    },
    HAT_1: {
      id: 3,
      type: "HAT",
      targetId: 1,
      layers: [
        {
          spritePath: "hats/hat_wizard.png",
          offsetX: 0,
          offsetY: -20,
          scale: 1.0,
          zOrder: 5,
          colorTint: null
        }
      ],
      overrides: {}
    },
    MASK_42: {
      id: 42,
      type: "MASK",
      targetId: 42,
      layers: [
        {
          spritePath: "hats/hat_ninja.png",
          offsetX: 0,
          offsetY: 0,
          scale: 1.0,
          zOrder: 3,
          colorTint: null
        }
      ],
      overrides: {
        hideEyes: true
      }
    }
  }
};