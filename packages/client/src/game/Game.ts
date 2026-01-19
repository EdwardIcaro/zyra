import { Application, Container } from 'pixi.js';
import { LoginScene } from '../scenes/LoginScene';
import { CombatScene } from '../scenes/CombatScene';
import { NetworkManager } from './NetworkManager';
import { UIManager } from '../ui/UIManager';
import { CharacterCustomizationScreen } from '../screens/CharacterCustomizationScreen';

export class Game {
  private app: Application;
  private currentScene: Container | null = null;
  private networkManager: NetworkManager;
  private uiManager: UIManager;
  
  private loginScene: LoginScene | null = null;
  private combatScene: CombatScene | null = null;
  private customizationScene: CharacterCustomizationScreen | null = null;

  constructor(app: Application) {
    this.app = app;
    this.networkManager = new NetworkManager();
    this.uiManager = new UIManager();
    
    this.goToLogin();
  }

  goToLogin() {
    this.loginScene = new LoginScene(
      (userData) => {
        console.info(`[Game] Starting as character: ${userData.charName}`);
        this.joinCombat(userData.charName, userData.class, userData.isNew, userData.charId);
      },
      (createData) => {
        this.openCustomization(createData.accountId, createData.accountUsername, createData.charName, createData.classType);
      }
    );
    
    this.switchScene(this.loginScene);
  }

  start() {
    console.info('[Game] Starting ZYRA...');
    // O Ticker do Pixi já chama o update automaticamente
    this.app.ticker.add((ticker) => this.update(ticker.deltaTime));
  }

  /**
   * ESTE MÉTODO REPASSA O UPDATE PARA A CENA ATUAL (CombatScene)
   */
  update(deltaTime: number) {
    if (this.currentScene && typeof (this.currentScene as any).update === 'function') {
      (this.currentScene as any).update(deltaTime);
    }
  }

  switchScene(scene: Container) {
    if (this.currentScene) {
      if (typeof (this.currentScene as any).cleanup === 'function') {
        (this.currentScene as any).cleanup();
      }
      this.app.stage.removeChild(this.currentScene);
    }
    this.currentScene = scene;
    this.app.stage.addChild(scene);
    this.onResize(window.innerWidth, window.innerHeight);
  }

  async joinCombat(charName: string, classType: string, isNew: boolean, accountOrCharId: number) {
    console.info(`[Game] Joining combat as ${charName} (${classType})`);
    try {
      await this.networkManager.connectToCombat(charName, classType, isNew, accountOrCharId);
      
      this.combatScene = new CombatScene(this, this.networkManager);
      this.switchScene(this.combatScene);
    } catch (error) {
      console.error('[Game] Failed to join combat:', error);
      if (this.loginScene) {
        this.switchScene(this.loginScene);
        const msg = String((error as any)?.message || error || '');
        if (msg.includes('NAME_TAKEN')) {
          this.loginScene.showCreateError('Name already in use. Please choose another.');
        }
      } else {
        this.goToLogin();
      }
    }
  }

  private openCustomization(accountId: number, accountUsername: string, charName: string, classType: string) {
    if (!this.loginScene) this.goToLogin();
    if (!this.loginScene) return;

    this.loginScene.setAccountContext(accountId, accountUsername);
    this.loginScene.setCreatePrefill(charName, classType);

    this.customizationScene = new CharacterCustomizationScreen(
      charName,
      classType,
      (data) => {
        this.joinCombatWithCustomization(charName, classType, accountId, data.bodyColor, data.eyeColor);
      },
      () => {
        this.switchScene(this.loginScene!);
      }
    );
    this.switchScene(this.customizationScene);
  }

  private async joinCombatWithCustomization(charName: string, classType: string, accountId: number, bodyColor: string, eyeColor: string) {
    console.info(`[Game] Creating character: ${charName} (${classType})`);
    try {
      await this.networkManager.connectToCombat(charName, classType, true, accountId, { bodyColor, eyeColor });
      this.combatScene = new CombatScene(this, this.networkManager);
      this.switchScene(this.combatScene);
    } catch (error) {
      console.error('[Game] Failed to create/join combat:', error);
      if (this.loginScene) {
        this.switchScene(this.loginScene);
        const msg = String((error as any)?.message || error || '');
        if (msg.includes('NAME_TAKEN')) {
          this.loginScene.showCreateError('Name already in use. Please choose another.');
        } else {
          this.loginScene.showCreateError('Failed to create character. Try again.');
        }
      } else {
        this.goToLogin();
      }
    }
  }

  returnToMenu() {
    this.networkManager.disconnect();
    this.goToLogin();
  }

  onResize(width: number, height: number) {
    if (this.currentScene && 'onResize' in this.currentScene) {
      (this.currentScene as any).onResize(width, height);
    }
  }

  getApp(): Application { return this.app; }
  getNetworkManager(): NetworkManager { return this.networkManager; }
  getUIManager(): UIManager { return this.uiManager; }
}
