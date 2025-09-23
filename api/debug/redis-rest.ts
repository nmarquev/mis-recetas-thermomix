import { NextApiRequest, NextApiResponse } from 'next';
import { redisRestClient } from '../utils/redis-rest';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('=== REDIS REST TEST START ===');

    // Verificar variables de entorno
    const redisUrl = process.env.REDIS_URL;
    const restUrl = process.env.UPSTASH_REDIS_REST_URL;
    const restToken = process.env.UPSTASH_REDIS_REST_TOKEN;

    console.log('Environment check:');
    console.log('- REDIS_URL exists:', !!redisUrl);
    console.log('- UPSTASH_REDIS_REST_URL exists:', !!restUrl);
    console.log('- UPSTASH_REDIS_REST_TOKEN exists:', !!restToken);

    if (!redisUrl && (!restUrl || !restToken)) {
      return res.status(500).json({
        error: 'Redis credentials not configured',
        details: 'Need either REDIS_URL or UPSTASH_REDIS_REST_* variables',
        timestamp: new Date().toISOString()
      });
    }

    // Test básico con REST API
    console.log('Testing Redis REST API...');

    const testKey = 'test:rest-ping';
    const testValue = 'rest-pong';

    await redisRestClient.set(testKey, testValue);
    const result = await redisRestClient.get(testKey);

    console.log('REST ping test result:', result);

    // Limpiar
    await redisRestClient.del(testKey);

    console.log('=== REDIS REST TEST END ===');

    res.json({
      status: 'OK',
      connection: 'working',
      method: 'REST API',
      pingTest: result === testValue,
      environment: {
        redisUrl: !!redisUrl,
        restUrl: !!restUrl,
        restToken: !!restToken
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Redis REST test error:', error);
    res.status(500).json({
      error: 'Redis REST test failed',
      details: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }
}