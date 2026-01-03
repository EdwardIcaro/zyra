// packages/client/src/ui/SkillTreeUI.ts
import { Container, Graphics, Text } from 'pixi.js';
// ✅ CORRIGIDO: ClassType é um enum, não um tipo
// Se quiser o tipo string, use: string
// Se quiser o enum, use: import { ClassType } from '@zyra/shared';

export class SkillTreeUI extends Container {
  private classType: string; // ✅ CORRIGIDO: usar string ao invés do enum

  constructor(classType: string) { // ✅ CORRIGIDO
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