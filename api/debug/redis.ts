import { NextApiRequest, NextApiResponse } from 'next';
import { redisClient } from '../utils/redis';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('=== REDIS DEBUG START ===');

    // Verificar variables de entorno
    const redisUrl = process.env.REDIS_URL;
    console.log('REDIS_URL exists:', !!redisUrl);
    console.log('REDIS_URL prefix:', redisUrl ? redisUrl.substring(0, 20) + '...' : 'undefined');

    if (!redisUrl) {
      return res.status(500).json({
        error: 'REDIS_URL not configured',
        redisConfigured: false,
        timestamp: new Date().toISOString()
      });
    }

    // Test de conexión básica con timeout
    console.log('Testing Redis connection...');

    let pingResult;
    try {
      await redisClient.set('test:ping', 'pong');
      pingResult = await redisClient.get('test:ping');
      console.log('Redis ping test result:', pingResult);

      if (pingResult !== 'pong') {
        throw new Error('Ping test failed - expected pong, got: ' + pingResult);
      }
    } catch (pingError) {
      console.error('Redis ping failed:', pingError);
      return res.status(500).json({
        error: 'Redis connection failed',
        details: pingError.message,
        redisConfigured: true,
        timestamp: new Date().toISOString()
      });
    }

    // Buscar usuarios existentes solo si la conexión funciona
    console.log('Checking for existing users...');
    let demoUser, chefUser;

    try {
      demoUser = await redisClient.get('user:demo@thermomix.com');
      chefUser = await redisClient.get('user:chef@cocina.com');
      console.log('Demo user exists:', !!demoUser);
      console.log('Chef user exists:', !!chefUser);
    } catch (userError) {
      console.error('Error checking users:', userError);
      // Continuar sin fallar
    }

    // Limpiar test
    try {
      await redisClient.del('test:ping');
    } catch (cleanupError) {
      console.error('Cleanup error:', cleanupError);
    }

    console.log('=== REDIS DEBUG END ===');

    res.json({
      status: 'OK',
      redisConfigured: !!redisUrl,
      connection: 'working',
      pingTest: pingResult === 'pong',
      users: {
        'demo@thermomix.com': !!demoUser,
        'chef@cocina.com': !!chefUser
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Unexpected debug error:', error);
    res.status(500).json({
      error: 'Debug failed',
      details: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }
}