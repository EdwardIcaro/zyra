// packages/client/src/screens/CharacterCustomizationScreen.ts

import { Container, Graphics, Text } from 'pixi.js';
import * as PIXI from 'pixi.js';

interface CustomizationData {
  bodyColor: string;
  eyeColor: string;
}

export class CharacterCustomizationScreen extends Container {
  private previewContainer: Container;
  private bodySprite!: PIXI.Sprite;
  private eyeSprite!: PIXI.Sprite;
  
  private bodyColorPicker!: HTMLInputElement;
  private eyeColorPicker!: HTMLInputElement;
  
  private customizationData: CustomizationData = {
    bodyColor: '#FF6B6B',
    eyeColor: '#FFFFFF'
  };

  private onConfirm?: (data: CustomizationData) => void;

  constructor(
    private charName: string,
    private classType: string,
    confirmCallback: (data: CustomizationData) => void
  ) {
    super();
    this.onConfirm = confirmCallback;
    this.setupUI();
  }

  private async setupUI() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    // Background
    const bg = new Graphics()
      .rect(0, 0, width, height)
      .fill(0x1a1a1a);
    this.addChild(bg);

    // Title
    const title = new Text({
      text: 'CUSTOMIZAÇÃO DE APARÊNCIA',
      style: {
        fontFamily: 'Georgia',
        fontSize: 48,
        fill: 0xf4e4bc
      }
    });
    title.anchor.set(0.5);
    title.position.set(width / 2, 80);
    this.addChild(title);

    // Subtitle
    const subtitle = new Text({
      text: `Personagem: ${this.charName} | Classe: ${this.classType}`,
      style: {
        fontFamily: 'Arial',
        fontSize: 20,
        fill: 0xaaaaaa
      }
    });
    subtitle.anchor.set(0.5);
    subtitle.position.set(width / 2, 140);
    this.addChild(subtitle);

    // Preview Container
    this.previewContainer = new Container();
    this.previewContainer.position.set(width / 2, height / 2);
    this.addChild(this.previewContainer);

    // Carregar e renderizar preview
    await this.loadPreview();

    // Criar Color Pickers (HTML)
    this.createColorPickers();

    // Botão Confirmar
    const confirmBtn = this.createButton('✅ CONFIRMAR', width / 2, height - 100, () => {
      if (this.onConfirm) {
        this.onConfirm(this.customizationData);
      }
    });
    this.addChild(confirmBtn);

    // Instruções
    const instructions = new Text({
      text: '💡 Dica: A aparência base é fixa. Equipamentos (chapéus, armas) modificarão seu visual no jogo!',
      style: {
        fontFamily: 'Arial',
        fontSize: 14,
        fill: 0x888888,
        align: 'center',
        wordWrap: true,
        wordWrapWidth: 600
      }
    });
    instructions.anchor.set(0.5);
    instructions.position.set(width / 2, height - 50);
    this.addChild(instructions);
  }

  private async loadPreview() {
    // Carregar configuração global de camadas
    const config = await this.loadGlobalLayers();

    if (!config || config.layers.length === 0) {
      console.warn('[CustomizationScreen] No global layers found, using defaults');
      await this.loadDefaultPreview();
      return;
    }

    // Renderizar camadas na ordem
    for (const layer of config.layers) {
      const folder = layer.type;
      const asset = layer.asset;
      const path = `/assets/sprites/${folder}/${asset}.png`;

      try {
        const texture = await PIXI.Assets.load(path);
        const sprite = new PIXI.Sprite(texture);
        sprite.anchor.set(0.5);
        sprite.x = layer.offsetX;
        sprite.y = layer.offsetY;
        sprite.scale.set(layer.scale);
        sprite.rotation = (layer.rotation * Math.PI) / 180;
        sprite.width = layer.width * layer.scale;
        sprite.height = layer.height * layer.scale;

        this.previewContainer.addChild(sprite);

        // Salvar referências para aplicar cores
        if (layer.type === 'bodies') {
          this.bodySprite = sprite;
        } else if (layer.type === 'eyes') {
          this.eyeSprite = sprite;
        }
      } catch (e) {
        console.error(`[CustomizationScreen] Failed to load ${path}:`, e);
      }
    }

    // Aplicar cores iniciais
    this.applyColors();
  }

  private async loadDefaultPreview() {
    // Fallback caso não haja config global
    try {
      const bodyTexture = await PIXI.Assets.load('/assets/sprites/bodies/ball_red.png');
      this.bodySprite = new PIXI.Sprite(bodyTexture);
      this.bodySprite.anchor.set(0.5);
      this.bodySprite.width = 58;
      this.bodySprite.height = 58;
      this.previewContainer.addChild(this.bodySprite);

      const eyeTexture = await PIXI.Assets.load('/assets/sprites/eyes/eyes_determined.png');
      this.eyeSprite = new PIXI.Sprite(eyeTexture);
      this.eyeSprite.anchor.set(0.5);
      this.eyeSprite.y = 5;
      this.eyeSprite.width = 35;
      this.eyeSprite.height = 18;
      this.previewContainer.addChild(this.eyeSprite);

      this.applyColors();
    } catch (e) {
      console.error('[CustomizationScreen] Failed to load default preview:', e);
    }
  }

  private async loadGlobalLayers(): Promise<any> {
    try {
      const res = await fetch('http://localhost:2567/api/admin/visual/global-layers');
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      console.error('[CustomizationScreen] Failed to load global layers:', e);
      return null;
    }
  }

  private createColorPickers() {
    // Body Color
    const bodyDiv = document.createElement('div');
    bodyDiv.style.cssText = `
      position: absolute;
      left: 50%;
      top: 60%;
      transform: translateX(-50%);
      text-align: center;
      color: white;
      font-family: Arial;
    `;
    bodyDiv.innerHTML = `
      <label style="display: block; margin-bottom: 5px;">Cor do Corpo</label>
      <input type="color" id="bodyColorPicker" value="${this.customizationData.bodyColor}" 
             style="width: 60px; height: 40px; cursor: pointer;">
    `;
    document.body.appendChild(bodyDiv);

    this.bodyColorPicker = document.getElementById('bodyColorPicker') as HTMLInputElement;
    this.bodyColorPicker.addEventListener('input', (e) => {
      this.customizationData.bodyColor = (e.target as HTMLInputElement).value;
      this.applyColors();
    });

    // Eye Color
    const eyeDiv = document.createElement('div');
    eyeDiv.style.cssText = `
      position: absolute;
      left: 50%;
      top: 70%;
      transform: translateX(-50%);
      text-align: center;
      color: white;
      font-family: Arial;
    `;
    eyeDiv.innerHTML = `
      <label style="display: block; margin-bottom: 5px;">Cor dos Olhos</label>
      <input type="color" id="eyeColorPicker" value="${this.customizationData.eyeColor}" 
             style="width: 60px; height: 40px; cursor: pointer;">
    `;
    document.body.appendChild(eyeDiv);

    this.eyeColorPicker = document.getElementById('eyeColorPicker') as HTMLInputElement;
    this.eyeColorPicker.addEventListener('input', (e) => {
      this.customizationData.eyeColor = (e.target as HTMLInputElement).value;
      this.applyColors();
    });
  }

  private applyColors() {
    // Aplicar tint ao corpo (PixiJS aceita hex number)
    if (this.bodySprite) {
      this.bodySprite.tint = parseInt(this.customizationData.bodyColor.replace('#', '0x'));
    }

    // Aplicar tint aos olhos
    if (this.eyeSprite) {
      this.eyeSprite.tint = parseInt(this.customizationData.eyeColor.replace('#', '0x'));
    }
  }

  private createButton(text: string, x: number, y: number, onClick: () => void): Container {
    const container = new Container();
    container.position.set(x, y);
    container.eventMode = 'static';
    container.cursor = 'pointer';

    const bg = new Graphics()
      .roundRect(-150, -40, 300, 80, 10)
      .fill(0x4a90e2);
    
    const label = new Text({
      text,
      style: {
        fontFamily: 'Georgia',
        fontSize: 28,
        fill: 0xffffff,
        fontWeight: 'bold'
      }
    });
    label.anchor.set(0.5);

    container.addChild(bg, label);
    container.on('pointerdown', onClick);

    return container;
  }

  cleanup() {
    // Remover color pickers do DOM
    const bodyPicker = document.getElementById('bodyColorPicker');
    const eyePicker = document.getElementById('eyeColorPicker');
    if (bodyPicker) bodyPicker.parentElement?.remove();
    if (eyePicker) eyePicker.parentElement?.remove();
  }
}