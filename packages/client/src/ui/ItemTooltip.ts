import { Container, Graphics, Text } from 'pixi.js';
import { ItemRegistry } from '@zyra/shared'; 

export class ItemTooltip extends Container {
    private background: Graphics;
    private nameText: Text;
    private gradeText: Text;
    private descText: Text;
    private statsText: Text;

    constructor() {
        super();
        this.visible = false;
        this.zIndex = 3000;

        this.background = new Graphics();
        this.addChild(this.background);

        const style = { fontFamily: 'Georgia', fill: 0xffffff, fontSize: 14 };

        this.nameText = new Text({ text: '', style: { ...style, fontSize: 18, fontWeight: 'bold' } });
        this.gradeText = new Text({ text: '', style: { ...style, fontSize: 16 } });
        this.statsText = new Text({ text: '', style: { ...style, fill: 0xaaaaff } });
        this.descText = new Text({ text: '', style: { ...style, fontSize: 12, fill: 0xcccccc, wordWrap: true, wordWrapWidth: 180 } });

        this.addChild(this.nameText, this.gradeText, this.statsText, this.descText);
    }

    public show(itemId: string, x: number, y: number) {
        // Busca o template do item no Registry que agora está no shared
        const item = ItemRegistry.getTemplate(itemId);
        if (!item) return;

        this.visible = true;
        
        // Ajuste para a tooltip não sair da tela à direita
        const posX = x + 200 > window.innerWidth ? x - 210 : x + 15;
        this.position.set(posX, y + 15);

        this.nameText.text = item.name;
        this.gradeText.text = `Grade: ${item.grade || 'C'}`;
        this.gradeText.style.fill = this.getGradeColor(item.grade);
        
        let stats = '';
        if (item.stats?.attack) stats += `Ataque: +${item.stats.attack}\n`;
        if (item.stats?.defense) stats += `Defesa: +${item.stats.defense}\n`;
        this.statsText.text = stats;
        
        this.descText.text = item.description || '';

        this.nameText.position.set(10, 10);
        this.gradeText.position.set(10, 35);
        this.statsText.position.set(10, 60);
        this.descText.position.set(10, stats ? 100 : 60);

        const height = this.descText.y + this.descText.height + 15;
        this.background.clear()
            .roundRect(0, 0, 200, height, 8)
            .fill({ color: 0x000000, alpha: 0.9 })
            .stroke({ width: 2, color: this.getGradeColor(item.grade) });
    }

    public hide() {
        this.visible = false;
    }

    private getGradeColor(grade?: string): number {
        switch (grade) {
            case 'S': return 0xffd700;
            case 'A': return 0xff4444;
            case 'B': return 0x44ff44;
            default: return 0xcccccc;
        }
    }
}