import express from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { LLMServiceImproved } from '../services/llmServiceImproved';
import { ImageService } from '../services/imageService';

const router = express.Router();
const prisma = new PrismaClient();

// Validation schema for HTML import
const importHtmlSchema = z.object({
  html: z.string().min(100), // Ensure we have substantial HTML content
  url: z.string().url(),
  title: z.string().optional() // Page title if available
});

// Initialize services
const llmService = new LLMServiceImproved();
const imageService = new ImageService();

// Import recipe from HTML content (for bookmarklet)
router.post('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { html, url, title } = importHtmlSchema.parse(req.body);

    console.log('\n🔖 BOOKMARKLET RECIPE IMPORT');
    console.log('📍 Source URL:', url);
    console.log('📄 Page title:', title || 'Unknown');
    console.log('📏 HTML content length:', html.length, 'characters');

    // Step 1: Extract recipe data from HTML using LLM
    console.log('🤖 Extracting recipe data from HTML...');
    const recipeData = await llmService.extractRecipeFromHtml(html, url);

    console.log(`✅ Extracted recipe: "${recipeData.title}"`);
    console.log(`🖼️ Found ${recipeData.images.length} images`);

    // Step 2: Download and process images (if any)
    let processedImages = [];
    if (recipeData.images.length > 0) {
      console.log('📥 Downloading and processing images...');
      try {
        const imageUrls = recipeData.images.map(img => img.url);
        processedImages = await imageService.downloadAndStoreImages(imageUrls);
        console.log(`📸 Successfully processed ${processedImages.length} images`);
      } catch (imageError) {
        console.error('❌ Image processing error:', imageError);
        // Continue without images if they fail to download
      }
    }

    // Step 3: Save recipe to database
    console.log('💾 Saving recipe to database...');
    const savedRecipe = await prisma.recipe.create({
      data: {
        title: recipeData.title,
        description: recipeData.description || `Recipe imported from ${url}`,
        prepTime: recipeData.prepTime,
        cookTime: recipeData.cookTime,
        servings: recipeData.servings,
        difficulty: recipeData.difficulty,
        recipeType: recipeData.recipeType,
        sourceUrl: url,
        userId: req.user!.id,
        images: {
          create: processedImages.map(img => ({
            url: img.url,
            localPath: img.localPath,
            order: img.order,
            altText: img.altText
          }))
        },
        ingredients: {
          create: recipeData.ingredients.map((ing, index) => ({
            name: ing.name,
            amount: ing.amount,
            unit: ing.unit,
            order: index + 1
          }))
        },
        instructions: {
          create: recipeData.instructions.map(inst => ({
            step: inst.step,
            description: inst.description,
            time: inst.time || undefined,
            temperature: inst.temperature || undefined,
            speed: inst.speed || undefined
          }))
        },
        tags: {
          create: recipeData.tags.map(tagName => ({
            tag: {
              connectOrCreate: {
                where: { name: tagName },
                create: { name: tagName }
              }
            }
          }))
        }
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
          include: {
            tag: true
          }
        }
      }
    });

    console.log(`✅ Recipe "${savedRecipe.title}" saved to database with ID: ${savedRecipe.id}`);
    console.log('🎉 Bookmarklet import completed successfully!');

    // Transform the data to match frontend interface
    const transformedRecipe = {
      ...savedRecipe,
      tags: savedRecipe.tags.map(rt => rt.tag.name),
      instructions: savedRecipe.instructions.map(instruction => ({
        ...instruction,
        thermomixSettings: {
          time: instruction.time,
          temperature: instruction.temperature,
          speed: instruction.speed
        }
      }))
    };

    res.status(201).json({
      success: true,
      recipe: transformedRecipe,
      saved: true,
      message: `Recipe "${savedRecipe.title}" imported and saved successfully from bookmarklet`
    });

  } catch (error) {
    console.error('💥 Bookmarklet import error:', error);

    let errorMessage = 'Failed to import recipe from HTML';
    let statusCode = 500;

    if (error instanceof z.ZodError) {
      errorMessage = 'Invalid HTML data provided';
      statusCode = 400;
      console.error('📋 Validation errors:', error.errors);
    } else if (error instanceof Error) {
      errorMessage = error.message;
      if (error.message.includes('No valid recipe found')) {
        statusCode = 404;
      }
    }

    res.status(statusCode).json({
      success: false,
      error: errorMessage,
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Health check for bookmarklet
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'HTML Recipe Import API',
    timestamp: new Date().toISOString()
  });
});

export default router;