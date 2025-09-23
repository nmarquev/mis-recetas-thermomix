import { NextApiRequest, NextApiResponse } from 'next';
import { redisSimpleClient } from '../utils/redis-simple';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('=== REDIS TEST START ===');

    // Verificar variables de entorno
    const redisUrl = process.env.REDIS_URL;
    console.log('REDIS_URL exists:', !!redisUrl);

    if (!redisUrl) {
      return res.status(500).json({
        error: 'REDIS_URL not configured',
        redisConfigured: false,
        timestamp: new Date().toISOString()
      });
    }

    // Test básico con la librería redis oficial
    console.log('Testing Redis connection with official redis library...');

    const testKey = 'test:ping';
    const testValue = 'pong';

    await redisSimpleClient.set(testKey, testValue);
    const result = await redisSimpleClient.get(testKey);

    console.log('Ping test result:', result);

    // Limpiar
    await redisSimpleClient.del(testKey);

    console.log('=== REDIS TEST END ===');

    res.json({
      status: 'OK',
      redisConfigured: true,
      connection: 'working',
      library: 'redis (official)',
      pingTest: result === testValue,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Redis test error:', error);
    res.status(500).json({
      error: 'Redis test failed',
      details: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }
}