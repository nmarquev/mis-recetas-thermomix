import { NextApiRequest, NextApiResponse } from 'next';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { redisClient } from '../utils/redis';
import { z } from 'zod';

const registerSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  password: z.string().min(6)
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Register attempt started');

    // Verificar JWT_SECRET primero
    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
      console.error('JWT_SECRET not configured');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Validar datos de entrada
    let parsedData;
    try {
      parsedData = registerSchema.parse(req.body);
      console.log('Registration data parsed successfully');
    } catch (validationError) {
      console.error('Validation error:', validationError);
      if (validationError instanceof z.ZodError) {
        return res.status(400).json({ error: 'Validation error', details: validationError.errors });
      }
      throw validationError;
    }

    const { email, name, password } = parsedData;
    console.log(`Attempting registration for email: ${email}`);

    // Verificar usuario existente
    let existingUser;
    try {
      existingUser = await redisClient.get(`user:${email}`);
      console.log(`Redis check for existing user: ${email}`, existingUser ? 'User exists' : 'User does not exist');
    } catch (redisError) {
      console.error('Redis error during user check:', redisError);
      return res.status(500).json({ error: 'Database connection error' });
    }

    if (existingUser) {
      console.log(`Registration blocked - user exists: ${email}`);
      return res.status(400).json({ error: 'User already exists with this email' });
    }

    // Hash de contraseña
    let hashedPassword;
    try {
      const saltRounds = 12;
      hashedPassword = await bcrypt.hash(password, saltRounds);
      console.log('Password hashed successfully');
    } catch (bcryptError) {
      console.error('Bcrypt error:', bcryptError);
      return res.status(500).json({ error: 'Password processing error' });
    }

    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const user = {
      id: userId,
      email,
      name,
      password: hashedPassword,
      createdAt: new Date().toISOString()
    };

    // Guardar usuario en Redis
    try {
      await redisClient.set(`user:${email}`, user);
      await redisClient.set(`userid:${userId}`, user);
      console.log(`User saved to Redis: ${email} with ID: ${userId}`);
    } catch (redisError) {
      console.error('Redis error during user save:', redisError);
      return res.status(500).json({ error: 'Database save error' });
    }

    // Generar token
    let token;
    try {
      token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
      console.log('JWT token generated successfully');
    } catch (jwtError) {
      console.error('JWT error:', jwtError);
      return res.status(500).json({ error: 'Token generation error' });
    }

    const { password: _, ...userResponse } = user;

    console.log(`Registration successful for user: ${email}`);
    res.status(201).json({
      user: userResponse,
      token
    });
  } catch (error) {
    console.error('Unexpected register error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}