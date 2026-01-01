import { Container, Graphics, Text } from 'pixi.js';
import { EquipSlot, type InventoryState, type EquipmentState, type InventorySlot } from '@zyra/shared';

export type SlotCallback = (index: number) => void;
export type EquipmentCallback = (slotName: string) => void;
// Definição para a Tooltip
export type HoverCallback = (itemId: string, x: number, y: number) => void;

export class InventoryUI extends Container {
    private background: Graphics;
    private titleText: Text;
    private goldText: Text;
    private equipmentContainer: Container;
    private inventoryGrid: Container;
    private slotContainers: Container[] = [];
    private equipmentSlots: Map<string, Container> = new Map();
    
    private lastClickTime = 0;
    private lastInvData?: InventoryState;

    // Callbacks de Ação
    public onItemDoubleClick?: SlotCallback;
    public onEquipmentClick?: EquipmentCallback;
    
    // Callbacks de Tooltip (Resolvendo erro de "Property does not exist")
    public onItemHover?: HoverCallback;
    public onItemOut?: () => void;

    private readonly WINDOW_WIDTH = 650;
    private readonly WINDOW_HEIGHT = 480;
    private readonly SLOT_SIZE = 50;
    private readonly GRID_COLS = 5;
    private readonly GRID_ROWS = 8;

    constructor() {
        super();
        this.zIndex = 2000;
        this.visible = false; 
        this.setupUI();
    }

    private setupUI() {
        // 1. Fundo da Janela
        this.background = new Graphics()
            .rect(0, 0, this.WINDOW_WIDTH, this.WINDOW_HEIGHT)
            .fill(0x1a1a1a, 0.95)
            .stroke({ width: 2, color: 0xd4af37 });
        this.addChild(this.background);

        // 2. Título
        this.titleText = new Text({
            text: 'CHARACTER & INVENTORY',
            style: { fontFamily: 'Georgia', fontSize: 22, fill: 0xf4e4bc, fontWeight: 'bold' }
        });
        this.titleText.anchor.set(0.5, 0);
        this.titleText.position.set(this.WINDOW_WIDTH / 2, 15);
        this.addChild(this.titleText);

        // 3. Gold Display
        this.goldText = new Text({
            text: 'Adena: 0',
            style: { fontFamily: 'Georgia', fontSize: 18, fill: 0xffd700 }
        });
        this.goldText.position.set(20, this.WINDOW_HEIGHT - 40);
        this.addChild(this.goldText);

        // 4. Container de Equipamentos
        this.equipmentContainer = new Container();
        this.equipmentContainer.position.set(30, 70);
        this.addChild(this.equipmentContainer);
        this.createEquipmentSlots();

        // 5. Container de Inventário
        this.inventoryGrid = new Container();
        this.inventoryGrid.position.set(340, 70);
        this.addChild(this.inventoryGrid);
        this.createInventoryGrid();
    }

    private createEquipmentSlots() {
        const slots: Record<string, { x: number, y: number, label: string }> = {
            [EquipSlot.HEAD]:   { x: 100, y: 0,   label: 'Head' },
            [EquipSlot.AMULET]: { x: 170, y: 0,   label: 'Neck' },
            [EquipSlot.CHEST]:  { x: 100, y: 70,  label: 'Chest' },
            [EquipSlot.WEAPON]: { x: 30,  y: 70,  label: 'Weapon' },
            [EquipSlot.LEGS]:   { x: 100, y: 140, label: 'Legs' },
            [EquipSlot.RING1]:  { x: 170, y: 140, label: 'Ring' },
            [EquipSlot.BOOTS]:  { x: 100, y: 210, label: 'Feet' },
            [EquipSlot.RING2]:  { x: 170, y: 210, label: 'Ring' },
        };

        Object.entries(slots).forEach(([slotName, pos]) => {
            const slot = this.createSlotVisual(pos.x, pos.y, pos.label);
            
            // Clique para desequipar
            slot.on('pointerdown', () => {
                if (this.onEquipmentClick) this.onEquipmentClick(slotName);
            });

            this.equipmentSlots.set(slotName, slot);
            this.equipmentContainer.addChild(slot);
        });
    }

    private createInventoryGrid() {
        for (let i = 0; i < this.GRID_ROWS * this.GRID_COLS; i++) {
            const row = Math.floor(i / this.GRID_COLS);
            const col = i % this.GRID_COLS;
            const slot = this.createSlotVisual(col * 55, row * 55, '');
            
            // Eventos de clique
            slot.on('pointerdown', () => this.handleInventoryClick(i));
            
            // Eventos de Tooltip
            slot.on('pointerover', (e) => {
                const item = this.lastInvData?.slots.get(i.toString());
                if (item && this.onItemHover) {
                    this.onItemHover(item.itemId, e.global.x, e.global.y);
                }
            });
            slot.on('pointerout', () => this.onItemOut?.());

            this.slotContainers.push(slot);
            this.inventoryGrid.addChild(slot);
        }
    }

    private createSlotVisual(x: number, y: number, labelStr: string): Container {
        const cnt = new Container();
        cnt.position.set(x, y);
        const bg = new Graphics()
            .rect(0, 0, this.SLOT_SIZE, this.SLOT_SIZE)
            .fill(0x2a2a2a)
            .stroke({ width: 1, color: 0x444444 });
        
        const label = new Text({ 
            text: labelStr, 
            style: { fontSize: 10, fill: 0x555555 } 
        });
        label.anchor.set(0.5); 
        label.position.set(this.SLOT_SIZE / 2, this.SLOT_SIZE / 2);
        
        cnt.addChild(bg, label);
        cnt.eventMode = 'static'; 
        cnt.cursor = 'pointer';
        return cnt;
    }

    private handleInventoryClick(index: number) {
        const now = Date.now();
        if (now - this.lastClickTime < 300 && this.onItemDoubleClick) {
            this.onItemDoubleClick(index);
        }
        this.lastClickTime = now;
    }

    public update(inv: InventoryState, equip: EquipmentState, gold: number) {
        this.lastInvData = inv; // Cache para o hover funcionar
        this.goldText.text = `Adena: ${gold.toLocaleString()}`;

        // Atualizar Inventário
        inv.slots.forEach((slot: InventorySlot) => {
            const container = this.slotContainers[slot.slotIndex];
            if (container) {
                if (container.children.length > 2) container.removeChildren(2);
                this.renderIconInSlot(container, slot.itemId, slot.quantity);
            }
        });

        // Atualizar Equipamentos
        this.equipmentSlots.forEach((container, slotName) => {
            if (container.children.length > 2) container.removeChildren(2);
            const item = equip.equipped.get(slotName);
            
            if (item) {
                this.renderIconInSlot(container, item.itemId);
                
                // Tooltip para equipamento (limpa eventos antigos antes de adicionar novo)
                container.removeAllListeners('pointerover');
                container.on('pointerover', (e) => {
                    if (this.onItemHover) this.onItemHover(item.itemId, e.global.x, e.global.y);
                });
            } else {
                container.removeAllListeners('pointerover');
            }
            container.on('pointerout', () => this.onItemOut?.());
        });
    }

    private renderIconInSlot(container: Container, itemId: string, qty?: number) {
        const icon = new Text({ text: '📦', style: { fontSize: 24 } });
        icon.anchor.set(0.5); 
        icon.position.set(this.SLOT_SIZE / 2, this.SLOT_SIZE / 2);
        container.addChild(icon);

        if (qty && qty > 1) {
            const t = new Text({ 
                text: qty.toString(), 
                style: { fontSize: 12, fill: 0xffffff, stroke: { color: 0x000000, width: 2 } } 
            });
            t.position.set(this.SLOT_SIZE - 15, this.SLOT_SIZE - 15);
            container.addChild(t);
        }
    }

    public toggle() {
        this.visible = !this.visible;
        if (this.visible) this.resize();
    }

    public close() {
        this.visible = false;
    }

    public resize() {
        this.position.set(
            (window.innerWidth - this.WINDOW_WIDTH) / 2,
            (window.innerHeight - this.WINDOW_HEIGHT) / 2
        );
    }
}