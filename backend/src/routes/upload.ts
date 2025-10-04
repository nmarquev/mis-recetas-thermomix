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
  // Verificar si el archivo es una imagen
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Solo se permiten archivos de imagen'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // Límite de 5MB
  }
});

// Endpoint de carga de imágenes
router.post('/images', authenticateToken, upload.array('images', 3), async (req: AuthRequest, res) => {
  try {
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No se proporcionaron imágenes' });
    }

    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    const processedImages = [];

    for (let i = 0; i < Math.min(files.length, 3); i++) {
      const file = files[i];

      // Generar nombre de archivo único
      const fileExtension = path.extname(file.originalname) || '.jpg';
      const filename = `recipe-${randomUUID()}-${i + 1}${fileExtension}`;
      const filePath = path.join(uploadDir, filename);

      try {
        // Procesar imagen con Sharp
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
          altText: `Imagen de receta ${i + 1}`
        });
      } catch (error) {
        console.error(`Error procesando imagen ${i + 1}:`, error);
        // Continuar con otras imágenes aunque una falle
      }
    }

    res.json({
      success: true,
      images: processedImages
    });
  } catch (error) {
    console.error('Error de carga:', error);

    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'Archivo demasiado grande. El tamaño máximo es 5MB por imagen.' });
      }
    }

    res.status(500).json({ error: 'Error al cargar las imágenes' });
  }
});

export default router;