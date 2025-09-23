import Redis from 'ioredis';

let redis: Redis | null = null;

function getRedisClient(): Redis {
  if (!redis) {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      console.error('REDIS_URL environment variable not found');
      console.error('Available env vars:', Object.keys(process.env).filter(key => key.includes('REDIS')));
      throw new Error('REDIS_URL environment variable is required');
    }

    console.log('Initializing Redis connection...');
    redis = new Redis(redisUrl, {
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      connectTimeout: 10000,
      commandTimeout: 5000,
      lazyConnect: false
    });

    redis.on('connect', () => {
      console.log('Redis connected successfully');
    });

    redis.on('error', (err) => {
      console.error('Redis connection error:', err);
    });

    redis.on('close', () => {
      console.log('Redis connection closed');
    });
  }

  return redis;
}

export const redisClient = {
  async get(key: string) {
    try {
      const client = getRedisClient();
      console.log(`Redis GET: ${key}`);
      const value = await client.get(key);
      console.log(`Redis GET result: ${key} -> ${value ? 'found' : 'not found'}`);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error(`Redis GET error for key ${key}:`, error);
      throw error;
    }
  },

  async set(key: string, value: any) {
    try {
      const client = getRedisClient();
      console.log(`Redis SET: ${key}`);
      const result = await client.set(key, JSON.stringify(value));
      console.log(`Redis SET result: ${key} -> ${result}`);
      return result;
    } catch (error) {
      console.error(`Redis SET error for key ${key}:`, error);
      throw error;
    }
  },

  async del(key: string) {
    try {
      const client = getRedisClient();
      console.log(`Redis DEL: ${key}`);
      const result = await client.del(key);
      console.log(`Redis DEL result: ${key} -> ${result}`);
      return result;
    } catch (error) {
      console.error(`Redis DEL error for key ${key}:`, error);
      throw error;
    }
  }
};