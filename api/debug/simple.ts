import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Simple debug endpoint hit');

    // Solo verificar variables de entorno sin tocar Redis
    const redisUrl = process.env.REDIS_URL;
    const jwtSecret = process.env.JWT_SECRET;

    console.log('Environment check:');
    console.log('- REDIS_URL exists:', !!redisUrl);
    console.log('- JWT_SECRET exists:', !!jwtSecret);

    if (redisUrl) {
      console.log('- REDIS_URL starts with:', redisUrl.substring(0, 10));
    }

    res.json({
      status: 'Simple endpoint working',
      environment: {
        redisUrl: !!redisUrl,
        jwtSecret: !!jwtSecret,
        nodeEnv: process.env.NODE_ENV || 'undefined'
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Simple debug error:', error);
    res.status(500).json({
      error: 'Simple debug failed',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
}