import Redis from 'ioredis';
import { logger } from '../utils/logger';

export class CacheService {
  private static instance: CacheService;
  private client: Redis | null = null;
  private enabled = false;

  private constructor() {
    const url = process.env.REDIS_URL;
    if (!url) {
      logger.warn('[CacheService] REDIS_URL not set — caching disabled.');
      return;
    }
    this.client = new Redis(url, { lazyConnect: true, enableOfflineQueue: false });
    this.client.on('connect', () => {
      this.enabled = true;
      logger.info('[CacheService] Connected to Redis.');
    });
    this.client.on('error', (err) => {
      this.enabled = false;
      logger.warn(`[CacheService] Redis error (caching disabled): ${err.message}`);
    });
    this.client.connect().catch(() => {});
  }

  public static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.enabled || !this.client) return null;
    try {
      const val = await this.client.get(key);
      return val ? (JSON.parse(val) as T) : null;
    } catch {
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    if (!this.enabled || !this.client) return;
    try {
      await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch {
      // cache failures are non-fatal
    }
  }

  async invalidate(pattern: string): Promise<void> {
    if (!this.enabled || !this.client) return;
    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) await this.client.del(...keys);
    } catch {
      // non-fatal
    }
  }
}
