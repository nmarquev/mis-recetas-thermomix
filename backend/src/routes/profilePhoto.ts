import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Configure multer for profile photo uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'profiles');

    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const userId = (req as AuthRequest).user?.id;
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    cb(null, `profile_${userId}_${timestamp}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Check if file is an image
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Upload profile photo
router.post('/profile-photo', authenticateToken, upload.single('profilePhoto'), async (req: AuthRequest, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const userId = req.user!.id;

    // Get current user's profile photo before updating
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { profilePhoto: true }
    });

    // Get relative path for storage in database
    const relativePath = `/uploads/profiles/${req.file.filename}`;

    // Update user's profile photo in database
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { profilePhoto: relativePath },
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

    // Delete old profile photo if it exists and is different
    try {
      if (currentUser?.profilePhoto && currentUser.profilePhoto !== relativePath) {
        const oldPhotoPath = path.join(process.cwd(), currentUser.profilePhoto);
        if (fs.existsSync(oldPhotoPath)) {
          fs.unlinkSync(oldPhotoPath);
        }
      }
    } catch (cleanupError) {
      console.warn('Error al clean up old profile photo:', cleanupError);
    }

    res.json({
      success: true,
      photoUrl: relativePath,
      user: updatedUser
    });

  } catch (error) {
    console.error('Profile photo upload error:', error);

    // Clean up uploaded file if database update failed
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({ error: 'Error al upload profile photo' });
  }
});

// Delete profile photo
router.delete('/profile-photo', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;

    // Get current user to find photo path
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { profilePhoto: true }
    });

    // Update user to remove profile photo
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { profilePhoto: null },
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

    // Delete the physical file
    if (user?.profilePhoto) {
      try {
        const photoPath = path.join(process.cwd(), user.profilePhoto);
        if (fs.existsSync(photoPath)) {
          fs.unlinkSync(photoPath);
        }
      } catch (deleteError) {
        console.warn('Error al delete profile photo file:', deleteError);
      }
    }

    res.json({
      success: true,
      user: updatedUser
    });

  } catch (error) {
    console.error('Profile photo deletion error:', error);
    res.status(500).json({ error: 'Error al delete profile photo' });
  }
});

export default router;