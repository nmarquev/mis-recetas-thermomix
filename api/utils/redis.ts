import Redis from 'ioredis';

let redis: Redis | null = null;

function getRedisClient(): Redis {
  if (!redis) {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      throw new Error('REDIS_URL environment variable is required');
    }

    redis = new Redis(redisUrl);

    redis.on('error', (err) => {
      console.error('Redis connection error:', err);
    });
  }

  return redis;
}

export const redisClient = {
  async get(key: string) {
    const client = getRedisClient();
    const value = await client.get(key);
    return value ? JSON.parse(value) : null;
  },

  async set(key: string, value: any) {
    const client = getRedisClient();
    return await client.set(key, JSON.stringify(value));
  },

  async del(key: string) {
    const client = getRedisClient();
    return await client.del(key);
  }
};