import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { PdfGeneratorService } from '../services/pdfGeneratorService';
import { PdfKitService } from '../services/pdfKitService';
import { ModalPdfService } from '../services/modalPdfService';
import { resolveImageUrl } from '../utils/imageResolver';

const router = express.Router();
const prisma = new PrismaClient();

// Generate PDF for a recipe
router.get('/recipe/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const recipeId = req.params.id;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Get the recipe from database
    const recipe = await prisma.recipe.findFirst({
      where: {
        id: recipeId,
        userId: userId
      },
      include: {
        images: {
          orderBy: { order: 'asc' }
        },
        ingredients: {
          orderBy: { order: 'asc' }
        },
        instructions: {
          orderBy: { step: 'asc' }
        },
        tags: {
          include: { tag: true }
        }
      }
    });

    if (!recipe) {
      return res.status(404).json({ error: 'Recipe not found' });
    }

    // Transform the recipe data to match our expected format
    const transformedRecipe = {
      id: recipe.id,
      userId: recipe.userId,
      title: recipe.title,
      description: recipe.description,
      prepTime: recipe.prepTime,
      cookTime: recipe.cookTime,
      servings: recipe.servings,
      difficulty: recipe.difficulty as "Fácil" | "Medio" | "Difícil",
      recipeType: recipe.recipeType,
      sourceUrl: recipe.sourceUrl,
      createdAt: recipe.createdAt,
      updatedAt: recipe.updatedAt,
      images: recipe.images.map(img => ({
        id: img.id,
        url: resolveImageUrl(img.url),
        localPath: img.localPath,
        order: img.order,
        altText: img.altText
      })),
      ingredients: recipe.ingredients.map(ing => ({
        id: ing.id,
        name: ing.name,
        amount: ing.amount,
        unit: ing.unit,
        order: ing.order
      })),
      instructions: recipe.instructions.map(inst => ({
        id: inst.id,
        step: inst.step,
        description: inst.description,
        thermomixSettings: {
          time: inst.time,
          temperature: inst.temperature,
          speed: inst.speed
        }
      })),
      tags: recipe.tags.map(tag => tag.tag.name)
    };

    // Generate PDF with PDFKit (funciona siempre, diseño mejorado)
    const pdfBuffer = await PdfKitService.generateRecipePdf(transformedRecipe);

    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${recipe.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    // Send the PDF
    res.send(pdfBuffer);

  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({
      error: 'Error al generate PDF',
      details: error.message
    });
  }
});

export default router;