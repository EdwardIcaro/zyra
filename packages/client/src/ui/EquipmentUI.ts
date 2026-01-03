// packages/client/src/ui/EquipmentUI.ts
import { Container, Graphics, Text } from 'pixi.js';
import { EquipSlot } from '@zyra/shared'; // ✅ CORRIGIDO: importar o enum
import type { EquipmentState } from '@zyra/shared';

export class EquipmentUI extends Container {
    private background: Graphics;
    private titleText: Text;
    private slots: Map<string, Container> = new Map();
    private isOpen = false;

    // Definição visual dos slots baseada no EquipSlot do Shared
    private readonly SLOT_SIZE = 54;
    private readonly slotPositions: Record<string, { x: number, y: number, label: string }> = {
        [EquipSlot.HEAD]:    { x: 0,   y: -110, label: 'Head' },
        [EquipSlot.AMULET]:  { x: 80,  y: -110, label: 'Neck' },
        [EquipSlot.CHEST]:   { x: 0,   y: -40,  label: 'Chest' },
        [EquipSlot.WEAPON]:  { x: -80, y: -40,  label: 'Weapon' },
        [EquipSlot.LEGS]:    { x: 0,   y: 30,   label: 'Legs' },
        [EquipSlot.RING1]:   { x: 80,  y: 30,   label: 'Ring' },
        [EquipSlot.BOOTS]:   { x: 0,   y: 100,  label: 'Feet' },
        [EquipSlot.RING2]:   { x: 80,  y: 100,  label: 'Ring' },
    };

    // Callback para quando o jogador clica em um item equipado
    public onSlotClick?: (slotName: string) => void;

    constructor() {
        super();
        this.visible = false;
        // zIndex alto para ficar acima do HUD e Inventário
        this.zIndex = 2100;
        this.createUI();
        this.resize();
    }

    private createUI() {
        // Painel de Fundo (Centralizado em 0,0)
        this.background = new Graphics()
            .rect(-150, -180, 300, 360)
            .fill(0x1a1a1a, 0.95)
            .stroke({ width: 3, color: 0xd4af37 });
        this.addChild(this.background);

        // Título
        this.titleText = new Text({
            text: 'EQUIPMENT',
            style: {
                fontFamily: 'Georgia',
                fontSize: 22,
                fill: 0xf4e4bc,
                fontWeight: 'bold'
            }
        });
        this.titleText.anchor.set(0.5);
        this.titleText.position.set(0, -160);
        this.addChild(this.titleText);

        // Criar Slots Visuais
        Object.entries(this.slotPositions).forEach(([slotName, pos]) => {
            const slotContainer = new Container();
            slotContainer.position.set(pos.x, pos.y);

            // Desenho do Slot Vazio
            const bg = new Graphics()
                .rect(-this.SLOT_SIZE / 2, -this.SLOT_SIZE / 2, this.SLOT_SIZE, this.SLOT_SIZE)
                .fill(0x2a2a2a)
                .stroke({ width: 2, color: 0x444444 });
            
            // Texto de ajuda (Head, Weapon, etc)
            const label = new Text({
                text: pos.label,
                style: { fontSize: 10, fill: 0x666666 }
            });
            label.anchor.set(0.5);
            
            slotContainer.addChild(bg);
            slotContainer.addChild(label);

            // Interatividade
            slotContainer.eventMode = 'static';
            slotContainer.cursor = 'pointer';
            slotContainer.on('pointerdown', () => {
                if (this.onSlotClick) this.onSlotClick(slotName);
            });

            this.slots.set(slotName, slotContainer);
            this.addChild(slotContainer);
        });
    }

    /**
     * Sincroniza visualmente a UI com o estado vindo do servidor
     */
    public update(equipmentState: any) {
        if (!equipmentState || !equipmentState.equipped) return;

        this.slots.forEach((container, slotName) => {
            const equipped = equipmentState.equipped.get(slotName);
            
            // Limpa o ícone antigo (mantendo o background e label)
            if (container.children.length > 2) {
                container.removeChildren(2);
            }

            if (equipped) {
                // Mapeamento temporário de ícones (pode usar o seu iconMap do Inventory)
                const iconMap: Record<string, string> = {
                    'ink_blade': '⚔️',
                    'leather_armor': '🛡️',
                    'iron_helmet': '🪖'
                };

                const icon = new Text({
                    text: iconMap[equipped.itemId] || '📦',
                    style: { fontSize: 28 }
                });
                icon.anchor.set(0.5);
                container.addChild(icon);
            }
        });
    }

    public resize() {
        // Centraliza o painel na tela global
        this.position.set(window.innerWidth / 2, window.innerHeight / 2);
    }

    public toggle() {
        this.isOpen = !this.isOpen;
        this.visible = this.isOpen;
        if (this.isOpen) this.resize();
    }

    public open() {
        this.isOpen = true;
        this.visible = true;
        this.resize();
    }

    public close() {
        this.isOpen = false;
        this.visible = false;
    }

    public getIsOpen(): boolean {
        return this.isOpen;
    }
}