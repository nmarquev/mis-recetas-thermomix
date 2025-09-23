// Cliente Redis usando REST API (compatible con Upstash)
const REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

async function redisRest(command: string[]) {
  if (!REDIS_REST_URL || !REDIS_REST_TOKEN) {
    // Fallback: intentar parsear REDIS_URL para obtener credenciales REST
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      throw new Error('Redis REST credentials not found');
    }

    // Para Upstash, la URL REST se puede derivar de la URL normal
    // redis://default:password@host:port -> https://host/
    const url = new URL(redisUrl);
    const restUrl = `https://${url.hostname}`;
    const token = url.password;

    console.log('Using derived REST URL from REDIS_URL');
    return await fetchRedis(restUrl, token, command);
  }

  return await fetchRedis(REDIS_REST_URL, REDIS_REST_TOKEN, command);
}

async function fetchRedis(url: string, token: string, command: string[]) {
  console.log('Redis REST command:', command);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(command),
  });

  if (!response.ok) {
    throw new Error(`Redis REST error: ${response.status} ${response.statusText}`);
  }

  const result = await response.json();
  console.log('Redis REST result:', result);
  return result.result;
}

export const redisRestClient = {
  async get(key: string) {
    try {
      console.log(`Redis REST GET: ${key}`);
      const value = await redisRest(['GET', key]);
      console.log(`Redis REST GET result: ${key} -> ${value ? 'found' : 'not found'}`);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error(`Redis REST GET error for key ${key}:`, error);
      throw error;
    }
  },

  async set(key: string, value: any) {
    try {
      console.log(`Redis REST SET: ${key}`);
      const result = await redisRest(['SET', key, JSON.stringify(value)]);
      console.log(`Redis REST SET result: ${key} -> ${result}`);
      return result;
    } catch (error) {
      console.error(`Redis REST SET error for key ${key}:`, error);
      throw error;
    }
  },

  async del(key: string) {
    try {
      console.log(`Redis REST DEL: ${key}`);
      const result = await redisRest(['DEL', key]);
      console.log(`Redis REST DEL result: ${key} -> ${result}`);
      return result;
    } catch (error) {
      console.error(`Redis REST DEL error for key ${key}:`, error);
      throw error;
    }
  }
};