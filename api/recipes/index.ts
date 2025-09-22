import { NextApiRequest, NextApiResponse } from 'next';
import { kv } from '@vercel/kv';
import { z } from 'zod';
import { authenticateToken } from '../utils/auth';

const createRecipeSchema = z.object({
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

  switch (req.method) {
    case 'GET':
      return handleGetRecipes(req, res, user);
    case 'POST':
      return handleCreateRecipe(req, res, user);
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

async function handleGetRecipes(req: NextApiRequest, res: NextApiResponse, user: any) {
  try {
    const userRecipeIds = await kv.get(`user_recipes:${user.id}`) as string[] || [];

    const recipes = [];
    for (const recipeId of userRecipeIds) {
      const recipe = await kv.get(`recipe:${recipeId}`);
      if (recipe) {
        recipes.push(recipe);
      }
    }

    recipes.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json(recipes);
  } catch (error) {
    console.error('Get recipes error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function handleCreateRecipe(req: NextApiRequest, res: NextApiResponse, user: any) {
  try {
    const data = createRecipeSchema.parse(req.body);

    const recipeId = `recipe_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const recipe = {
      id: recipeId,
      title: data.title,
      description: data.description,
      prepTime: data.prepTime,
      cookTime: data.cookTime,
      servings: data.servings,
      difficulty: data.difficulty,
      recipeType: data.recipeType,
      sourceUrl: data.sourceUrl,
      userId: user.id,
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
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await kv.set(`recipe:${recipeId}`, recipe);

    const userRecipeIds = await kv.get(`user_recipes:${user.id}`) as string[] || [];
    userRecipeIds.push(recipeId);
    await kv.set(`user_recipes:${user.id}`, userRecipeIds);

    res.status(201).json(recipe);
  } catch (error) {
    console.error('Create recipe error:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
}