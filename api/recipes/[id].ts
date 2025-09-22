import { NextApiRequest, NextApiResponse } from 'next';
import { kv } from '@vercel/kv';
import { z } from 'zod';
import { authenticateToken } from '../utils/auth';

const updateRecipeSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  prepTime: z.number().min(1),
  cookTime: z.number().optional(),
  servings: z.number().min(1),
  difficulty: z.enum(['Fácil', 'Medio', 'Difícil']),
  recipeType: z.string().optional(),
  sourceUrl: z.string().url().optional(),
  images: z.array(z.object({
    url: z.string(),
    localPath: z.string().optional(),
    order: z.number(),
    altText: z.string().optional()
  })).max(3),
  ingredients: z.array(z.object({
    name: z.string().min(1),
    amount: z.string().min(1),
    unit: z.string().optional(),
    order: z.number()
  })),
  instructions: z.array(z.object({
    step: z.number(),
    description: z.string().min(1),
    time: z.string().optional(),
    temperature: z.string().optional(),
    speed: z.string().optional()
  })),
  tags: z.array(z.string())
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await authenticateToken(req);
  if (!user) {
    return res.status(401).json({ error: 'Access token required' });
  }

  const { id } = req.query;
  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid recipe ID' });
  }

  switch (req.method) {
    case 'GET':
      return handleGetRecipe(req, res, user, id);
    case 'PUT':
      return handleUpdateRecipe(req, res, user, id);
    case 'DELETE':
      return handleDeleteRecipe(req, res, user, id);
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

async function handleGetRecipe(req: NextApiRequest, res: NextApiResponse, user: any, recipeId: string) {
  try {
    const recipe = await kv.get(`recipe:${recipeId}`) as any;

    if (!recipe || recipe.userId !== user.id) {
      return res.status(404).json({ error: 'Recipe not found' });
    }

    res.json(recipe);
  } catch (error) {
    console.error('Get recipe error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function handleUpdateRecipe(req: NextApiRequest, res: NextApiResponse, user: any, recipeId: string) {
  try {
    const data = updateRecipeSchema.parse(req.body);

    const existingRecipe = await kv.get(`recipe:${recipeId}`) as any;
    if (!existingRecipe || existingRecipe.userId !== user.id) {
      return res.status(404).json({ error: 'Recipe not found' });
    }

    const updatedRecipe = {
      ...existingRecipe,
      title: data.title,
      description: data.description,
      prepTime: data.prepTime,
      cookTime: data.cookTime,
      servings: data.servings,
      difficulty: data.difficulty,
      recipeType: data.recipeType,
      sourceUrl: data.sourceUrl,
      images: data.images,
      ingredients: data.ingredients,
      instructions: data.instructions.map(instruction => ({
        ...instruction,
        thermomixSettings: {
          time: instruction.time,
          temperature: instruction.temperature,
          speed: instruction.speed
        }
      })),
      tags: data.tags,
      updatedAt: new Date().toISOString()
    };

    await kv.set(`recipe:${recipeId}`, updatedRecipe);

    res.json(updatedRecipe);
  } catch (error) {
    console.error('Update recipe error:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function handleDeleteRecipe(req: NextApiRequest, res: NextApiResponse, user: any, recipeId: string) {
  try {
    const recipe = await kv.get(`recipe:${recipeId}`) as any;
    if (!recipe || recipe.userId !== user.id) {
      return res.status(404).json({ error: 'Recipe not found' });
    }

    await kv.del(`recipe:${recipeId}`);

    const userRecipeIds = await kv.get(`user_recipes:${user.id}`) as string[] || [];
    const updatedRecipeIds = userRecipeIds.filter(id => id !== recipeId);
    await kv.set(`user_recipes:${user.id}`, updatedRecipeIds);

    res.json({ message: 'Recipe deleted successfully' });
  } catch (error) {
    console.error('Delete recipe error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}