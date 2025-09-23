import { NextApiRequest, NextApiResponse } from 'next';
import { redisSdkClient } from '../utils/redis-sdk';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('=== REDIS SDK TEST START ===');

    // Verificar variables de entorno
    const redisUrl = process.env.REDIS_URL;
    console.log('REDIS_URL exists:', !!redisUrl);

    if (!redisUrl) {
      return res.status(500).json({
        error: 'REDIS_URL not configured',
        timestamp: new Date().toISOString()
      });
    }

    // Test básico con SDK oficial
    console.log('Testing Redis with official SDK...');

    const testKey = 'test:sdk-ping';
    const testValue = 'sdk-pong';

    await redisSdkClient.set(testKey, testValue);
    const result = await redisSdkClient.get(testKey);

    console.log('SDK ping test result:', result);

    // Limpiar
    await redisSdkClient.del(testKey);

    console.log('=== REDIS SDK TEST END ===');

    res.json({
      status: 'OK',
      connection: 'working',
      method: 'Official Redis SDK',
      pingTest: result === testValue,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Redis SDK test error:', error);
    res.status(500).json({
      error: 'Redis SDK test failed',
      details: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }
}