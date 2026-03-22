import { Container, Graphics, Text, Point } from 'pixi.js';
import { EquipSlot, ItemRegistry } from '@zyra/shared';
import type { InventoryState, EquipmentState, InventorySlot, PlayerState } from '@zyra/shared';
import { Player } from '../entities/Player';
import { uiAdjustments } from './UIAdjustments';

export type SlotCallback = (index: number) => void;
export type EquipmentCallback = (slotName: string) => void;
export type HoverCallback = (itemId: string, x: number, y: number) => void;
export type ActionCallback = () => void;

export class InventoryUI extends Container {
    // Painel único
    private mainPanel: Container;
    private background: Graphics;
    private equipmentBg?: Graphics;
    private inventoryBg?: Graphics;

    // Equipment section components
    private equipmentTitle: Text;
    private equipmentContainer: Container;
    private equipmentSlots: Map<string, Container> = new Map();
    private equipmentLabels: Map<string, Text> = new Map();
    private playerPreview: Container;
    private playerRenderer?: Player;

    // Inventory section components
    private inventoryTitle: Text;
    private inventoryGrid: Container;
    private slotContainers: Container[] = [];
    private pageText: Text;

    // Botões e controles
    private sortButton: Container;
    private trashIcon: Container;
    private closeButton: Container;
    private isDraggingPanel = false;
    private dragOffsetX = 0;
    private dragOffsetY = 0;

    // Estado
    private lastClickTime = 0;
    private lastInvData?: InventoryState;
    private selectedSlot: number = -1;
    private dragStartSlot: number | null = null;
    private dragPreview?: Container;
    private draggedItemId?: string;
    private draggedQuantity: number = 0;
    private draggingGlobalSlot: number | null = null;
    private pendingDropSlot: number | null = null;
    private lastDraggedSlot: number | null = null;
    private lastDragStagePoint?: Point;
    private dragPointerId: number | null = null;
    private lastDragInside: boolean = true;
    private dropZoneOverlay: Graphics = new Graphics();
    private dropZoneActive = false;
    private currentPage = 0;
    private totalSlots = 0;
    private layoutConfig: { anchor?: string; offsetX?: number; offsetY?: number; scale?: number } | null = null;
    private uiConfig: any = null;
    private elementOverrides: Record<string, any> = {};
    private uiStyles: { textColor?: string; fontFamily?: string } = {};
    private breathAnimationTime = 0;
    private editorMode = false;

    // Callbacks de Ação
    public onItemDoubleClick?: SlotCallback;
    public onItemMove?: (from: number, to: number) => void;
    public onEquipmentClick?: EquipmentCallback;
    public onItemHover?: HoverCallback;
    public onItemOut?: () => void;
    public onSort?: ActionCallback;
    public onDrop?: SlotCallback;

    // Dimensões do painel único
    private readonly PANEL_WIDTH = 620; // Aumentado de 560 para 620
    private readonly PANEL_HEIGHT = 470;
    private readonly EQUIPMENT_SECTION_WIDTH = 240; // Aumentado de 200 para 240
    private readonly INVENTORY_SECTION_X = 260; // Ajustado
    // 🎯 SLOTS 52x52 (maiores e mais visíveis)
    private readonly SLOT_SIZE = 52; // Aumentado de 45 para 52
    private readonly EQUIPMENT_SLOT_SIZE = 52; // Aumentado de 45 para 52
    private readonly GRID_COLS = 5;
    private readonly GRID_ROWS = 6;
    private readonly SLOTS_PER_PAGE = 30;
    // 🔵 PREVIEW (90px de diâmetro)
    private readonly PREVIEW_SIZE = 90;
    // ⚙️ AJUSTE MANUAL DA ESCALA DO PREVIEW AQUI ⬇️
    // Valores sugeridos: 0.5 (pequeno) | 0.7 (médio) | 1.0 (normal) | 1.2 (grande)
    private readonly PREVIEW_SCALE = 0.7;
    private readonly DROP_ZONE_PADDING = 10;
    private readonly PALETTE = {
        background: 0xf5edd5,        // Fundo bege claro
        panelBorder: 0x9b7653,       // Borda marrom/dourada
        panelInner: 0x8b6f47,        // Borda interna
        equipmentBg: 0xede5ce,       // Fundo equipment section
        inventoryBg: 0xe8dfc8,       // Fundo inventory section (levemente mais escuro)
        slot: 0xf5edd5,              // Slot vazio claro
        slotBorder: 0xc4b298,        // Borda dos slots
        slotSelected: 0xffd700,      // Slot selecionado
        text: 0x4a3820,              // Texto escuro
        textLight: 0x6b5940,         // Texto secundário
        buttonGreen: 0x8bc34a,       // Botão verde (Sort)
        buttonWhite: 0xf5f5f5,       // Botão branco (Drop Gold)
        buttonText: 0xffffff,        // Texto botão verde
        buttonTextDark: 0x4a3820,    // Texto botão branco
        shadow: 0x00000040           // Sombra
    };

    constructor() {
        super();
        this.zIndex = 2000;
        this.visible = false;
        this.mainPanel = new Container();
        this.background = new Graphics();
        this.equipmentContainer = new Container();
    this.inventoryGrid = new Container();
    this.sortButton = new Container();
    this.trashIcon = new Container();
    this.closeButton = new Container();
    this.equipmentTitle = new Text();
    this.inventoryTitle = new Text();
    this.pageText = new Text();
    this.playerPreview = new Container();
    this.setupUI();
    this.resize();
        this.eventMode = 'static';
        this.setupMouseWheel();
    }

    private setupMouseWheel() {
        // Adicionar evento de scroll com a roda do mouse
        this.inventoryGrid.eventMode = 'static';
    this.inventoryGrid.on('wheel', (event: any) => {
        if (event.deltaY > 0) {
            this.nextPage();
        } else if (event.deltaY < 0) {
            this.prevPage();
        }
    });
}

    public setEditorMode(active: boolean) {
        this.editorMode = active;
        if (active) {
            this.dropZoneOverlay.visible = false;
        }
    }

    private setupUI() {
        // Main panel background com estilo de pergaminho
        this.createMainBackground();
        this.addChild(this.mainPanel);
        this.configureDropZoneOverlay();

        // Equipment Section (esquerda)
        this.setupEquipmentSection();

        // Inventory Section (direita)
        this.setupInventorySection();

        // Botões na parte inferior
        this.setupBottomButtons();

        // Botão de fechar (X no canto superior direito)
        this.createCloseButton();

        // Setup de drag do painel
        this.setupPanelDrag();
    }

    private createMainBackground() {
        const g = new Graphics();
        const w = this.PANEL_WIDTH;
        const h = this.PANEL_HEIGHT;
        const radius = 16;

        // Shadow
        g.roundRect(4, 4, w, h, radius).fill(this.PALETTE.shadow);

        // Borda externa marrom/dourada (mais grossa)
        g.roundRect(0, 0, w, h, radius).fill(this.PALETTE.panelBorder);

        // Borda interna
        g.roundRect(3, 3, w - 6, h - 6, radius - 2).fill(this.PALETTE.panelInner);

        // Background principal
        g.roundRect(5, 5, w - 10, h - 10, radius - 3).fill(this.PALETTE.background);

        this.background = g;
        this.mainPanel.addChild(this.background);
    }

    private setupEquipmentSection() {
        const padding = 15;
        const startY = 50;
        const sectionHeight = 360;

        // Equipment background area (levemente diferente)
        const equipBg = new Graphics()
            .roundRect(padding, startY - 5, this.EQUIPMENT_SECTION_WIDTH, sectionHeight, 8)
            .fill(this.PALETTE.equipmentBg);
        this.equipmentBg = equipBg;
        this.mainPanel.addChild(equipBg);

        // Título "Equipment" com ícone
        this.equipmentTitle = new Text({
            text: '⚔ Equipment',
            style: {
                fontFamily: 'Arial',
                fontSize: 15,
                fill: this.PALETTE.text,
                fontWeight: 'bold'
            }
        });
        this.equipmentTitle.position.set(padding + 8, 20);
        this.mainPanel.addChild(this.equipmentTitle);

        // Equipment slots container - posicionado primeiro
        this.equipmentContainer.position.set(padding, startY);
        this.mainPanel.addChild(this.equipmentContainer);

        // Preview do personagem no centro DO EQUIPMENT CONTAINER
        this.createPlayerPreview();
        const previewX = this.EQUIPMENT_SECTION_WIDTH / 2;
        const previewY = sectionHeight / 2;
        this.playerPreview.position.set(previewX, previewY);
        this.equipmentContainer.addChild(this.playerPreview);


        // Criar slots ao redor do preview
        this.createEquipmentSlots(previewX, previewY);

        // Debug: marcar posição do preview
        console.log('[InventoryUI] Preview position:', { x: previewX, y: previewY, size: this.PREVIEW_SIZE });
    }

    private createPlayerPreview() {
        // Container com fundo circular para o preview (80px diâmetro)
        const previewBg = new Graphics()
            .circle(0, 0, this.PREVIEW_SIZE / 2)
            .fill(this.PALETTE.background)
            .stroke({ width: 2, color: this.PALETTE.slotBorder });

        this.playerPreview.addChild(previewBg);

        // Label "Preview" acima
        const previewLabel = new Text({
            text: 'Preview',
            style: {
                fontFamily: 'Arial',
                fontSize: 8,
                fill: this.PALETTE.textLight,
                fontWeight: '500'
            }
        });
        previewLabel.anchor.set(0.5);
        previewLabel.position.set(0, -this.PREVIEW_SIZE / 2 - 10);
        this.playerPreview.addChild(previewLabel);

        // O PlayerRenderer será adicionado quando tivermos o estado do player
    }

    private setupInventorySection() {
        const startY = 50;
        const invWidth = this.PANEL_WIDTH - this.INVENTORY_SECTION_X - 15;
        const sectionHeight = 360;

        // Inventory background area (levemente mais escuro)
        const invBg = new Graphics()
            .roundRect(this.INVENTORY_SECTION_X, startY - 5, invWidth, sectionHeight, 8)
            .fill(this.PALETTE.inventoryBg);
        this.inventoryBg = invBg;
        this.mainPanel.addChild(invBg);

        // Título "Inventory" com ícone
        this.inventoryTitle = new Text({
            text: '🎒 Inventory',
            style: {
                fontFamily: 'Arial',
                fontSize: 15,
                fill: this.PALETTE.text,
                fontWeight: 'bold'
            }
        });
        this.inventoryTitle.position.set(this.INVENTORY_SECTION_X + 8, 20);
        this.mainPanel.addChild(this.inventoryTitle);

        // Calcular grid do inventário - centralizar
        const spacing = 8; // Aumentado de 5 para 8
        const slotWithSpacing = this.SLOT_SIZE + spacing;
        const gridWidth = this.GRID_COLS * slotWithSpacing - spacing;
        const gridHeight = this.GRID_ROWS * slotWithSpacing - spacing;
        const gridX = this.INVENTORY_SECTION_X + (invWidth - gridWidth) / 2;
        const gridY = startY + (sectionHeight - gridHeight) / 2;

        // Inventory grid centralizado
        this.inventoryGrid.position.set(gridX, gridY);
        this.mainPanel.addChild(this.inventoryGrid);
        this.createInventoryGrid();
    }

    private setupBottomButtons() {
        const buttonY = this.PANEL_HEIGHT - 35;
        const centerX = this.PANEL_WIDTH / 2;

        // Ícone de lixeira (esquerda)
        this.trashIcon = this.createTrashIcon();
        this.trashIcon.position.set(centerX - 60, buttonY);
        this.trashIcon.on('pointerdown', (e: any) => {
            e.stopPropagation(); // 🎯 Previne click no personagem
            if (this.selectedSlot >= 0) {
                console.log('[InventoryUI] 🗑️ Descartando item do slot:', this.selectedSlot);
                this.onDrop?.(this.selectedSlot); // Chamar callback de descartar
                this.showMessage('❌ Item descartado!');
            } else {
                this.showMessage('⚠️ Selecione um item primeiro!');
            }
        });
        this.mainPanel.addChild(this.trashIcon);

        // Botão "Sort" discreto (centro, bem pequeno)
        this.sortButton = this.createSmallSortButton();
        this.sortButton.position.set(centerX - 15, buttonY + 5);
        this.sortButton.on('pointerdown', (e: any) => {
            e.stopPropagation(); // 🎯 Previne click no personagem
            console.log('[InventoryUI] ✓ Ordenando inventário...');
            this.showMessage('✓ Inventário ordenado!');
            this.onSort?.(); // Chamar callback de ordenar
        });
        this.mainPanel.addChild(this.sortButton);
    }

    private createCloseButton() {
        const buttonSize = 28;
        const padding = 12;

        // 🎨 Botão X para fechar
        const closeBtn = new Container();
        closeBtn.eventMode = 'static';
        closeBtn.cursor = 'pointer';
        closeBtn.position.set(this.PANEL_WIDTH - buttonSize - padding, padding);

        // Background
        const bg = new Graphics()
            .circle(buttonSize / 2, buttonSize / 2, buttonSize / 2)
            .fill(0xf0f0f0)
            .stroke({ width: 1.5, color: 0xcccccc });

        // Símbolo X
        const xText = new Text({
            text: '✕',
            style: {
                fontFamily: 'Arial',
                fontSize: 18,
                fill: 0x666666,
                fontWeight: 'bold'
            }
        });
        xText.anchor.set(0.5);
        xText.position.set(buttonSize / 2, buttonSize / 2);

        closeBtn.addChild(bg, xText);

        // Hover effect
        closeBtn.on('pointerover', () => {
            bg.clear()
                .circle(buttonSize / 2, buttonSize / 2, buttonSize / 2)
                .fill(0xff4444)
                .stroke({ width: 1.5, color: 0xcc0000 });
            xText.style.fill = 0xffffff;
        });

        closeBtn.on('pointerout', () => {
            bg.clear()
                .circle(buttonSize / 2, buttonSize / 2, buttonSize / 2)
                .fill(0xf0f0f0)
                .stroke({ width: 1.5, color: 0xcccccc });
            xText.style.fill = 0x666666;
        });

        closeBtn.on('pointerdown', (e: any) => {
            e.stopPropagation(); // 🎯 Previne click no personagem
            this.toggle(); // Fechar o inventory
        });

        this.mainPanel.addChild(closeBtn);
        this.closeButton = closeBtn;
    }

    private setupPanelDrag() {
        // 🎨 Setup de drag do painel inteiro
        // Permite clicar e arrastar o painel pela parte de cima
        const dragArea = this.mainPanel;
        dragArea.eventMode = 'static';

        // Detectar drag apenas na parte de cima (titulo area)
        dragArea.on('pointerdown', (e: any) => {
            // Verificar se clicou na área de cima (títulos)
            const clickY = e.global.y - this.mainPanel.getGlobalPosition().y;

            // Apenas ativar drag se clicou nos primeiros 50 pixels (área de títulos)
            if (clickY < 50) {
                this.isDraggingPanel = true;
                this.dragOffsetX = e.global.x - this.mainPanel.x;
                this.dragOffsetY = e.global.y - this.mainPanel.y;
                dragArea.cursor = 'grabbing';
            }
        });

        dragArea.on('pointermove', (e: any) => {
            if (this.isDraggingPanel) {
                this.mainPanel.x = e.global.x - this.dragOffsetX;
                this.mainPanel.y = e.global.y - this.dragOffsetY;
                if (this.dropZoneActive) {
                    this.refreshDropZoneIndicator(this.lastDragStagePoint);
                }
            }
        });

        dragArea.on('pointerup', () => {
            this.isDraggingPanel = false;
            dragArea.cursor = 'pointer';
        });

        dragArea.on('pointerupoutside', () => {
            this.isDraggingPanel = false;
            dragArea.cursor = 'pointer';
        });
    }

    private configureDropZoneOverlay() {
    this.dropZoneOverlay.clear();
    this.dropZoneOverlay.eventMode = 'none';
    this.dropZoneOverlay.visible = false;
    this.addChild(this.dropZoneOverlay);
    }

    private createTrashIcon(): Container {
        const container = new Container();
        container.eventMode = 'static';
        container.cursor = 'pointer';

        const size = 40; // Aumentado de 34

        // 🎨 Sombra suave
        const shadow = new Graphics()
            .roundRect(1, 2, size, size, size / 2)
            .fill(0x000000);
        shadow.alpha = 0.15;
        container.addChild(shadow);

        const g = new Graphics();

        // Ícone de lixeira com estilo melhorado
        g.roundRect(0, 0, size, size, size / 2)
            .fill(0xf5f5f5)
            .stroke({ width: 2.5, color: this.PALETTE.slotBorder });

        // Desenhar lixeira (símbolo)
        const trashText = new Text({
            text: '🗑',
            style: {
                fontFamily: 'Arial',
                fontSize: 22
            }
        });
        trashText.anchor.set(0.5);
        trashText.position.set(size / 2, size / 2);

        container.addChild(g, trashText);

        // 🎨 Efeito hover melhorado
        container.on('pointerover', () => {
            g.clear()
                .roundRect(0, 0, size, size, size / 2)
                .fill(0xff5555) // Vermelho mais claro
                .stroke({ width: 3, color: 0xff0000 }); // Borda vermelha mais brilhante
            trashText.style.fill = 0xffffff;

            // Escala e sombra
            container.scale.set(1.1, 1.1);
            shadow.alpha = 0.25;
        });

        container.on('pointerout', () => {
            g.clear()
                .roundRect(0, 0, size, size, size / 2)
                .fill(0xf5f5f5)
                .stroke({ width: 2.5, color: this.PALETTE.slotBorder });
            trashText.style.fill = 0x000000;

            // Voltar ao normal
            container.scale.set(1, 1);
            shadow.alpha = 0.15;
        });

        return container;
    }

    private createArrowButton(direction: 'up' | 'down', size: number): Container {
        const container = new Container();
        container.eventMode = 'static';
        container.cursor = 'pointer';

        // 🎨 Sombra suave
        const shadow = new Graphics()
            .roundRect(1, 2, size, size, 4)
            .fill(0x000000);
        shadow.alpha = 0.12;
        container.addChild(shadow);

        const g = new Graphics();
        g.roundRect(0, 0, size, size, 4)
            .fill(this.PALETTE.buttonWhite)
            .stroke({ width: 2, color: this.PALETTE.slotBorder });

        const arrow = new Text({
            text: direction === 'up' ? '▲' : '▼',
            style: {
                fontFamily: 'Arial',
                fontSize: 14,
                fill: this.PALETTE.text,
                fontWeight: 'bold'
            }
        });
        arrow.anchor.set(0.5);
        arrow.position.set(size / 2, size / 2);

        container.addChild(g, arrow);

        // 🎨 Efeito hover melhorado
        container.on('pointerover', () => {
            g.clear()
                .roundRect(0, 0, size, size, 4)
                .fill(this.PALETTE.buttonGreen)
                .stroke({ width: 2.5, color: 0xffffff }); // Borda branca
            arrow.style.fill = 0xffffff;

            // Escala e sombra
            container.scale.set(1.12, 1.12);
            shadow.alpha = 0.2;
        });

        container.on('pointerout', () => {
            g.clear()
                .roundRect(0, 0, size, size, 4)
                .fill(this.PALETTE.buttonWhite)
                .stroke({ width: 2, color: this.PALETTE.slotBorder });
            arrow.style.fill = this.PALETTE.text;

            // Voltar ao normal
            container.scale.set(1, 1);
            shadow.alpha = 0.12;
        });

        return container;
    }



    private createSmallSortButton(): Container {
        // 🎨 Botão Sort pequeno e discreto
        const btn = new Container();
        btn.eventMode = 'static';
        btn.cursor = 'pointer';

        const size = 28;

        const bg = new Graphics()
            .circle(size / 2, size / 2, size / 2)
            .fill(this.PALETTE.buttonGreen)
            .stroke({ width: 1.5, color: this.PALETTE.panelBorder });

        const text = new Text({
            text: '✓',
            style: {
                fontFamily: 'Arial',
                fontSize: 16,
                fill: this.PALETTE.buttonText,
                fontWeight: 'bold'
            }
        });
        text.anchor.set(0.5);
        text.position.set(size / 2, size / 2);

        btn.addChild(bg, text);

        // Hover effect simples
        btn.on('pointerover', () => {
            bg.clear()
                .circle(size / 2, size / 2, size / 2)
                .fill(this.PALETTE.buttonGreen)
                .stroke({ width: 2, color: 0xffffff });
            btn.scale.set(1.15, 1.15);
        });

        btn.on('pointerout', () => {
            bg.clear()
                .circle(size / 2, size / 2, size / 2)
                .fill(this.PALETTE.buttonGreen)
                .stroke({ width: 1.5, color: this.PALETTE.panelBorder });
            btn.scale.set(1, 1);
        });

        return btn;
    }

    private createPillButton(label: string, bgColor: number, textColor: number, width: number, height: number): Container {
        const btn = new Container();
        btn.eventMode = 'static';
        btn.cursor = 'pointer';

        const radius = height / 2; // Pill shape

        // 🎨 Sombra suave
        const shadow = new Graphics()
            .roundRect(1, 2, width, height, radius)
            .fill(0x000000);
        shadow.alpha = 0.15;
        btn.addChild(shadow);

        const bg = new Graphics()
            .roundRect(0, 0, width, height, radius)
            .fill(bgColor)
            .stroke({ width: 2.5, color: this.PALETTE.panelBorder });

        const text = new Text({
            text: label,
            style: {
                fontFamily: 'Arial',
                fontSize: 14,
                fill: textColor,
                fontWeight: 'bold'
            }
        });
        text.anchor.set(0.5);
        text.position.set(width / 2, height / 2);

        btn.addChild(bg, text);

        // 🎨 Efeito hover melhorado
        btn.on('pointerover', () => {
            // Brilho mais intenso
            bg.clear()
                .roundRect(0, 0, width, height, radius)
                .fill(bgColor)
                .stroke({ width: 3.5, color: 0xffffff }); // Borda branca brilhante

            // Escala suave
            btn.scale.set(1.08, 1.08);

            // Sombra mais pronunciada
            shadow.alpha = 0.3;

            // Texto um pouco maior
            text.scale.set(1.1, 1.1);
        });

        btn.on('pointerout', () => {
            bg.clear()
                .roundRect(0, 0, width, height, radius)
                .fill(bgColor)
                .stroke({ width: 2.5, color: this.PALETTE.panelBorder });

            // Voltar ao normal
            btn.scale.set(1, 1);
            shadow.alpha = 0.15;
            text.scale.set(1, 1);
        });

        return btn;
    }

    private createEquipmentSlots(centerX: number, centerY: number) { 
        const slotSize = this.EQUIPMENT_SLOT_SIZE; // 45x45 
        const radius = 90; // Raio ajustado para slots 45x45 
 
        // Posições ao redor do preview (relativas ao centro do preview) 
        const slots: Record<string, { x: number, y: number, label: string, labelSide: 'right' | 'left' | 'top' | 'bottom' }> = { 
            // Topo 
            [EquipSlot.HEAD]:   { x: centerX - slotSize / 2, y: centerY - radius - slotSize - 8, label: 'Head', labelSide: 'top' }, 
 
            // Esquerda (superior) 
            [EquipSlot.WEAPON]:   { x: 22, y: 133, label: 'Weapon', labelSide: 'left' }, 
 
            // Esquerda (inferior) 
            [EquipSlot.RING1]:  { x: centerX - radius - slotSize - 8, y: centerY + 15, label: 'Ring', labelSide: 'left' }, 
 
            // Esquerda (baixo) - boots (movimentação) 
            [EquipSlot.BOOTS]: { x: centerX - radius - slotSize - 8, y: centerY + 55, label: 'Boots', labelSide: 'left' }, 
 
            // Direita (superior) 
            [EquipSlot.AMULET]: { x: centerX + radius + 8, y: centerY - 60, label: 'Neck', labelSide: 'right' }, 
 
            // Direita (meio) 
            [EquipSlot.CHEST]:  { x: centerX + radius + 8, y: centerY - 22, label: 'Plate', labelSide: 'right' },

            // Direita (inferior) - novo: brinco
            [EquipSlot.EARRING]:  { x: centerX + radius + 8, y: centerY + 15, label: 'Ear', labelSide: 'right' },

            // Baixo (centro) - novo: pet
            [EquipSlot.PET]:   { x: centerX - slotSize / 2, y: centerY + radius + 8, label: 'Pet', labelSide: 'bottom' },
        };

        Object.entries(slots).forEach(([slotName, config]) => {
            // Criar slot com posições padrão
            const slot = this.createSlotVisual(config.x, config.y, '', slotSize);
            // 🏷️ Armazenar identificador do slot para UIEditor (propriedade customizada)
            (slot as any).__equipSlot = slotName;
            slot.on('pointerdown', () => {
                if (this.onEquipmentClick) this.onEquipmentClick(slotName);
            });
            this.equipmentSlots.set(slotName, slot);
            this.equipmentContainer.addChild(slot);

            // Ocultar slots desnecessários
            const HIDDEN_SLOTS = [EquipSlot.RING1, EquipSlot.BOOTS, EquipSlot.AMULET, EquipSlot.CHEST, EquipSlot.EARRING];
            if (HIDDEN_SLOTS.includes(slotName as EquipSlot)) {
              slot.visible = false;
              slot.eventMode = 'none';
            }

            // Criar label ao lado do slot (baseado no lado)
            const label = new Text({
                text: config.label,
                style: {
                    fontFamily: 'Arial',
                    fontSize: 10,
                    fill: this.PALETTE.text,
                    fontWeight: '500'
                }
            });

            // Posicionar label baseado no lado
            switch (config.labelSide) {
                case 'right':
                    label.position.set(config.x + slotSize + 3, config.y + slotSize / 2 - label.height / 2);
                    break;
                case 'left':
                    label.position.set(config.x - label.width - 3, config.y + slotSize / 2 - label.height / 2);
                    break;
                case 'top':
                    label.anchor.set(0.5, 1);
                    label.position.set(config.x + slotSize / 2, config.y - 3);
                    break;
                case 'bottom':
                    label.anchor.set(0.5, 0);
                    label.position.set(config.x + slotSize / 2, config.y + slotSize + 3);
                    break;
            }

            this.equipmentLabels.set(slotName, label);
            this.equipmentContainer.addChild(label);
        });
    }

    private createInventoryGrid() {
        const spacing = 8; // Espaçamento entre slots (aumentado de 5 para 8)
        const slotWithSpacing = this.SLOT_SIZE + spacing;

        for (let i = 0; i < this.SLOTS_PER_PAGE; i++) {
            const row = Math.floor(i / this.GRID_COLS);
            const col = i % this.GRID_COLS;
            const slot = this.createSlotVisual(
                col * slotWithSpacing,
                row * slotWithSpacing,
                '',
                this.SLOT_SIZE
            );

            const slotIndex = i;
            slot.on('pointerdown', (event: any) => {
                this.dragStartSlot = slotIndex;
                const pointerId = (event as any)?.data?.pointerId ?? (event as any)?.pointerId;
                this.dragPointerId = Number.isFinite(pointerId) ? pointerId : null;
                const globalSlot = this.currentPage * this.SLOTS_PER_PAGE + slotIndex;
                const slotData = this.lastInvData?.slots.get(globalSlot.toString());
                if (slotData) {
                    this.lastDragInside = true;
                    this.startDragPreview(slotData, event.data.global, globalSlot);
                    this.draggingGlobalSlot = globalSlot;
                    this.pendingDropSlot = globalSlot;
                    this.lastDraggedSlot = globalSlot;
                    this.draggedItemId = slotData.itemId;
                    this.draggedQuantity = slotData.quantity;
                    console.log('[InventoryUI] start drag slot', globalSlot);
                } else {
                    this.draggingGlobalSlot = null;
                    this.pendingDropSlot = null;
                    this.lastDraggedSlot = null;
                    this.draggedItemId = undefined;
                    this.draggedQuantity = 0;
                }
                this.handleInventoryClick(slotIndex);
            });

            slot.on('pointerover', (e) => {
                const globalSlot = this.currentPage * this.SLOTS_PER_PAGE + slotIndex;
                const item = this.lastInvData?.slots.get(globalSlot.toString());
                if (item && this.onItemHover) {
                    this.onItemHover(item.itemId, e.global.x, e.global.y);
                }
            });
            slot.on('pointerout', () => this.onItemOut?.());
            slot.on('pointerup', () => {
                if (this.dragStartSlot !== null) {
                    const fromGlobal = this.currentPage * this.SLOTS_PER_PAGE + this.dragStartSlot;
                    const toGlobal = this.currentPage * this.SLOTS_PER_PAGE + slotIndex;
                    if (fromGlobal !== toGlobal) {
                        this.onItemMove?.(fromGlobal, toGlobal);
                    }
                    this.dragStartSlot = null;
                }
                this.stopDragPreview();
            });
            slot.on('pointerupoutside', (event: any) => {
                this.dragStartSlot = null;
                if (event?.global) {
                    this.handleDropAtPoint(event.global);
                }
                this.stopDragPreview();
            });

            this.slotContainers.push(slot);
            this.inventoryGrid.addChild(slot);
        }
    }


    private createSlotVisual(x: number, y: number, labelStr: string, size: number = this.SLOT_SIZE): Container {
        const cnt = new Container();
        cnt.position.set(x, y);
        const radius = 6;

        // 🎨 Sombra para profundidade
        const shadow = new Graphics()
            .roundRect(2, 2, size, size, radius)
            .fill(0x000000);
        shadow.alpha = 0.15; // Sombra suave com transparência
        cnt.addChild(shadow);

        // 🎨 Background do slot (mais claro para melhor contraste)
        const bg = new Graphics()
            .roundRect(0, 0, size, size, radius)
            .fill(0xfdfbf7) // Branco mais quente (mais claro que antes)
            .stroke({ width: 2.5, color: 0xa89968 }); // Borda mais grossa e mais definida

        // 🎨 Borda interna suave (efeito de profundidade)
        const innerBorder = new Graphics()
            .roundRect(1, 1, size - 2, size - 2, radius - 1)
            .stroke({ width: 1, color: 0xffffff });
        innerBorder.alpha = 0.4; // Branco com transparência

        const label = new Text({
            text: labelStr,
            style: { fontSize: 9, fill: this.PALETTE.textLight, fontWeight: '500' }
        });
        label.anchor.set(0.5);
        label.position.set(size / 2, size / 2);

        cnt.addChild(bg, innerBorder, label);
        cnt.eventMode = 'static';
        cnt.cursor = 'pointer';

        // 🎨 Hover effects para melhor feedback visual
        cnt.on('pointerover', () => {
            if (this.editorMode) return;
            // Efeito de brilho ao passar mouse
            bg.clear()
                .roundRect(0, 0, size, size, radius)
                .fill(0xfffef9) // Um pouco mais claro
                .stroke({ width: 2.5, color: 0xd4af37 }); // Borda dourada mais brilhante

            // Borda interna mais visível no hover
            innerBorder.alpha = 0.8;

            // Sombra mais pronunciada
            shadow.alpha = 0.25;

            // Escala suave
            cnt.scale.set(1.06, 1.06);
        });

        cnt.on('pointerout', () => {
            if (this.editorMode) return;
            // Voltar ao estado normal
            bg.clear()
                .roundRect(0, 0, size, size, radius)
                .fill(0xfdfbf7)
                .stroke({ width: 2.5, color: 0xa89968 });

            // Borda interna volta ao normal
            innerBorder.alpha = 0.4;

            // Sombra volta ao normal
            shadow.alpha = 0.15;

            // Escala volta ao normal
            cnt.scale.set(1, 1);
        });

        // Armazenar referência ao bg e radius para highlight de seleção
        (cnt as any)._bg = bg;
        (cnt as any)._size = size;
        (cnt as any)._radius = radius;

        return cnt;
    }

    private handleInventoryClick(slotIndex: number) {
        const globalSlot = this.currentPage * this.SLOTS_PER_PAGE + slotIndex;
        const now = Date.now();

        // Double-click para equipar
        if (now - this.lastClickTime < 300 && this.onItemDoubleClick) {
            const item = this.lastInvData?.slots.get(globalSlot.toString());
            if (item) {
                const template = ItemRegistry.getTemplate(item.itemId);

                if (!template) {
                    console.warn('[InventoryUI] Item template not found:', item.itemId);
                    return;
                }

                if (!template.isEquipable) {
                    this.showMessage('❌ Este item não pode ser equipado');
                    return;
                }

                if (!template.equipSlot) {
                    this.showMessage('❌ Slot de equipamento inválido');
                    return;
                }

                this.onItemDoubleClick(globalSlot);
            }
        } else {
            // Single-click para selecionar
            this.selectSlot(globalSlot);
        }

        this.lastClickTime = now;
    }

    private startDragPreview(slot: InventorySlot, startGlobal: Point, globalSlot: number) {
        this.stopDragPreview();
        const preview = this.createDragPreview(slot.itemId, slot.quantity);
        (preview as any).__sourceSlot = globalSlot;
        this.dragPreview = preview;
        this.addChild(preview);
        this.lastDragStagePoint = new Point(startGlobal.x, startGlobal.y);
        this.updateDragPreviewPosition(startGlobal);
        this.setDropZoneActive(true, startGlobal);
        window.addEventListener('pointermove', this.handleWindowPointerMove, true);
        window.addEventListener('pointerup', this.handleWindowPointerUp, true);
        window.addEventListener('pointercancel', this.handleWindowPointerUp, true);
        window.addEventListener('blur', this.handleWindowBlur);
    }

    private createDragPreview(itemId: string, quantity: number): Container {
        const container = new Container();
        container.eventMode = 'none';
        container.zIndex = 9999;

        const background = new Graphics()
            .beginFill(0xfffef9)
            .lineStyle(2.5, 0xa89968)
            .drawRoundedRect(0, 0, this.SLOT_SIZE, this.SLOT_SIZE, 8);

        const icon = new Text({
            text: this.getItemIcon(itemId),
            style: { fontSize: this.SLOT_SIZE * 0.55 }
        });
        icon.anchor.set(0.5);
        icon.position.set(this.SLOT_SIZE / 2, this.SLOT_SIZE / 2);

        container.addChild(background, icon);

        if (quantity > 1) {
            const qtyText = new Text({
                text: quantity.toString(),
                style: {
                    fontSize: this.SLOT_SIZE * 0.28,
                    fill: 0xffffff,
                    stroke: { color: 0x000000, width: 2 },
                    fontWeight: 'bold'
                }
            });
            qtyText.anchor.set(1, 1);
            qtyText.position.set(this.SLOT_SIZE - 4, this.SLOT_SIZE - 4);
            container.addChild(qtyText);
        }

        return container;
    }

    private updateDragPreviewPosition(globalPoint: Point) {
        if (!this.dragPreview) return;
        this.lastDragStagePoint = new Point(globalPoint.x, globalPoint.y);
        const localPoint = this.toLocal(globalPoint, undefined, undefined);
        this.dragPreview.position.set(localPoint.x + 8, localPoint.y + 8);
    }

    private stopDragPreview() {
        this.setDropZoneActive(false);
        if (this.dragPreview) {
            this.removeChild(this.dragPreview);
            this.dragPreview.destroy({ children: true });
            this.dragPreview = undefined;
        }
        this.draggedItemId = undefined;
        this.draggedQuantity = 0;
        this.draggingGlobalSlot = null;
        this.pendingDropSlot = null;
        this.lastDraggedSlot = null;
        this.lastDragStagePoint = undefined;
        this.lastDragInside = true;
        this.dragPointerId = null;
        window.removeEventListener('pointermove', this.handleWindowPointerMove, true);
        window.removeEventListener('pointerup', this.handleWindowPointerUp, true);
        window.removeEventListener('pointercancel', this.handleWindowPointerUp, true);
        window.removeEventListener('blur', this.handleWindowBlur);
    }

    private handleWindowPointerMove = (event: PointerEvent) => {
        if (!this.dragPreview) return;
        if (this.dragPointerId !== null && event.pointerId !== this.dragPointerId) return;
        if (event.buttons === 0) {
            const stagePoint = this.clientToStagePoint(event) || this.lastDragStagePoint;
            if (stagePoint) {
                this.refreshDropZoneIndicator(stagePoint);
                this.handleDropAtPoint(stagePoint);
            }
            this.stopDragPreview();
            return;
        }
        const stagePoint = this.clientToStagePoint(event);
        if (stagePoint) {
            this.lastDragInside = this.isPointInsidePanel(stagePoint);
            this.refreshDropZoneIndicator(stagePoint);
            this.updateDragPreviewPosition(stagePoint);
        }
    };

    private handleWindowPointerUp = (event: PointerEvent) => {
        console.debug('[InventoryUI] pointerup event', { pointerId: event.pointerId, buttons: event.buttons });
        if (!this.dragPreview) {
            this.stopDragPreview();
            return;
        }
        if (this.dragPointerId !== null && event.pointerId !== this.dragPointerId) return;
        const stagePoint = this.clientToStagePoint(event) || this.lastDragStagePoint;
        if (!stagePoint) {
            this.stopDragPreview();
            return;
        }

        this.refreshDropZoneIndicator(stagePoint);
        this.handleDropAtPoint(stagePoint);

        this.stopDragPreview();
    };

    private handleWindowBlur = () => {
        if (this.dragPreview && this.lastDragStagePoint) {
            this.handleDropAtPoint(this.lastDragStagePoint);
        }
        this.stopDragPreview();
    };

    private clientToStagePoint(event: PointerEvent): Point | null {
        const canvas = document.querySelector('canvas');
        if (!canvas) return null;
        const rect = canvas.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return null;
        const dpr = window.devicePixelRatio || 1;
        const logicalWidth = canvas.width / dpr;
        const logicalHeight = canvas.height / dpr;
        const stageX = ((event.clientX - rect.left) / rect.width) * logicalWidth;
        const stageY = ((event.clientY - rect.top) / rect.height) * logicalHeight;
        return new Point(stageX, stageY);
    }

    private handleDropAtPoint(stagePoint: Point) {
        const previewSlot = (this.dragPreview as any)?.__sourceSlot ?? null;
        const dropSlot = this.pendingDropSlot ?? this.draggingGlobalSlot ?? this.lastDraggedSlot ?? previewSlot;
        const inside = this.isPointInsidePanel(stagePoint);

        console.log('[InventoryUI] checando zona de drop', { stagePoint, inside, slot: dropSlot });
        if (!inside && dropSlot !== null) {
            console.log(`[InventoryUI] drop fora da zona detectado no slot ${dropSlot}`);
            this.pendingDropSlot = null;
            this.onDrop?.(dropSlot);
            this.showMessage('🪂 Item dropado no chão!');
            this.lastDraggedSlot = null;
        }
    }

    private setDropZoneActive(active: boolean, stagePoint?: Point) {
        if (this.dropZoneActive === active) {
            if (active) {
                this.refreshDropZoneIndicator(stagePoint);
            }
            return;
        }

        this.dropZoneActive = active;
        if (!active) {
            this.dropZoneOverlay.visible = false;
            this.dropZoneOverlay.clear();
            return;
        }

        this.refreshDropZoneIndicator(stagePoint);
    }

    private refreshDropZoneIndicator(stagePoint?: Point) {
        if (!this.dropZoneActive) return;
        const bounds = this.mainPanel.getBounds();
        if (bounds.width === 0 || bounds.height === 0) {
            this.dropZoneOverlay.visible = false;
            return;
        }

        const padding = this.DROP_ZONE_PADDING;
        const pointerInside = stagePoint ? this.isPointInsidePanel(stagePoint) : true;
        const color = pointerInside ? this.PALETTE.buttonGreen : 0xff4444;
        this.dropZoneOverlay.clear();
        this.dropZoneOverlay
            .lineStyle(3, color, 0.85)
            .drawRoundedRect(bounds.x - padding, bounds.y - padding, bounds.width + padding * 2, bounds.height + padding * 2, 18);
        this.dropZoneOverlay.visible = true;
    }

    private isPointInsidePanel(stagePoint: Point): boolean {
        const bounds = this.mainPanel.getBounds();
        return (
            stagePoint.x >= bounds.x &&
            stagePoint.x <= bounds.x + bounds.width &&
            stagePoint.y >= bounds.y &&
            stagePoint.y <= bounds.y + bounds.height
        );
    }

    private getItemIcon(itemId: string): string {
        const iconMap: Record<string, string> = {
            gold: '💰',
            mat_ink: '🖋️',
            mat_blood: '🩸',
            mat_wolf_pelt: '🐺',
            potion_hp_small: '🧪',
            weapon_ink_blade: '⚔️',
            weapon_wolf_fang: '🗡️'
        };
        return iconMap[itemId] || '🟦';
    }

    private selectSlot(globalSlot: number) {
        // Desmarca slot anterior
        if (this.selectedSlot >= 0) {
            const prevPageSlot = this.selectedSlot % this.SLOTS_PER_PAGE;
            const prevContainer = this.slotContainers[prevPageSlot];
            if (prevContainer) {
                const bg = (prevContainer as any)._bg as Graphics;
                const size = (prevContainer as any)._size as number;
                const radius = (prevContainer as any)._radius as number;
                if (bg) {
                    bg.clear()
                        .roundRect(0, 0, size, size, radius)
                        .fill(this.PALETTE.slot)
                        .stroke({ width: 2, color: this.PALETTE.slotBorder });
                }
            }
        }

        // Marca novo slot
        this.selectedSlot = globalSlot;
        const pageSlot = globalSlot % this.SLOTS_PER_PAGE;
        const container = this.slotContainers[pageSlot];
        if (container) {
            const bg = (container as any)._bg as Graphics;
            const size = (container as any)._size as number;
            const radius = (container as any)._radius as number;
            if (bg) {
                bg.clear()
                    .roundRect(0, 0, size, size, radius)
                    .fill(this.PALETTE.slot)
                    .stroke({ width: 3, color: this.PALETTE.slotSelected });
            }
        }
    }

// ✅ NOVO: Método para mostrar mensagens temporárias
private showMessage(text: string) {
    const msg = new Text({
        text,
        style: { fontSize: 14, fill: 0xff4444, fontWeight: 'bold' }
    });
    msg.anchor.set(0.5);
    msg.position.set(this.PANEL_WIDTH / 2, 20);
    this.addChild(msg);

    setTimeout(() => {
        this.removeChild(msg);
        msg.destroy();
    }, 2000);
}

    public update(inv: InventoryState, equip: EquipmentState, gold: number, playerState?: PlayerState) {
        this.lastInvData = inv;
        this.totalSlots = inv.maxSlots || 100;

        // ⚡ ATUALIZAÇÃO EM TEMPO REAL DO PREVIEW
        if (playerState && this.visible) {
            // Detectar mudanças nos equipamentos reais (MapSchema)
            const equipIds: string[] = [];
            if (playerState.equipment?.equipped) {
                playerState.equipment.equipped.forEach((item: any) => {
                    equipIds.push(item.itemId);
                });
            }
            const currentEquipIds = equipIds.sort().join(',');
            const lastEquipIds = (this as any)._lastEquipIds || '';
            const equipmentChanged = currentEquipIds !== lastEquipIds;

            const bodyColorChanged = playerState.bodyColor !== (this as any)._lastBodyColor;

            // Debug: primeiro update
            if (!this.playerRenderer) {
                console.log('[InventoryUI] 🎮 Conectando com personagem real:', {
                    username: playerState.username,
                    classType: playerState.classType,
                    bodyColor: playerState.bodyColor,
                    equippedItems: equipIds.length
                });
            }

            // 🔍 DEBUG: Mostrar quando equipamentos mudam
            if (equipmentChanged && this.playerRenderer) {
                console.log('[InventoryUI] ⚡ EQUIPAMENTOS MUDARAM!', {
                    antes: lastEquipIds,
                    agora: currentEquipIds
                });
            }

            // Atualizar em qualquer mudança OU se não existe preview
            if (equipmentChanged || bodyColorChanged || !this.playerRenderer) {
                console.log('[InventoryUI] 🔄 RECRIANDO PREVIEW!', {
                    motivo: equipmentChanged ? 'equipamentos mudaram' : bodyColorChanged ? 'cor mudou' : 'primeiro render'
                });
                this.updatePlayerPreview(playerState);
                (this as any)._lastEquipIds = currentEquipIds;
                (this as any)._lastBodyColor = playerState.bodyColor;
            }
        } else if (!playerState) {
            console.warn('[InventoryUI] ⚠️ PlayerState não foi fornecido!');
        }

        // Atualizar slots do inventário (apenas da página atual)
        const startSlot = this.currentPage * this.SLOTS_PER_PAGE;

        this.slotContainers.forEach((container, i) => {
            const globalSlot = startSlot + i;
            if (container.children.length > 2) container.removeChildren(2);

            const slot = inv.slots.get(globalSlot.toString());
            if (slot && globalSlot < this.totalSlots) {
                this.renderIconInSlot(container, slot.itemId, slot.quantity);
            } else {
                // 🎨 Resetar borda para slots vazios
                this.resetSlotAppearance(container);
            }
        });

        // Atualizar equipamentos
        this.equipmentSlots.forEach((container, slotName) => {
            if (container.children.length > 2) container.removeChildren(2);

            const item = equip.equipped.get(slotName);

            if (item) {
                this.renderIconInSlot(container, item.itemId);

                // 🌟 Adicionar glow ao item equipado
                this.addEquipmentGlow(container);

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


    private async updatePlayerPreview(playerState: PlayerState) {
        try {
            // Remover preview anterior se existir
            if (this.playerRenderer) {
                console.log('[InventoryUI] 🗑️ Removendo preview anterior');
                try {
                    this.playerPreview.removeChild(this.playerRenderer);
                } catch (e) {
                    // Pode não estar adicionado
                }
                this.playerRenderer.destroy({ children: true });
                this.playerRenderer = undefined;
            }

            console.log('[InventoryUI] 🎨 Criando CÓPIA EXATA do personagem real:', {
                scale: this.PREVIEW_SCALE,
                username: playerState.username,
                classType: playerState.classType,
                bodyColor: playerState.bodyColor
            });

            // ⭐ CRIAR PREVIEW USANDO A MESMA CLASSE DO PERSONAGEM REAL
            this.playerRenderer = new Player(playerState, false);

            // ⚙️ APLICAR ESCALA (ajuste em PREVIEW_SCALE linha ~70)
            this.playerRenderer.scale.set(this.PREVIEW_SCALE);

            // Centralizar no container
            this.playerRenderer.position.set(0, 10);

            // ⏳ AGUARDAR sprites carregarem (Player é assíncrono)
            console.log('[InventoryUI] ⏳ Aguardando sprites carregarem...');
            await new Promise(resolve => setTimeout(resolve, 300));

            // 🧹 OCULTAR ELEMENTOS DE UI (manter para que Player não quebre)
            // Estrutura do Player: [shadow, visualContainer, hpBar, nameLabel, levelLabel, highlight?]
            // Mantemos tudo, mas deixamos invisível para não aparecer visualmente
            // @ts-ignore - acessando children
            for (let i = 2; i < this.playerRenderer.children.length; i++) {
                const child = this.playerRenderer.children[i];
                if (child) {
                    child.visible = false; // Apenas ocultar, não destruir
                }
            }

            // 🎯 CONGELAR preview (desabilitar update e animações para não afetar FPS)
            // @ts-ignore - sobrescrever método público update
            this.playerRenderer.update = () => {}; // Desabilitar update

            // Adicionar ao preview
            this.playerPreview.addChild(this.playerRenderer);

            console.log('[InventoryUI] ✅ Preview criado! É uma CÓPIA EXATA do personagem no mapa');
        } catch (error) {
            console.error('[InventoryUI] ❌ Erro ao criar preview:', error);
        }
    }

    public setPage(page: number) {
        const totalPages = Math.ceil(this.totalSlots / this.SLOTS_PER_PAGE);
        this.currentPage = Math.max(0, Math.min(page, totalPages - 1));

        if (this.lastInvData) {
            // Re-render apenas os slots do inventário
            const startSlot = this.currentPage * this.SLOTS_PER_PAGE;
            this.slotContainers.forEach((container, i) => {
                const globalSlot = startSlot + i;
                if (container.children.length > 2) container.removeChildren(2);

                const slot = this.lastInvData!.slots.get(globalSlot.toString());
                if (slot && globalSlot < this.totalSlots) {
                    this.renderIconInSlot(container, slot.itemId, slot.quantity);
                }
            });
        }
    }

    public nextPage() {
        const totalPages = Math.ceil(this.totalSlots / this.SLOTS_PER_PAGE);
        if (this.currentPage < totalPages - 1) {
            this.setPage(this.currentPage + 1);
        }
    }

    public prevPage() {
        if (this.currentPage > 0) {
            this.setPage(this.currentPage - 1);
        }
    }

    private resetSlotAppearance(container: Container) {
        // 🎨 Resetar slot vazio para aparência padrão
        const size = (container as any)._size || this.SLOT_SIZE;
        const radius = (container as any)._radius || 6;
        const bg = (container as any)._bg as Graphics;

        if (bg) {
            bg.clear()
                .roundRect(0, 0, size, size, radius)
                .fill(0xfdfbf7) // Branco mais quente
                .stroke({ width: 2.5, color: 0xa89968 }); // Borda padrão
        }
    }

    private renderIconInSlot(container: Container, itemId: string, qty?: number) {
        const size = (container as any)._size || this.SLOT_SIZE;
        const template = ItemRegistry.getTemplate(itemId);

        // 🎨 Cores de rarity para borda do slot
        const rarityColors: Record<string, number> = {
            'common': 0xb0b0b0,      // Cinza
            'uncommon': 0x1eff00,    // Verde
            'rare': 0x0070dd,        // Azul
            'epic': 0xa335ee,        // Roxo
            'legendary': 0xff8000,   // Laranja
            'artifact': 0xe6cc80,    // Dourado
        };

        // 🎨 Obter cor baseada em rarity
        const rarity = template?.rarity || 'common';
        const rarityColor = rarityColors[rarity.toLowerCase()] || 0xb0b0b0;

        // 🎨 Adicionar borda colorida de rarity (modificar a borda do background)
        const bg = (container as any)._bg as Graphics;
        if (bg) {
            const radius = (container as any)._radius || 6;
            bg.clear()
                .roundRect(0, 0, size, size, radius)
                .fill(0xfffef9) // Fundo mais claro para itens
                .stroke({ width: 3.5, color: rarityColor }); // Borda colorida por rarity
        }

        // TODO: Carregar sprite real do item quando disponível
        const icon = new Text({ text: '📦', style: { fontSize: size * 0.5 } });
        icon.anchor.set(0.5);
        icon.position.set(size / 2, size / 2);
        container.addChild(icon);

        // 🎨 Quantidade no canto inferior direito
        if (qty && qty > 1) {
            const t = new Text({
                text: qty.toString(),
                style: {
                    fontSize: size * 0.28,
                    fill: 0xffffff,
                    stroke: { color: 0x000000, width: 2.5 },
                    fontWeight: 'bold'
                }
            });
            t.anchor.set(1, 1);
            t.position.set(size - size * 0.15, size - size * 0.15);
            container.addChild(t);
        }

        // 🎨 Indicador visual de rarity (pequeno ícone no canto)
        const rarityIndicators: Record<string, string> = {
            'common': '•',
            'uncommon': '◆',
            'rare': '✦',
            'epic': '★',
            'legendary': '⬢',
            'artifact': '◎',
        };
        const indicator = new Text({
            text: rarityIndicators[rarity.toLowerCase()] || '•',
            style: {
                fontSize: size * 0.35,
                fill: rarityColor,
                fontWeight: 'bold'
            }
        });
        indicator.anchor.set(0, 0);
        indicator.position.set(size * 0.08, size * 0.08);
        container.addChild(indicator);
    }

    public toggle() {
        this.visible = !this.visible;
        if (this.visible) {
            this.resize();
            // 🔄 Forçar atualização do preview quando abrir
            (this as any)._lastEquipIds = null;
            (this as any)._lastBodyColor = null;
            console.log('[InventoryUI] 📂 Inventory aberto - preview será atualizado no próximo update()');
        } else {
            console.log('[InventoryUI] 📁 Inventory fechado');
        }
    }

    public close() {
        this.visible = false;
    }

    public updateBreathAnimation(deltaTime: number) {
        // ⚠️ DESABILITADO: Estava causando oscilação de FPS
        // A classe Player já tem sua própria animação idle
        return;
    }

    public forceUpdatePreview(playerState: PlayerState) {
        console.log('[InventoryUI] 🔄 FORÇANDO atualização do preview');
        (this as any)._lastEquipIds = null;
        this.updatePlayerPreview(playerState);
    }

    public applyConfig(config: { anchor?: string; offsetX?: number; offsetY?: number; scale?: number } | null) {
        if (!config) return;
        this.layoutConfig = {
            anchor: config.anchor,
            offsetX: config.offsetX,
            offsetY: config.offsetY,
            scale: config.scale
        };
        this.uiConfig = config as any;
        this.elementOverrides = ((config as any).elementOverrides || {}) as Record<string, any>;
        this.uiStyles = ((config as any).styles || {}) as any;
        this.applyStylesFromConfig();
        this.applyElementOverrides();
        this.resize();
    }

    public resize() {
        const anchor = this.layoutConfig?.anchor || 'center';
        const offsetX = this.layoutConfig?.offsetX ?? 0;
        const offsetY = this.layoutConfig?.offsetY ?? 0;
        const scale = this.layoutConfig?.scale ?? 1;
        this.scale.set(scale);

        const width = this.PANEL_WIDTH * scale;
        const height = this.PANEL_HEIGHT * scale;
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;
        let x = 0;
        let y = 0;

        switch (anchor) {
            case 'top-left':
                x = 0; y = 0;
                break;
            case 'top-center':
                x = (screenWidth - width) / 2;
                y = 0;
                break;
            case 'top-right':
                x = screenWidth - width;
                y = 0;
                break;
            case 'center-left':
                x = 0;
                y = (screenHeight - height) / 2;
                break;
            case 'center':
                x = (screenWidth - width) / 2;
                y = (screenHeight - height) / 2;
                break;
            case 'center-right':
                x = screenWidth - width;
                y = (screenHeight - height) / 2;
                break;
            case 'bottom-left':
                x = 0;
                y = screenHeight - height;
                break;
            case 'bottom-center':
                x = (screenWidth - width) / 2;
                y = screenHeight - height;
                break;
            case 'bottom-right':
                x = screenWidth - width;
                y = screenHeight - height;
                break;
            default:
                x = (screenWidth - width) / 2;
                y = (screenHeight - height) / 2;
                break;
        }

        this.position.set(x + offsetX, y + offsetY);
    }

    // 🎯 Carregar posições salvas do UIAdjustments
    public loadSavedPositions() {
        // If inventory UI is configured via DB, ignore legacy UIAdjustments to avoid drift/conflicts.
        if (this.uiConfig && this.elementOverrides && Object.keys(this.elementOverrides).length > 0) {
            return;
        }
        uiAdjustments.adjustments.forEach((adj: any) => {
            if (adj.slot && adj.position) {
                const slot = this.equipmentSlots.get(adj.slot);
                if (slot) {
                    slot.position.set(adj.position.x, adj.position.y);
                    if (adj.scale) {
                        slot.scale.set(adj.scale.x, adj.scale.y);
                    }
                    console.log(`[InventoryUI] Slot ${adj.slot} restaurado para:`, adj.position);
                }
            }
        });
    }

    public applySlotAdjustments(adjustments: Record<string, { x?: number; y?: number; scaleX?: number; scaleY?: number }>) {
        // Aplicar ajustes aos slots de equipamento pelo identificador (HEAD, WEAPON, etc)
        Object.entries(adjustments).forEach(([slotId, adj]) => {
            // Verificar se é um slot de equipamento
            if (this.equipmentSlots.has(slotId)) {
                const slot = this.equipmentSlots.get(slotId);
                if (slot) {
                    if (adj.x !== undefined || adj.y !== undefined) {
                        slot.position.set(adj.x ?? slot.x, adj.y ?? slot.y);
                    }
                    if (adj.scaleX !== undefined || adj.scaleY !== undefined) {
                        slot.scale.set(adj.scaleX ?? slot.scale.x, adj.scaleY ?? slot.scale.y);
                    }
                }
            }
            // Slots de inventário (por índice numérico)
            else if (!isNaN(Number(slotId))) {
                const slotIndex = Number(slotId);
                if (slotIndex < this.slotContainers.length) {
                    const slot = this.slotContainers[slotIndex];
                    if (slot) {
                        if (adj.x !== undefined || adj.y !== undefined) {
                            slot.position.set(adj.x ?? slot.x, adj.y ?? slot.y);
                        }
                        if (adj.scaleX !== undefined || adj.scaleY !== undefined) {
                            slot.scale.set(adj.scaleX ?? slot.scale.x, adj.scaleY ?? slot.scale.y);
                        }
                    }
                }
            }
        });
    }

    private parseTint(value: any): number | null {
        if (typeof value !== 'string') return null;
        const v = value.trim();
        if (!v) return null;
        const hex = v.startsWith('#') ? v.slice(1) : v.startsWith('0x') ? v.slice(2) : v;
        const n = Number.parseInt(hex, 16);
        return Number.isFinite(n) ? n : null;
    }

    private applyOverride(target: any, id: string) {
        const ov = this.elementOverrides?.[id];
        if (!ov || !target) return;
        if (ov.enabled === false) {
            target.visible = false;
            return;
        }
        target.visible = true;
        if (typeof ov.x === 'number') target.x = ov.x;
        if (typeof ov.y === 'number') target.y = ov.y;
        if (typeof ov.scale === 'number' && target.scale?.set) target.scale.set(ov.scale);
        if (typeof ov.alpha === 'number') target.alpha = ov.alpha;
        if (typeof ov.width === 'number') target.width = ov.width;
        if (typeof ov.height === 'number') target.height = ov.height;
        const tint = this.parseTint(ov.tint);
        if (tint !== null && 'tint' in target) (target as any).tint = tint;
    }

    private applyTextOverride(text: Text | undefined, id: string) {
        if (!text) return;
        this.applyOverride(text, id);
        const ov = this.elementOverrides?.[id];
        if (!ov) return;
        if (typeof ov.fontSize === 'number') (text.style as any).fontSize = ov.fontSize;
        if (typeof ov.fill === 'string') (text.style as any).fill = ov.fill;
        if (typeof ov.fontFamily === 'string') (text.style as any).fontFamily = ov.fontFamily;
    }

    private applyStylesFromConfig() {
        const styles = this.uiStyles || {};
        const textColor = typeof styles.textColor === 'string' ? styles.textColor : null;
        const fontFamily = typeof styles.fontFamily === 'string' ? styles.fontFamily : null;

        const applyTextStyle = (t?: Text) => {
            if (!t) return;
            if (textColor) (t.style as any).fill = textColor;
            if (fontFamily) (t.style as any).fontFamily = fontFamily;
        };

        applyTextStyle(this.equipmentTitle);
        applyTextStyle(this.inventoryTitle);
        applyTextStyle(this.pageText);
        this.equipmentLabels.forEach((lbl) => applyTextStyle(lbl));
    }

    private applyElementOverrides() {
        // High-level panel pieces
        this.applyOverride(this.background, 'panel');
        this.applyOverride(this.mainPanel, 'mainPanel');
        if (this.equipmentBg) this.applyOverride(this.equipmentBg, 'equipmentPanel');
        if (this.inventoryBg) this.applyOverride(this.inventoryBg, 'inventoryPanel');

        // Titles / groups
        this.applyTextOverride(this.equipmentTitle, 'equipmentTitle');
        this.applyTextOverride(this.inventoryTitle, 'inventoryTitle');
        this.applyOverride(this.playerPreview, 'playerPreview');
        this.applyOverride(this.equipmentContainer, 'equipmentContainer');
        this.applyOverride(this.inventoryGrid, 'inventoryGrid');
        this.applyTextOverride(this.pageText, 'pageText');

        // Buttons / overlay
        this.applyOverride(this.trashIcon, 'trashIcon');
        this.applyOverride(this.sortButton, 'sortButton');
        this.applyOverride(this.closeButton, 'closeButton');
        this.applyOverride(this.dropZoneOverlay, 'dropZoneOverlay');

        // Equipment slots and labels
        this.equipmentSlots.forEach((slot, slotName) => {
            this.applyOverride(slot, `equipSlot:${slotName}`);
        });
        this.equipmentLabels.forEach((label, slotName) => {
            this.applyTextOverride(label, `equipLabel:${slotName}`);
        });
    }

    /**
     * Adicionar glow visual ao item equipado
     */
    private addEquipmentGlow(container: Container) {
        // Remover glow anterior se existir
        const existingGlow = container.children.find((child: any) => child.__isEquipmentGlow);
        if (existingGlow) {
            container.removeChild(existingGlow);
            existingGlow.destroy();
        }

        // Criar círculo de glow
        const glow = new Graphics();
        glow.circle(this.SLOT_SIZE / 2, this.SLOT_SIZE / 2, this.SLOT_SIZE / 2 + 5);
        glow.stroke({ color: 0xFFFF00, width: 2, alpha: 0.6 });
        glow.zIndex = 0;
        (glow as any).__isEquipmentGlow = true;
        container.addChildAt(glow, 0);

        // Animar: pulsing effect (transparência oscila)
        let glowAlpha = 0.6;
        let glowDirection = 1;
        const pulseInterval = setInterval(() => {
            glowAlpha += glowDirection * 0.08;
            if (glowAlpha >= 1) glowDirection = -1;
            if (glowAlpha <= 0.3) glowDirection = 1;

            if (glow && glow.parent) {
                glow.alpha = glowAlpha;
            } else {
                clearInterval(pulseInterval);
            }
        }, 50);
    }
}
