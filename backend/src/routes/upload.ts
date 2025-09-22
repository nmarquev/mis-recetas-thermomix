import express from 'express';
import multer from 'multer';
import path from 'path';
import { randomUUID } from 'crypto';
import sharp from 'sharp';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();

const fileFilter = (req: any, file: Express.Multer.File, cb: any) => {
  // Check if file is an image
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Upload images endpoint
router.post('/images', authenticateToken, upload.array('images', 3), async (req: AuthRequest, res) => {
  try {
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No images provided' });
    }

    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    const processedImages = [];

    for (let i = 0; i < Math.min(files.length, 3); i++) {
      const file = files[i];

      // Generate unique filename
      const fileExtension = path.extname(file.originalname) || '.jpg';
      const filename = `recipe-${randomUUID()}-${i + 1}${fileExtension}`;
      const filePath = path.join(uploadDir, filename);

      try {
        // Process image with Sharp
        await sharp(file.buffer)
          .resize(800, 600, {
            fit: 'inside',
            withoutEnlargement: true
          })
          .jpeg({
            quality: 85,
            progressive: true
          })
          .toFile(filePath);

        processedImages.push({
          url: `/uploads/${filename}`,
          localPath: filename,
          order: i + 1,
          altText: `Recipe image ${i + 1}`
        });
      } catch (error) {
        console.error(`Error processing image ${i + 1}:`, error);
        // Continue with other images even if one fails
      }
    }

    res.json({
      success: true,
      images: processedImages
    });
  } catch (error) {
    console.error('Upload error:', error);

    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File too large. Maximum size is 5MB per image.' });
      }
    }

    res.status(500).json({ error: 'Failed to upload images' });
  }
});

export default router;