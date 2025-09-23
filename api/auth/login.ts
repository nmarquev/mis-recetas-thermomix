import { NextApiRequest, NextApiResponse } from 'next';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { redisClient } from '../utils/redis';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Login attempt started');

    // Verificar variables de entorno críticas
    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
      console.error('JWT_SECRET not configured');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Validar datos de entrada
    let parsedData;
    try {
      parsedData = loginSchema.parse(req.body);
      console.log('Request body parsed successfully');
    } catch (validationError) {
      console.error('Validation error:', validationError);
      if (validationError instanceof z.ZodError) {
        return res.status(400).json({ error: 'Validation error', details: validationError.errors });
      }
      throw validationError;
    }

    const { email, password } = parsedData;
    console.log(`Attempting login for email: ${email}`);

    // Intentar obtener usuario de Redis
    let user;
    try {
      user = await redisClient.get(`user:${email}`);
      console.log(`Redis query completed for user: ${email}`, user ? 'User found' : 'User not found');
    } catch (redisError) {
      console.error('Redis error:', redisError);
      return res.status(500).json({ error: 'Database connection error' });
    }

    if (!user) {
      console.log(`User not found: ${email}`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verificar contraseña
    let validPassword;
    try {
      validPassword = await bcrypt.compare(password, user.password);
      console.log('Password verification completed:', validPassword);
    } catch (bcryptError) {
      console.error('Bcrypt error:', bcryptError);
      return res.status(500).json({ error: 'Authentication error' });
    }

    if (!validPassword) {
      console.log(`Invalid password for user: ${email}`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generar token
    let token;
    try {
      token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
      console.log('Token generated successfully');
    } catch (jwtError) {
      console.error('JWT error:', jwtError);
      return res.status(500).json({ error: 'Token generation error' });
    }

    const { password: _, ...userResponse } = user;

    console.log('Login successful for user:', email);
    res.json({
      user: userResponse,
      token
    });
  } catch (error) {
    console.error('Unexpected login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}