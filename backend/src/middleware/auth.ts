import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
  };
}

export const authenticateToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  console.log('\n🔐 Auth Middleware Called');
  console.log('📍 URL:', req.url);
  console.log('🔗 Method:', req.method);
  console.log('📋 Headers:', {
    authorization: req.headers['authorization'],
    cookie: req.headers['cookie'],
    origin: req.headers['origin'],
    referer: req.headers['referer']
  });

  // Try to get token from Authorization header first
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.split(' ')[1];

  console.log('🎫 Token from Authorization header:', token ? `${token.substring(0, 20)}...` : 'None');

  // If no token in header, try to get from cookie (for bookmarklet)
  if (!token) {
    token = req.cookies?.authToken;
    console.log('🍪 Token from cookie:', token ? `${token.substring(0, 20)}...` : 'None');
  }

  if (!token) {
    console.log('❌ No token found - sending 401');
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
      throw new Error('JWT_SECRET not configured');
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, name: true }
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth error:', error);
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};