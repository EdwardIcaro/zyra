import { ClassType } from './enums';

export interface SkillConfig {
  id: string;
  name: string;
  description: string;
  class: ClassType;
  requiredLevel: number;
  maxLevel: number;
  cooldown: number;
  manaCost: number;
  damage?: number;
  aoeRadius?: number;
  duration?: number;
  icon?: string;
}

export interface SkillTreeNode {
  skillId: string;
  position: { x: number; y: number };
  requires: string[];
  branch: 'offensive' | 'defensive' | 'utility';
}