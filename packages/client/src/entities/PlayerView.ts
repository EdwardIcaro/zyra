import { Container, Text, Graphics } from 'pixi.js';
import { PlayerState } from '@zyra/shared';

export class PlayerView extends Container {
    private nameLabel: Text;
    private levelLabel: Text;
    private labelContainer: Container;

    // ... (restante do seu código de sprite/animação) ...

    constructor() {
        super();
        this.setupNameplate();
    }

    private setupNameplate() {
        this.labelContainer = new Container();
        
        // Estilo do Nome
        this.nameLabel = new Text({
            text: '',
            style: {
                fontFamily: 'Arial',
                fontSize: 14,
                fill: 0xffffff,
                stroke: { color: 0x000000, width: 2 },
                fontWeight: 'bold'
            }
        });
        this.nameLabel.anchor.set(0.5, 1);

        // Estilo do Nível (ao lado ou abaixo do nome)
        this.levelLabel = new Text({
            text: '',
            style: {
                fontFamily: 'Arial',
                fontSize: 12,
                fill: 0xf1c40f, // Cor dourada para o nível
                stroke: { color: 0x000000, width: 2 },
                fontWeight: 'bold'
            }
        });
        this.levelLabel.anchor.set(0.5, 1);

        this.labelContainer.addChild(this.nameLabel);
        this.labelContainer.addChild(this.levelLabel);
        
        // Posiciona o container acima do sprite (ajuste o -50 conforme o tamanho do seu sprite)
        this.labelContainer.y = -60; 
        this.addChild(this.labelContainer);
    }

    /**
     * Chamado pela cena quando o estado do jogador muda
     */
    public updateFromState(state: PlayerState) {
        this.nameLabel.text = state.username;
        this.levelLabel.text = `Lv.${state.level}`;
        
        // Reposiciona o nível para ficar logo após o nome se quiser na mesma linha
        this.levelLabel.x = (this.nameLabel.width / 2) + 15;
        
        // Se o HP estiver baixo, podemos mudar a cor do nome para vermelho
        if (state.currentHp < state.maxHp * 0.2) {
            this.nameLabel.style.fill = 0xff3333;
        } else {
            this.nameLabel.style.fill = 0xffffff;
        }
    }
}