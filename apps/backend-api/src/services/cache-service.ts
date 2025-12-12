/**
 * Cache Service
 * 
 * In-memory cache with TTL (Time To Live) and optional Redis support
 * Used for caching frequently accessed data
 * 
 * To enable Redis: Set REDIS_URL environment variable
 * Install: npm install redis @types/redis
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class CacheService {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;
  private redisClient: any = null; // Redis client (lazy loaded)
  private useRedis: boolean = false;

  constructor() {
    // Check if Redis is available
    this.initializeRedis();
    // Start cleanup interval to remove expired entries
    this.startCleanupInterval();
  }

  /**
   * Initialize Redis client if available
   */
  private async initializeRedis(): Promise<void> {
    const redisUrl = process.env.REDIS_URL;
    if (redisUrl) {
      try {
        // Dynamic import to avoid requiring redis package if not installed
        const redis = await import("redis");
        this.redisClient = redis.createClient({ url: redisUrl });
        await this.redisClient.connect();
        this.useRedis = true;
        console.log("✅ Redis cache enabled");
      } catch (error) {
        console.warn("⚠️ Redis not available, using in-memory cache:", error);
        this.useRedis = false;
      }
    }
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    // Try Redis first if available
    if (this.useRedis && this.redisClient) {
      try {
        const value = await this.redisClient.get(key);
        if (value) {
          return JSON.parse(value) as T;
        }
      } catch (error) {
        console.warn("Redis get error, falling back to memory:", error);
      }
    }

    // Fallback to in-memory cache
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.value as T;
  }

  /**
   * Set value in cache with TTL (in milliseconds)
   */
  async set<T>(key: string, value: T, ttlMs: number = 60000): Promise<void> {
    // Try Redis first if available
    if (this.useRedis && this.redisClient) {
      try {
        const ttlSeconds = Math.ceil(ttlMs / 1000);
        await this.redisClient.setEx(key, ttlSeconds, JSON.stringify(value));
        return;
      } catch (error) {
        console.warn("Redis set error, falling back to memory:", error);
      }
    }

    // Fallback to in-memory cache
    const expiresAt = Date.now() + ttlMs;
    this.cache.set(key, { value, expiresAt });
  }

  /**
   * Delete a key from cache
   */
  async delete(key: string): Promise<void> {
    // Delete from Redis if available
    if (this.useRedis && this.redisClient) {
      try {
        await this.redisClient.del(key);
      } catch (error) {
        console.warn("Redis delete error:", error);
      }
    }

    // Delete from in-memory cache
    this.cache.delete(key);
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) {
      return false;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Start cleanup interval to remove expired entries
   */
  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.cache.entries()) {
        if (now > entry.expiresAt) {
          this.cache.delete(key);
        }
      }
    }, 60000); // Cleanup every minute
  }

  /**
   * Stop cleanup interval
   */
  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

export const cacheService = new CacheService();

