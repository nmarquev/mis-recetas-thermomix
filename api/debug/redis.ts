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

    // Test de conexión básica
    console.log('Testing Redis connection...');

    // Intentar hacer un ping
    try {
      await redisClient.set('test:ping', 'pong');
      const pingResult = await redisClient.get('test:ping');
      console.log('Redis ping test:', pingResult);
    } catch (pingError) {
      console.error('Redis ping failed:', pingError);
      return res.status(500).json({
        error: 'Redis connection failed',
        details: pingError.message,
        redisConfigured: !!redisUrl
      });
    }

    // Buscar usuarios existentes
    console.log('Checking for existing users...');
    const demoUser = await redisClient.get('user:demo@thermomix.com');
    const chefUser = await redisClient.get('user:chef@cocina.com');

    console.log('Demo user exists:', !!demoUser);
    console.log('Chef user exists:', !!chefUser);

    // Limpiar test
    await redisClient.del('test:ping');

    console.log('=== REDIS DEBUG END ===');

    res.json({
      status: 'OK',
      redisConfigured: !!redisUrl,
      connection: 'working',
      users: {
        'demo@thermomix.com': !!demoUser,
        'chef@cocina.com': !!chefUser
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Debug error:', error);
    res.status(500).json({
      error: 'Debug failed',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
}