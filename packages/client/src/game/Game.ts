import { Application, Container } from 'pixi.js';
import { LoginScene } from '../scenes/LoginScene';
import { CombatScene } from '../scenes/CombatScene';
import { NetworkManager } from './NetworkManager';
import { UIManager } from '../ui/UIManager';

export class Game {
  private app: Application;
  private currentScene: Container | null = null;
  private networkManager: NetworkManager;
  private uiManager: UIManager;
  
  private loginScene: LoginScene | null = null;
  private combatScene: CombatScene | null = null;

  constructor(app: Application) {
    this.app = app;
    this.networkManager = new NetworkManager();
    this.uiManager = new UIManager();
    
    this.goToLogin();
  }

  goToLogin() {
    this.loginScene = new LoginScene((userData) => {
      console.info(`[Game] Iniciando com personagem: ${userData.charName}`);
      this.joinCombat(userData.charName, userData.class, userData.isNew, userData.charId);
    });
    
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
      this.goToLogin();
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