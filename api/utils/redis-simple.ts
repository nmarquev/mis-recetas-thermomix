import { createClient } from 'redis';

let client: any = null;

export async function getRedisClient() {
  if (!client) {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      throw new Error('REDIS_URL environment variable is required');
    }

    console.log('Creating Redis client...');
    client = createClient({
      url: redisUrl
    });

    client.on('error', (err: any) => {
      console.error('Redis Client Error', err);
    });

    client.on('connect', () => {
      console.log('Redis client connected');
    });

    await client.connect();
    console.log('Redis client connection established');
  }

  return client;
}

export const redisSimpleClient = {
  async get(key: string) {
    try {
      const client = await getRedisClient();
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
      const client = await getRedisClient();
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
      const client = await getRedisClient();
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