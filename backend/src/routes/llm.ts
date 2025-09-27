import express from 'express';
import { z } from 'zod';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { LLMServiceImproved } from '../services/llmServiceImproved';

const llmService = new LLMServiceImproved();

const router = express.Router();

const generateScriptSchema = z.object({
  prompt: z.string().min(1)
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
        error: result.error || 'Failed to generate script'
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

export default router;