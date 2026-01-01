import * as PIXI from 'pixi.js';

export class PlayerVisual extends PIXI.Container {
    private body: PIXI.Sprite;
    private face: PIXI.Sprite;
    private hat: PIXI.Sprite | null = null;
    private shadow: PIXI.Graphics;

    constructor(skinBase: string, faceVisual: string, classVisual: string) {
        super();

        // 1. SOMBRA (Uma elipse preta semi-transparente no chão)
        this.shadow = new PIXI.Graphics();
        this.shadow.beginFill(0x000000, 0.3);
        this.shadow.drawEllipse(0, 0, 15, 8);
        this.shadow.endFill();
        this.shadow.y = 15; // Posicionada nos "pés" da bola
        this.addChild(this.shadow);

        // 2. CORPO (A Bolinha colorida)
        // O nome do recurso deve bater com o que foi carregado no Asset Loader
        this.body = PIXI.Sprite.from(skinBase);
        this.body.anchor.set(0.5);
        this.addChild(this.body);

        // 3. ROSTO (Olhos)
        this.face = PIXI.Sprite.from(faceVisual);
        this.face.anchor.set(0.5);
        this.addChild(this.face);

        // 4. CLASSE (Elmo/Chapéu)
        if (classVisual && classVisual !== "none") {
            this.hat = PIXI.Sprite.from(classVisual);
            this.hat.anchor.set(0.5);
            this.hat.y = -12; // Ajuste este valor para o elmo encaixar no topo da bola
            this.addChild(this.hat);
        }

        // Inicia a animação de "vida" (Idle)
        this.startIdleAnimation();
    }

    /**
     * Animação simples de respiração (Squash and Stretch)
     */
    private startIdleAnimation() {
        // Usando um ticker simples para oscilar a escala
        let ticker = 0;
        PIXI.Ticker.shared.add(() => {
            ticker += 0.05;
            const oscillation = Math.sin(ticker) * 0.03;
            
            // Achata e estica levemente
            this.scale.y = 1 + oscillation;
            this.scale.x = 1 - oscillation;
            
            // Faz a sombra acompanhar levemente
            this.shadow.scale.set(1 + oscillation);
        });
    }

    /**
     * Atualiza o visual se o player mudar de skin em tempo real
     */
    public updateVisual(part: 'body' | 'face' | 'hat', textureKey: string) {
        if (part === 'body') this.body.texture = PIXI.Texture.from(textureKey);
        if (part === 'face') this.face.texture = PIXI.Texture.from(textureKey);
        if (part === 'hat' && this.hat) this.hat.texture = PIXI.Texture.from(textureKey);
    }
}