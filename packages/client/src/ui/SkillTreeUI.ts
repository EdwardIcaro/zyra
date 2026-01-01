import { Container, Graphics, Text } from 'pixi.js';
import { ClassType } from '@zyra/shared';

export class SkillTreeUI extends Container {
  private classType: ClassType;

  constructor(classType: ClassType) {
    super();
    this.classType = classType;
    this.createTree();
  }

  private createTree() {
    // TODO: Create skill tree nodes
    // - Offensive branch (left)
    // - Defensive branch (center)
    // - Utility branch (right)
  }

  private createSkillNode(x: number, y: number, skillId: string): Container {
    const container = new Container();
    container.position.set(x, y);
    
    const circle = new Graphics()
      .circle(0, 0, 30)
      .fill(0x444444)
      .stroke({ width: 3, color: 0x888888 });
    
    container.addChild(circle);
    container.eventMode = 'static';
    container.cursor = 'pointer';
    
    return container;
  }

  updateSkills(skills: any[]) {
    // TODO: Update skill states
  }
}