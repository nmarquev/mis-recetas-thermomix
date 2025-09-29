import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

// Validation schemas
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

const registerSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  alias: z.string().min(2).optional(),
  password: z.string().min(6)
});

const updateProfileSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().min(2).optional(),
  alias: z.string().min(2).optional(),
  currentPassword: z.string().min(6).optional(),
  newPassword: z.string().min(6).optional()
}).refine((data) => {
  // If updating password, both currentPassword and newPassword are required
  if (data.newPassword && !data.currentPassword) {
    return false;
  }
  if (data.currentPassword && !data.newPassword) {
    return false;
  }
  return true;
}, {
  message: "Both current and new password are required to change password"
});

// Register
router.post('/register', async (req, res) => {
  try {
    const { email, name, alias, password } = registerSchema.parse(req.body);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'User already exists with this email' });
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        name,
        alias,
        password: hashedPassword
      },
      select: {
        id: true,
        email: true,
        name: true,
        alias: true,
        profilePhoto: true,
        createdAt: true
      }
    });

    // Generate JWT
    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
      throw new Error('JWT_SECRET not configured');
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      user,
      token
    });
  } catch (error) {
    console.error('Register error:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    // Find user
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT
    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
      throw new Error('JWT_SECRET not configured');
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

    // Set secure HTTP-only cookie for bookmarklet access
    res.cookie('authToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        alias: user.alias,
        profilePhoto: user.profilePhoto,
        createdAt: user.createdAt
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Simple verification endpoint for bookmarklet
router.get('/verify', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    res.json({
      success: true,
      authenticated: true,
      userId
    });
  } catch (error) {
    console.error('Verify auth error:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
});

// Get current user info (for bookmarklet authentication check)
router.get('/me', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        alias: true,
        profilePhoto: true,
        createdAt: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Logout (clear cookie)
router.post('/logout', (req, res) => {
  res.clearCookie('authToken');
  res.json({ success: true, message: 'Logged out successfully' });
});

// Update profile
router.put('/profile', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const updateData = updateProfileSchema.parse(req.body);

    // Get current user for validation
    const currentUser = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!currentUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if email is being changed to an existing one
    if (updateData.email && updateData.email !== currentUser.email) {
      const existingUser = await prisma.user.findUnique({
        where: { email: updateData.email }
      });

      if (existingUser) {
        return res.status(400).json({ error: 'Email already exists' });
      }
    }

    // Handle password change
    let hashedNewPassword: string | undefined;
    if (updateData.currentPassword && updateData.newPassword) {
      // Verify current password
      const validPassword = await bcrypt.compare(updateData.currentPassword, currentUser.password);
      if (!validPassword) {
        return res.status(400).json({ error: 'Current password is incorrect' });
      }

      // Hash new password
      const saltRounds = 12;
      hashedNewPassword = await bcrypt.hash(updateData.newPassword, saltRounds);
    }

    // Prepare update data
    const dataToUpdate: any = {};
    if (updateData.email) dataToUpdate.email = updateData.email;
    if (updateData.name) dataToUpdate.name = updateData.name;
    if (updateData.alias !== undefined) dataToUpdate.alias = updateData.alias;
    if (hashedNewPassword) dataToUpdate.password = hashedNewPassword;

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: dataToUpdate,
      select: {
        id: true,
        email: true,
        name: true,
        alias: true,
        profilePhoto: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.json({
      message: 'Profile updated successfully',
      user: updatedUser
    });

  } catch (error) {
    console.error('Update profile error:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user profile
router.get('/profile', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        alias: true,
        profilePhoto: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;