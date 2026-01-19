import { PlayerState, BuffState } from '@zyra/shared';
import { BuffTemplateRegistry } from './BuffTemplateRegistry';
import { db } from '../database/db';

export class BuffManager {
  async loadActiveBuffs(player: PlayerState, characterId: number) {
    const res = await db.query('SELECT * FROM character_buffs WHERE character_id = $1', [characterId]);
    const now = Date.now();

    res.rows.forEach(row => {
      const template = BuffTemplateRegistry.get(row.buff_id);
      if (!template) return;

      const buff = new BuffState();
      buff.id = `${row.buff_id}_${row.id}`;
      buff.buffId = row.buff_id;
      buff.stacks = row.stacks ?? 1;
      buff.startedAt = row.started_at ? new Date(row.started_at).getTime() : now;
      buff.expiresAt = row.expires_at ? new Date(row.expires_at).getTime() : (template.duration > 0 ? buff.startedAt + template.duration : -1);
      buff.lastTickAt = buff.startedAt;

      if (buff.expiresAt > 0 && now >= buff.expiresAt) return;
      player.buffs.set(buff.buffId, buff);
    });
  }

  async applyBuff(player: PlayerState, buffId: string, options?: { durationMs?: number; stacks?: number }) {
    const buffConfig = BuffTemplateRegistry.get(buffId);
    if (!buffConfig) return false;

    const existingBuff = player.buffs.get(buffId);
    const now = Date.now();
    const durationMs = options?.durationMs ?? buffConfig.duration;
    const stacksToAdd = options?.stacks ?? 1;
    
    if (existingBuff) {
      if (buffConfig.stackable && existingBuff.stacks < buffConfig.maxStacks) {
        existingBuff.stacks = Math.min(existingBuff.stacks + stacksToAdd, buffConfig.maxStacks);
      }
      existingBuff.startedAt = now;
      if (durationMs > 0) {
        existingBuff.expiresAt = now + durationMs;
      }
      await this.persistBuff(player.characterId, buffId, existingBuff.stacks, existingBuff.startedAt, existingBuff.expiresAt);
      return true;
    }

    const buff = new BuffState();
    buff.id = `${buffId}_${now}`;
    buff.buffId = buffId;
    buff.stacks = Math.min(stacksToAdd, buffConfig.maxStacks);
    buff.startedAt = now;
    buff.expiresAt = durationMs > 0 ? now + durationMs : -1;
    buff.lastTickAt = now;

    player.buffs.set(buffId, buff);
    await this.persistBuff(player.characterId, buffId, buff.stacks, buff.startedAt, buff.expiresAt);
    return true;
  }

  async removeBuff(player: PlayerState, buffId: string) {
    player.buffs.delete(buffId);
    if (player.characterId) {
      await db.query('DELETE FROM character_buffs WHERE character_id = $1 AND buff_id = $2', [player.characterId, buffId]);
    }
  }

  updateBuffs(player: PlayerState): boolean {
    const now = Date.now();
    const toRemove: string[] = [];
    let statsDirty = false;

    player.buffs.forEach((buff, key) => {
      const template = BuffTemplateRegistry.get(buff.buffId);
      if (!template) {
        toRemove.push(key);
        return;
      }
      if (template?.effects?.effectType === 'dot' && template.effects.damagePerTick && template.effects.tickInterval) {
        if (now - buff.lastTickAt >= template.effects.tickInterval) {
          const damage = Math.max(1, Math.round(template.effects.damagePerTick * buff.stacks));
          player.currentHp = Math.max(0, player.currentHp - damage);
          if (player.currentHp <= 0) player.isAlive = false;
          buff.lastTickAt = now;
        }
      }
      if (buff.expiresAt > 0 && now >= buff.expiresAt) {
        toRemove.push(key);
      }
    });

    toRemove.forEach(key => {
      statsDirty = true;
      void this.removeBuff(player, key);
    });
    return statsDirty;
  }

  hasActiveBuff(player: PlayerState, buffId: string): boolean {
    return player.buffs.has(buffId);
  }

  getTotalBonusPercent(player: PlayerState, key: keyof NonNullable<ReturnType<typeof BuffTemplateRegistry.get>>['effects']): number {
    let total = 0;
    player.buffs.forEach(buff => {
      const template = BuffTemplateRegistry.get(buff.buffId);
      if (!template?.effects) return;
      const value = (template.effects as any)[key];
      if (typeof value === 'number') total += value * (buff.stacks || 1);
    });
    return total;
  }

  private async persistBuff(characterId: number, buffId: string, stacks: number, startedAt: number, expiresAt: number) {
    if (!characterId) return;
    const started = new Date(startedAt);
    const expires = expiresAt > 0 ? new Date(expiresAt) : null;
    await db.query(`
      INSERT INTO character_buffs (character_id, buff_id, stacks, started_at, expires_at)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (character_id, buff_id) DO UPDATE SET
        stacks = EXCLUDED.stacks,
        started_at = EXCLUDED.started_at,
        expires_at = EXCLUDED.expires_at
    `, [characterId, buffId, stacks, started, expires]);
  }
}
