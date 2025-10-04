import express from 'express';
import { z } from 'zod';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { LLMServiceImproved } from '../services/llmServiceImproved';

const llmService = new LLMServiceImproved();

const router = express.Router();

const generateScriptSchema = z.object({
  prompt: z.string().min(1)
});

const searchRecipesSchema = z.object({
  query: z.string().min(1),
  count: z.number().min(1).max(10).optional().default(3),
  offset: z.number().min(0).optional().default(0)
});

router.post('/generate-script', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { prompt } = generateScriptSchema.parse(req.body);

    const result = await llmService.generateText(prompt);

    if (result.success && result.content) {
      res.json({
        success: true,
        script: result.content
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error || 'Error al generate script'
      });
    }
  } catch (error) {
    console.error('Generate script error:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/search-recipes', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { query, count, offset } = searchRecipesSchema.parse(req.body);

    console.log('🔍 Recipe search request:', { query, count, offset, userId: req.user?.id });

    const result = await llmService.searchRecipesWithAI(query, count, offset);

    if (result.success) {
      res.json({
        success: true,
        recipes: result.recipes,
        hasMore: result.hasMore,
        source: 'ai_search',
        query,
        count: result.recipes.length,
        offset
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error || 'Error al search recipes',
        query
      });
    }
  } catch (error) {
    console.error('Search recipes error:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors
      });
    }
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

export default router;