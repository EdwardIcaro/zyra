import type { BuffConfig, BuffEffect } from '@zyra/shared';

export interface BuffTemplate extends BuffConfig {
  kind: 'buff' | 'debuff';
}

export class BuffTemplateRegistry {
  private static templates = new Map<string, BuffTemplate>();

  static setTemplates(rows: any[]) {
    this.templates.clear();
    rows.forEach(row => {
      const effects = (row.effects || {}) as BuffEffect;
      const template: BuffTemplate = {
        id: row.id,
        name: row.name,
        description: row.description || '',
        duration: row.duration_ms ?? 0,
        stackable: row.stackable === true,
        maxStacks: row.max_stacks ?? 1,
        effects,
        visualColor: row.visual_color ?? 0xffffff,
        kind: (row.kind === 'debuff' ? 'debuff' : 'buff')
      };
      this.templates.set(template.id, template);
    });
  }

  static get(id: string): BuffTemplate | undefined {
    return this.templates.get(id);
  }

  static list(): BuffTemplate[] {
    return Array.from(this.templates.values());
  }
}
