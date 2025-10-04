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
  console.log('\n🔐 Middleware de Autenticación Llamado');
  console.log('📍 URL:', req.url);
  console.log('🔗 Método:', req.method);
  console.log('📋 Headers:', {
    authorization: req.headers['authorization'],
    cookie: req.headers['cookie'],
    origin: req.headers['origin'],
    referer: req.headers['referer']
  });

  // Intentar obtener token del header Authorization primero
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.split(' ')[1];

  console.log('🎫 Token del header Authorization:', token ? `${token.substring(0, 20)}...` : 'Ninguno');

  // Si no hay token en header, intentar obtenerlo de la cookie (para bookmarklet)
  if (!token) {
    token = req.cookies?.authToken;
    console.log('🍪 Token de la cookie:', token ? `${token.substring(0, 20)}...` : 'Ninguno');
  }

  if (!token) {
    console.log('❌ No se encontró token - enviando 401');
    return res.status(401).json({ error: 'Token de acceso requerido' });
  }

  try {
    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
      throw new Error('JWT_SECRET no configurado');
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, name: true }
    });

    if (!user) {
      return res.status(401).json({ error: 'Token inválido' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Error de autenticación:', error);
    return res.status(403).json({ error: 'Token inválido o expirado' });
  }
};