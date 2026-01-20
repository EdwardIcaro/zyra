import { Container, Graphics, Text, TextStyle } from 'pixi.js';

type CharacterSummary = {
  id: number;
  char_name: string;
  class_type: string;
  level: number;
};

type ClassSummary = {
  class_type: string;
  display_name?: string;
  description?: string;
  is_ranged?: boolean;
};

type LoginData = {
  exists: boolean;
  accountId: number;
  characters: CharacterSummary[];
};

export class LoginScene extends Container {
  private statusText: Text;

  private accountInput: HTMLInputElement | null = null;
  private rememberMeCheckbox: HTMLInputElement | null = null;
  private rememberMeLabel: HTMLLabelElement | null = null;
  private charNameInput: HTMLInputElement | null = null;

  private accountId: number | null = null;
  private accountUsername: string | null = null;
  private characters: CharacterSummary[] = [];

  private activeClasses: ClassSummary[] = [];
  private selectedClassType: string | null = null;

  private accountUI = new Container();
  private characterSelectUI = new Container();
  private createUI = new Container();

  private lastCardClickAt = new Map<string, number>();

  constructor(
    private onPlayCharacter: (data: { charId: number; charName: string; class: string; isNew: boolean }) => void,
    private onCreateCharacter: (data: { accountId: number; accountUsername: string; charName: string; classType: string }) => void
  ) {
    super();
    this.setupUI();
  }

  private setupUI() {
    this.eventMode = 'static';
    this.cursor = 'default';

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
      text: 'Sign in to manage your characters',
      style: { fill: '#aaaaaa', fontSize: 18 }
    });
    this.statusText.anchor.set(0.5);
    this.statusText.x = window.innerWidth / 2;
    this.statusText.y = 250;
    this.addChild(this.statusText);

    this.addChild(this.accountUI);
    this.addChild(this.characterSelectUI);
    this.addChild(this.createUI);

    this.buildAccountUI();
    this.buildCharacterSelectUI();
    this.buildCreateUI();
    this.showAccountUI();
  }

  private buildAccountUI() {
    this.accountUI.removeChildren();

    const label = new Text({ text: 'Account', style: { fill: 0xffffff, fontSize: 18, fontWeight: 'bold' } });
    label.anchor.set(0.5);
    label.position.set(window.innerWidth / 2, 310);
    this.accountUI.addChild(label);

    this.accountInput = this.createHtmlInput('Account name', window.innerWidth / 2 - 180, 340, 360);
    this.accountInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') void this.handleAccountLogin();
    });

    const rememberX = window.innerWidth / 2 - 180;
    const rememberY = 385;
    const remember = this.createHtmlCheckbox(rememberX, rememberY, 'Remember me');
    this.rememberMeCheckbox = remember.checkbox;
    this.rememberMeLabel = remember.label;

    try {
      const savedRemember = localStorage.getItem('zyra.rememberMe') === '1';
      const savedUser = localStorage.getItem('zyra.accountUsername') || '';
      if (this.rememberMeCheckbox) this.rememberMeCheckbox.checked = savedRemember;
      if (this.accountInput && savedRemember && savedUser) this.accountInput.value = savedUser;
    } catch {
      // ignore
    }

    const enterBtn = this.createButton('ENTER', 400, () => this.handleAccountLogin());
    this.accountUI.addChild(enterBtn);
  }

  private buildCharacterSelectUI() {
    this.characterSelectUI.removeChildren();

    const title = new Text({ text: 'Your Characters', style: { fill: 0xffffff, fontSize: 22, fontWeight: 'bold' } });
    title.anchor.set(0.5);
    title.position.set(window.innerWidth / 2, 290);
    this.characterSelectUI.addChild(title);

    const backBtn = this.createSmallButton('Back', 20, 20, () => this.showAccountUI());
    this.characterSelectUI.addChild(backBtn);
  }

  private buildCreateUI() {
    this.createUI.removeChildren();

    const title = new Text({ text: 'Create Character', style: { fill: 0xffffff, fontSize: 22, fontWeight: 'bold' } });
    title.anchor.set(0.5);
    title.position.set(window.innerWidth / 2, 290);
    this.createUI.addChild(title);

    const backBtn = this.createSmallButton('Back', 20, 20, () => this.showCharacterSelectUI());
    this.createUI.addChild(backBtn);

    const nameLabel = new Text({ text: 'Character Name (required)', style: { fill: 0xffffff, fontSize: 16 } });
    nameLabel.anchor.set(0.5);
    nameLabel.position.set(window.innerWidth / 2, 330);
    this.createUI.addChild(nameLabel);

    this.charNameInput = this.createHtmlInput('Type your character name', window.innerWidth / 2 - 180, 355, 360);

    const classesTitle = new Text({ text: 'Choose a Class', style: { fill: 0xffffff, fontSize: 18, fontWeight: 'bold' } });
    classesTitle.anchor.set(0.5);
    classesTitle.position.set(window.innerWidth / 2, 415);
    this.createUI.addChild(classesTitle);

    const createBtn = this.createButton('CUSTOMIZE & CREATE', 650, () => this.submitCreate());
    this.createUI.addChild(createBtn);
  }

  private showAccountUI() {
    this.statusText.text = 'Sign in to manage your characters';
    this.accountUI.visible = true;
    this.characterSelectUI.visible = false;
    this.createUI.visible = false;
    this.selectedClassType = null;

    if (this.accountInput) this.accountInput.style.display = 'block';
    if (this.rememberMeCheckbox) this.rememberMeCheckbox.style.display = 'block';
    if (this.rememberMeLabel) this.rememberMeLabel.style.display = 'block';
    if (this.charNameInput) this.charNameInput.style.display = 'none';
  }

  private showCharacterSelectUI() {
    this.statusText.text = this.accountUsername ? `Account: ${this.accountUsername}` : 'Your Characters';
    this.accountUI.visible = false;
    this.characterSelectUI.visible = true;
    this.createUI.visible = false;

    if (this.accountInput) this.accountInput.style.display = 'none';
    if (this.rememberMeCheckbox) this.rememberMeCheckbox.style.display = 'none';
    if (this.rememberMeLabel) this.rememberMeLabel.style.display = 'none';
    if (this.charNameInput) this.charNameInput.style.display = 'none';

    this.renderCharacterCards();
  }

  private showCreateUI(errorText?: string) {
    this.statusText.text = errorText || 'Create a new character';
    this.accountUI.visible = false;
    this.characterSelectUI.visible = false;
    this.createUI.visible = true;

    if (this.accountInput) this.accountInput.style.display = 'none';
    if (this.rememberMeCheckbox) this.rememberMeCheckbox.style.display = 'none';
    if (this.rememberMeLabel) this.rememberMeLabel.style.display = 'none';
    if (this.charNameInput) this.charNameInput.style.display = 'block';

    void this.loadActiveClassesForCreate();
  }

  private async handleAccountLogin() {
    const username = (this.accountInput?.value || '').trim();
    if (!username) {
      this.statusText.text = 'Please enter an account name.';
      return;
    }

    try {
      const res = await fetch('http://localhost:2567/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
      });
      const data = (await res.json()) as LoginData;

      this.accountId = data.accountId;
      this.accountUsername = username;
      this.characters = Array.isArray(data.characters) ? data.characters : [];

      try {
        const remember = this.rememberMeCheckbox?.checked === true;
        if (remember) {
          localStorage.setItem('zyra.rememberMe', '1');
          localStorage.setItem('zyra.accountUsername', username);
        } else {
          localStorage.removeItem('zyra.rememberMe');
          localStorage.removeItem('zyra.accountUsername');
        }
      } catch {
        // ignore
      }

      this.showCharacterSelectUI();
    } catch (err) {
      console.error(err);
      this.statusText.text = 'Failed to connect. Try again.';
    }
  }

  private renderCharacterCards() {
    if (this.characterSelectUI.children.length < 2) {
      this.buildCharacterSelectUI();
    } else {
      while (this.characterSelectUI.children.length > 2) {
        this.characterSelectUI.removeChildAt(2);
      }
    }

    const cards = this.characters.slice(0, 3);
    const cardWidth = 260;
    const gap = 26;
    const totalWidth = cards.length > 0 ? cards.length * cardWidth + (cards.length - 1) * gap : cardWidth;
    let startX = window.innerWidth / 2 - totalWidth / 2;

    cards.forEach((c) => {
      const card = this.createCharacterCard(c, startX, 350);
      this.characterSelectUI.addChild(card);
      startX += cardWidth + gap;
    });

    const createCard = this.createCreateNewCard(window.innerWidth / 2 - 130, 560);
    this.characterSelectUI.addChild(createCard);
  }

  private createCharacterCard(char: CharacterSummary, x: number, y: number) {
    const container = new Container();
    container.position.set(x, y);
    container.eventMode = 'static';
    container.cursor = 'pointer';

    const bg = new Graphics()
      .roundRect(0, 0, 260, 160, 10)
      .fill(0x1f1f1f)
      .stroke({ width: 2, color: 0x333333 });
    container.addChild(bg);

    const nameText = new Text({ text: char.char_name, style: { fill: 0xffffff, fontSize: 20, fontWeight: 'bold' } });
    nameText.anchor.set(0.5, 0);
    nameText.position.set(130, 12);
    container.addChild(nameText);

    const infoText = new Text({
      text: `Class: ${char.class_type}\nLevel: ${char.level}`,
      style: { fill: 0xcccccc, fontSize: 14 }
    });
    infoText.anchor.set(0.5, 0);
    infoText.position.set(130, 52);
    container.addChild(infoText);

    const playBtn = this.createSmallButton('Play', 90, 118, () => {
      this.animateCard(container);
      this.onPlayCharacter({ charId: char.id, charName: char.char_name, class: char.class_type, isNew: false });
    });
    container.addChild(playBtn);

    container.on('pointerdown', () => {
      const key = `char:${char.id}`;
      const now = Date.now();
      const last = this.lastCardClickAt.get(key) || 0;
      this.lastCardClickAt.set(key, now);

      if (now - last <= 350) {
        this.animateCard(container);
        this.onPlayCharacter({ charId: char.id, charName: char.char_name, class: char.class_type, isNew: false });
        return;
      }
      this.animateCard(container, 0.06);
    });

    return container;
  }

  private createCreateNewCard(x: number, y: number) {
    const container = new Container();
    container.position.set(x, y);
    container.eventMode = 'static';
    container.cursor = 'pointer';

    const bg = new Graphics()
      .roundRect(0, 0, 260, 70, 10)
      .fill(0x2a2a2a)
      .stroke({ width: 2, color: 0x333333 });
    container.addChild(bg);

    const text = new Text({ text: '+ Create New Character', style: { fill: 0xffffff, fontSize: 18, fontWeight: 'bold' } });
    text.anchor.set(0.5);
    text.position.set(130, 35);
    container.addChild(text);

    container.on('pointerdown', () => {
      this.animateCard(container, 0.05);
      this.showCreateUI();
    });

    return container;
  }

  private async loadActiveClassesForCreate() {
    this.activeClasses = await this.loadActiveClasses();
    if (!this.selectedClassType && this.activeClasses[0]) this.selectedClassType = this.activeClasses[0].class_type;
    this.renderClassCards();
  }

  private renderClassCards() {
    const keepCount = 4; // title + back + name label + create button
    while (this.createUI.children.length > keepCount) {
      this.createUI.removeChildAt(keepCount);
    }

    const classes = this.activeClasses.slice(0, 6);
    const cardWidth = 260;
    const cardHeight = 90;
    const gap = 18;
    const cols = 2;
    const startX = window.innerWidth / 2 - (cols * cardWidth + gap) / 2;
    const startY = 440;

    classes.forEach((c, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const cx = startX + col * (cardWidth + gap);
      const cy = startY + row * (cardHeight + gap);

      const card = new Container();
      card.position.set(cx, cy);
      card.eventMode = 'static';
      card.cursor = 'pointer';

      const isSelected = this.selectedClassType === c.class_type;
      const bg = new Graphics()
        .roundRect(0, 0, cardWidth, cardHeight, 10)
        .fill(isSelected ? 0x2f3b5c : 0x1f1f1f)
        .stroke({ width: isSelected ? 3 : 2, color: isSelected ? 0x4a90e2 : 0x333333 });
      card.addChild(bg);

      const name = c.display_name || c.class_type;
      const t1 = new Text({ text: name, style: { fill: 0xffffff, fontSize: 18, fontWeight: 'bold' } });
      t1.anchor.set(0, 0);
      t1.position.set(12, 10);
      card.addChild(t1);

      const t2 = new Text({ text: c.description || c.class_type, style: { fill: 0xcccccc, fontSize: 12 } });
      t2.anchor.set(0, 0);
      t2.position.set(12, 40);
      card.addChild(t2);

      card.on('pointerdown', () => {
        this.selectedClassType = c.class_type;
        this.animateCard(card, 0.05);
        this.renderClassCards();
      });

      this.createUI.addChild(card);
    });
  }

  private submitCreate() {
    if (!this.accountId || !this.accountUsername) {
      this.showAccountUI();
      return;
    }
    const name = (this.charNameInput?.value || '').trim();
    if (!name) {
      this.statusText.text = 'Character name is required.';
      return;
    }
    if (!this.selectedClassType) {
      this.statusText.text = 'Please select a class.';
      return;
    }

    this.animateCard(this.createUI, 0.02);
    this.onCreateCharacter({ accountId: this.accountId, accountUsername: this.accountUsername, charName: name, classType: this.selectedClassType });
  }

  showCreateError(message: string) {
    this.showCreateUI(message);
  }

  setCreatePrefill(charName: string, classType: string) {
    if (this.charNameInput) this.charNameInput.value = charName;
    this.selectedClassType = classType;
    this.renderClassCards();
  }

  setAccountContext(accountId: number, accountUsername: string) {
    this.accountId = accountId;
    this.accountUsername = accountUsername;
  }

  private createButton(label: string, y: number, action: () => void): Container {
    const container = new Container();
    const g = new Graphics().roundRect(0, 0, 260, 50, 10).fill(0x4a90e2);
    const t = new Text({ text: label, style: { fill: 0xffffff, fontSize: 18, fontWeight: 'bold' } });
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

  private createSmallButton(label: string, x: number, y: number, action: () => void): Container {
    const container = new Container();
    const g = new Graphics().roundRect(0, 0, 80, 30, 8).fill(0x4a90e2);
    const t = new Text({ text: label, style: { fill: 0xffffff, fontSize: 14, fontWeight: 'bold' } });
    t.anchor.set(0.5);
    t.x = 40;
    t.y = 15;
    container.addChild(g, t);
    container.x = x;
    container.y = y;
    container.eventMode = 'static';
    container.cursor = 'pointer';
    container.on('pointerdown', action);
    return container;
  }

  private animateCard(container: Container, intensity = 0.08) {
    const start = container.scale.x || 1;
    container.scale.set(start + intensity);
    setTimeout(() => container.scale.set(start), 120);
  }

  private createHtmlInput(placeholder: string, x: number, y: number, width: number): HTMLInputElement {
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = placeholder;
    input.autocomplete = 'off';
    input.style.position = 'absolute';
    input.style.zIndex = '9999';
    input.style.pointerEvents = 'auto';
    input.style.left = `${x}px`;
    input.style.top = `${y}px`;
    input.style.width = `${width}px`;
    input.style.height = '36px';
    input.style.padding = '6px 10px';
    input.style.borderRadius = '8px';
    input.style.border = '1px solid #333';
    input.style.background = '#2a2a2a';
    input.style.color = '#fff';
    input.style.fontSize = '16px';
    input.style.outline = 'none';
    document.body.appendChild(input);
    return input;
  }

  private createHtmlCheckbox(x: number, y: number, text: string): { checkbox: HTMLInputElement; label: HTMLLabelElement } {
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.style.position = 'absolute';
    checkbox.style.zIndex = '9999';
    checkbox.style.pointerEvents = 'auto';
    checkbox.style.left = `${x}px`;
    checkbox.style.top = `${y}px`;
    checkbox.style.width = '18px';
    checkbox.style.height = '18px';
    checkbox.style.accentColor = '#4a90e2';

    const label = document.createElement('label');
    label.textContent = text;
    label.style.position = 'absolute';
    label.style.zIndex = '9999';
    label.style.pointerEvents = 'auto';
    label.style.left = `${x + 26}px`;
    label.style.top = `${y - 2}px`;
    label.style.color = '#cccccc';
    label.style.fontSize = '14px';
    label.style.userSelect = 'none';
    label.style.cursor = 'pointer';
    label.onclick = () => {
      checkbox.checked = !checkbox.checked;
    };

    document.body.appendChild(checkbox);
    document.body.appendChild(label);
    return { checkbox, label };
  }

  private removeAllInputs() {
    if (this.accountInput && this.accountInput.parentElement) this.accountInput.parentElement.removeChild(this.accountInput);
    if (this.rememberMeCheckbox && this.rememberMeCheckbox.parentElement) this.rememberMeCheckbox.parentElement.removeChild(this.rememberMeCheckbox);
    if (this.rememberMeLabel && this.rememberMeLabel.parentElement) this.rememberMeLabel.parentElement.removeChild(this.rememberMeLabel);
    if (this.charNameInput && this.charNameInput.parentElement) this.charNameInput.parentElement.removeChild(this.charNameInput);
    this.accountInput = null;
    this.rememberMeCheckbox = null;
    this.rememberMeLabel = null;
    this.charNameInput = null;
  }

  cleanup() {
    this.removeAllInputs();
  }

  onResize() {
    const accountValue = this.accountInput?.value || '';
    const rememberChecked = this.rememberMeCheckbox?.checked === true;
    const charValue = this.charNameInput?.value || '';
    const accountVisible = this.accountInput?.style.display !== 'none';
    const charVisible = this.charNameInput?.style.display !== 'none';

    this.removeAllInputs();

    if (this.accountUI.visible) this.buildAccountUI();
    if (this.createUI.visible) this.buildCreateUI();

    if (this.accountInput) {
      this.accountInput.value = accountValue;
      this.accountInput.style.display = accountVisible ? 'block' : 'none';
    }
    if (this.rememberMeCheckbox) {
      this.rememberMeCheckbox.checked = rememberChecked;
      this.rememberMeCheckbox.style.display = accountVisible ? 'block' : 'none';
    }
    if (this.rememberMeLabel) {
      this.rememberMeLabel.style.display = accountVisible ? 'block' : 'none';
    }
    if (this.charNameInput) {
      this.charNameInput.value = charValue;
      this.charNameInput.style.display = charVisible ? 'block' : 'none';
    }

    if (this.characterSelectUI.visible) this.renderCharacterCards();
  }

  private async loadActiveClasses(): Promise<ClassSummary[]> {
    try {
      const res = await fetch('http://localhost:2567/api/classes');
      if (!res.ok) return [{ class_type: 'warrior' }];
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) return data;
    } catch (_e) {
      // ignore
    }
    return [{ class_type: 'warrior' }];
  }
}
