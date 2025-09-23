import { createClient } from 'redis';

let redis: any = null;

async function getRedisClient() {
  if (!redis) {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      throw new Error('REDIS_URL environment variable is required');
    }

    console.log('Creating Redis client with official SDK...');
    redis = createClient({
      url: redisUrl
    });

    redis.on('error', (err: any) => {
      console.error('Redis Client Error:', err);
    });

    redis.on('connect', () => {
      console.log('Redis client connected');
    });

    redis.on('ready', () => {
      console.log('Redis client ready');
    });

    await redis.connect();
    console.log('Redis client connection established');
  }

  return redis;
}

export const redisSdkClient = {
  async get(key: string) {
    try {
      const client = await getRedisClient();
      console.log(`Redis SDK GET: ${key}`);
      const value = await client.get(key);
      console.log(`Redis SDK GET result: ${key} -> ${value ? 'found' : 'not found'}`);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error(`Redis SDK GET error for key ${key}:`, error);
      throw error;
    }
  },

  async set(key: string, value: any) {
    try {
      const client = await getRedisClient();
      console.log(`Redis SDK SET: ${key}`);
      const result = await client.set(key, JSON.stringify(value));
      console.log(`Redis SDK SET result: ${key} -> ${result}`);
      return result;
    } catch (error) {
      console.error(`Redis SDK SET error for key ${key}:`, error);
      throw error;
    }
  },

  async del(key: string) {
    try {
      const client = await getRedisClient();
      console.log(`Redis SDK DEL: ${key}`);
      const result = await client.del(key);
      console.log(`Redis SDK DEL result: ${key} -> ${result}`);
      return result;
    } catch (error) {
      console.error(`Redis SDK DEL error for key ${key}:`, error);
      throw error;
    }
  }
};