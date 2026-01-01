import { Container, Graphics, Text } from 'pixi.js';

export class UIManager {
  private container: Container;

  constructor() {
    this.container = new Container();
  }

  createHUD(parentContainer: Container) {
    // TODO: Create HUD elements
    // - HP/Mana bars
    // - Level display
    // - Mini-map
    // - Wave counter (combat)
    // - Inventory button
    // - Skills hotbar
  }

  showInventory() {
    // TODO: Show inventory UI
  }

  hideInventory() {
    // TODO: Hide inventory UI
  }

  showSkillTree() {
    // TODO: Show skill tree UI
  }

  hideSkillTree() {
    // TODO: Hide skill tree UI
  }

  updateHUD(data: any) {
    // TODO: Update HUD values
  }
}