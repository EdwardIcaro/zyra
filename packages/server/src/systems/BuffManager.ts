import { PlayerState, BuffState, BUFFS, BuffConfig } from '@zyra/shared';

export class BuffManager {
  applyBuff(player: PlayerState, buffId: string): boolean {
    const buffConfig = BUFFS[buffId];
    if (!buffConfig) return false;

    const existingBuff = player.buffs.get(buffId);
    
    if (existingBuff) {
      if (buffConfig.stackable && existingBuff.stacks < buffConfig.maxStacks) {
        existingBuff.stacks++;
        return true;
      }
      existingBuff.startedAt = Date.now();
      if (buffConfig.duration > 0) {
        existingBuff.expiresAt = Date.now() + buffConfig.duration;
      }
      return true;
    }

    const buff = new BuffState();
    buff.id = `${buffId}_${Date.now()}`;
    buff.buffId = buffId;
    buff.stacks = 1;
    buff.startedAt = Date.now();
    buff.expiresAt = buffConfig.duration > 0 ? Date.now() + buffConfig.duration : -1;

    player.buffs.set(buffId, buff);
    return true;
  }

  removeBuff(player: PlayerState, buffId: string) {
    player.buffs.delete(buffId);
  }

  updateBuffs(player: PlayerState) {
    const now = Date.now();
    const toRemove: string[] = [];

    player.buffs.forEach((buff, key) => {
      if (buff.expiresAt > 0 && now >= buff.expiresAt) {
        toRemove.push(key);
      }
    });

    toRemove.forEach(key => this.removeBuff(player, key));
  }

  getBuffConfig(buffId: string): BuffConfig | undefined {
    return BUFFS[buffId];
  }

  hasActiveBuff(player: PlayerState, buffId: string): boolean {
    return player.buffs.has(buffId);
  }
}