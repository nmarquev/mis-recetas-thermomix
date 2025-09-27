import express from 'express';
import multer from 'multer';
import { z } from 'zod';
import { authenticateToken } from '../middleware/auth';
import { AuthRequest } from '../types/auth';
import { PdfProcessor } from '../services/pdfProcessor';
import {
  PdfUploadResponse,
  PdfExtractRequest,
  PdfExtractResponse
} from '../types/pdf';

const router = express.Router();

// Initialize PDF processor
const pdfProcessor = new PdfProcessor();

// Configure multer for PDF uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit for PDFs
  },
  fileFilter: (req, file, cb) => {
    console.log('📁 File upload attempt:', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size
    });

    // Accept only PDF files
    if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  },
});

// Validation schemas
const extractSchema = z.object({
  fileId: z.string().uuid(),
  startPage: z.number().min(1),
  endPage: z.number().min(1),
});

const previewSchema = z.object({
  fileId: z.string().uuid(),
  startPage: z.number().min(1).optional(),
  endPage: z.number().min(1).optional(),
});

/**
 * Upload and process PDF file
 * POST /api/import/pdf/upload
 */
router.post('/upload', authenticateToken, upload.single('pdf'), async (req: AuthRequest, res) => {
  try {
    console.log('📄 PDF upload request received');

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No PDF file provided'
      });
    }

    console.log(`📁 Processing PDF: ${req.file.originalname} (${Math.round(req.file.size / 1024 / 1024 * 100) / 100} MB)`);

    // Store file temporarily and get basic processing info
    const fileId = await pdfProcessor.storeTemporaryFile(req.file.buffer, req.file.originalname);

    // Process PDF to get page count and first page preview
    const processedContent = await pdfProcessor.getProcessedContent(fileId);

    // Create preview using first page thumbnail
    const firstPageThumbnail = processedContent.pageImages[0]?.thumbnailBase64;
    const preview = firstPageThumbnail ? `data:image/jpeg;base64,${firstPageThumbnail}` : 'No preview available';

    const response: PdfUploadResponse = {
      success: true,
      fileId,
      totalPages: processedContent.totalPages,
      preview
    };

    console.log(`✅ PDF processed successfully: ${processedContent.totalPages} pages, fileId: ${fileId}`);

    res.json(response);

  } catch (error) {
    console.error('❌ PDF upload error:', error);

    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          error: 'File too large. Maximum size is 50MB.'
        });
      }
    }

    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process PDF file'
    });
  }
});

/**
 * Extract recipes from specific page range using GPT-5-mini multimodal
 * POST /api/import/pdf/extract
 */
router.post('/extract', authenticateToken, async (req: AuthRequest, res) => {
  try {
    console.log('🔍 PDF extract request received');

    const { fileId, startPage, endPage } = extractSchema.parse(req.body);

    console.log(`📖 Extracting pages ${startPage}-${endPage} from file ${fileId}`);

    // Extract pages as images
    const extractedPages = await pdfProcessor.extractPageRange(fileId, startPage, endPage);

    console.log(`🖼️ Extracted ${extractedPages.length} pages as images`);

    // Use GPT-5-mini multimodal to detect and extract recipes
    const detectionResult = await pdfProcessor.detectRecipesFromPages(extractedPages);

    console.log(`🎯 GPT-5-mini detected ${detectionResult.totalDetected} recipes`);

    const response: PdfExtractResponse = {
      success: true,
      recipes: detectionResult.recipes,
      processedPages: endPage - startPage + 1
    };

    console.log(`✅ PDF extraction completed: ${detectionResult.recipes.length} recipes processed`);

    res.json(response);

  } catch (error) {
    console.error('❌ PDF extraction error:', error);

    res.status(500).json({
      success: false,
      recipes: [],
      processedPages: 0,
      error: error instanceof Error ? error.message : 'Failed to extract recipes from PDF'
    });
  }
});

/**
 * Get visual preview of page range
 * POST /api/import/pdf/preview
 */
router.post('/preview', authenticateToken, async (req: AuthRequest, res) => {
  try {
    console.log('👁️ PDF preview request received');

    const { fileId, startPage = 1, endPage } = previewSchema.parse(req.body);

    const content = await pdfProcessor.getProcessedContent(fileId);
    const finalEndPage = endPage || Math.min(startPage + 2, content.totalPages); // Default to 3 pages max

    console.log(`📖 Generating preview for pages ${startPage}-${finalEndPage} from file ${fileId}`);

    // Get page images for preview
    const previewPages = await pdfProcessor.extractPageRange(fileId, startPage, finalEndPage);

    // Return page thumbnails for UI
    const pageImages = previewPages.map(page => ({
      pageNum: page.pageNum,
      thumbnail: page.thumbnailBase64 ? `data:image/jpeg;base64,${page.thumbnailBase64}` : null
    }));

    console.log(`✅ Generated preview for ${pageImages.length} pages`);

    res.json({
      success: true,
      pages: pageImages,
      totalPages: content.totalPages
    });

  } catch (error) {
    console.error('❌ PDF preview error:', error);

    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate PDF preview'
    });
  }
});

/**
 * Clean up temporary files
 * DELETE /api/import/pdf/cleanup/:fileId
 */
router.delete('/cleanup/:fileId', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { fileId } = req.params;

    console.log(`🧹 Cleanup request for file: ${fileId}`);

    // Note: Files are automatically cleaned up by timeout in PdfProcessor
    // This endpoint is for explicit cleanup if needed

    res.json({
      success: true,
      message: 'Cleanup completed'
    });

  } catch (error) {
    console.error('❌ PDF cleanup error:', error);

    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to cleanup PDF files'
    });
  }
});

/**
 * Get PDF processing status/info
 * GET /api/import/pdf/status/:fileId
 */
router.get('/status/:fileId', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { fileId } = req.params;

    console.log(`📊 Status request for file: ${fileId}`);

    const content = await pdfProcessor.getProcessedContent(fileId);

    res.json({
      success: true,
      fileId,
      totalPages: content.totalPages,
      processed: true
    });

  } catch (error) {
    console.error('❌ PDF status error:', error);

    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: 'File not found or expired'
      });
    }

    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get PDF status'
    });
  }
});

export default router;