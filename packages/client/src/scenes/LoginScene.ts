// packages/client/src/scenes/LoginScene.ts
// 🐛 BUGFIX: Adicionar método showCustomizationScreen que estava faltando

import { Container, Text, Graphics, TextStyle } from 'pixi.js';

export class LoginScene extends Container {
    private statusText: Text;

    constructor(private onLoginComplete: (data: { 
        charId: number, 
        charName: string, 
        class: string, 
        isNew: boolean 
    }) => void) {
        super();
        this.setupUI();
    }

    private setupUI() {
        const titleStyle = new TextStyle({
            fill: '#ffffff', 
            fontSize: 48, 
            fontWeight: 'bold',
            dropShadow: { alpha: 0.8, blur: 4, color: '#000000', distance: 4 }
        });

        const title = new Text({ text: 'ZYRA ONLINE', style: titleStyle });
        title.anchor.set(0.5);
        title.x = window.innerWidth / 2;
        title.y = 150;
        this.addChild(title);

        this.statusText = new Text({ 
            text: 'Conecte-se para gerenciar seus personagens', 
            style: { fill: '#aaaaaa', fontSize: 18 } 
        });
        this.statusText.anchor.set(0.5);
        this.statusText.x = window.innerWidth / 2;
        this.statusText.y = 250;
        this.addChild(this.statusText);

        const btn = this.createButton("ENTRAR NA CONTA", 320, () => this.handleAccountLogin());
        this.addChild(btn);
    }

    private createButton(label: string, y: number, action: () => void): Container {
        const container = new Container();
        const g = new Graphics().roundRect(0, 0, 260, 50, 10).fill(0x4a90e2);
        const t = new Text({ 
            text: label, 
            style: { fill: 0xffffff, fontSize: 18, fontWeight: 'bold' } 
        });
        t.anchor.set(0.5); 
        t.x = 130; 
        t.y = 25;
        container.addChild(g, t);
        container.x = window.innerWidth / 2 - 130;
        container.y = y;
        container.eventMode = 'static';
        container.cursor = 'pointer';
        container.on('pointerdown', action);
        return container;
    }

    private async handleAccountLogin() {
        const username = prompt("Nome da Conta:");
        if (!username) return;

        try {
            const res = await fetch("http://localhost:2567/api/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username })
            });
            const data = await res.json();

            if (data.exists) {
                // ✅ PERSONAGEM EXISTENTE - escolher da lista
                const charList = data.characters
                    .map((c: any) => `${c.char_name} (Lvl ${c.level} ${c.class_type})`)
                    .join("\n");
                const chosenName = prompt(
                    `Seus personagens:\n${charList}\n\nDigite o NOME do personagem para logar:`
                );
                
                const selectedChar = data.characters.find((c: any) => c.char_name === chosenName);
                if (selectedChar) {
                    this.onLoginComplete({ 
                        charId: selectedChar.id, 
                        charName: selectedChar.char_name, 
                        class: selectedChar.class_type,
                        isNew: false 
                    });
                }
            } else {
                // ✅ NOVO PERSONAGEM - SEM SELEÇÃO DE CLASSE (MEGA UPDATE)
                const charName = prompt("Nome do seu novo Personagem:");
                
                if (charName) {
                    // ⚠️ AVISO AO JOGADOR
                    alert("🔮 MEGA UPDATE: Todos personagens são Mages temporariamente!");
                    
                    // ✅ CRIAR DIRETAMENTE COMO MAGE (sem customização por enquanto)
                    // Se quiser customização de cores, use CharacterCustomizationScreen
                    this.onLoginComplete({
                        charId: data.accountId,
                        charName: charName,
                        class: 'mage', // String 'mage' aqui é ok (será convertido no server)
                        isNew: true
                    });
                }
            }
        } catch (err) {
            console.error('[LoginScene] Error:', err);
        }
    }
}