import { NextApiRequest } from 'next';
import jwt from 'jsonwebtoken';
import { kv } from '@vercel/kv';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
}

export async function authenticateToken(req: NextApiRequest): Promise<AuthenticatedUser | null> {
  const authHeader = req.headers['authorization'] as string;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return null;
  }

  try {
    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
      throw new Error('JWT_SECRET not configured');
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };

    const user = await kv.get(`userid:${decoded.userId}`) as any;
    if (!user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name
    };
  } catch (error) {
    console.error('Auth error:', error);
    return null;
  }
}