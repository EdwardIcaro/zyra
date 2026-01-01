import { createClient, RedisClientType } from 'redis';

export class RedisManager {
  private client: RedisClientType;

  constructor() {
    this.client = createClient({
      socket: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379')
      }
    }) as RedisClientType;

    this.client.on('error', (err) => {
      console.error('Redis Error:', err);
    });

    this.client.on('connect', () => {
      console.info('✅ Connected to Redis');
    });
  }

  async connect(): Promise<void> {
    await this.client.connect();
  }

  async disconnect(): Promise<void> {
    await this.client.disconnect();
  }

  getClient(): RedisClientType {
    return this.client;
  }

  async cachePlayer(playerId: string, data: any, ttl = 300): Promise<void> {
    await this.client.setEx(
      `player:${playerId}`,
      ttl,
      JSON.stringify(data)
    );
  }

  async getCachedPlayer(playerId: string): Promise<any | null> {
    const data = await this.client.get(`player:${playerId}`);
    return data ? JSON.parse(data) : null;
  }

  async invalidatePlayerCache(playerId: string): Promise<void> {
    await this.client.del(`player:${playerId}`);
  }

  async updateLeaderboard(category: string, playerId: string, score: number): Promise<void> {
    await this.client.zAdd(`leaderboard:${category}`, {
      score,
      value: playerId
    });
  }

  async getLeaderboard(category: string, top = 10) {
    return await this.client.zRangeWithScores(
      `leaderboard:${category}`,
      0,
      top - 1,
      { REV: true }
    );
  }

  async checkRateLimit(key: string, limit: number, window: number): Promise<boolean> {
    const current = await this.client.incr(key);
    
    if (current === 1) {
      await this.client.expire(key, window);
    }
    
    return current <= limit;
  }
}

export const redis = new RedisManager();