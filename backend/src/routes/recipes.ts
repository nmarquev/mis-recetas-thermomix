import express from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

// Validation schemas
const createRecipeSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  prepTime: z.number().min(1),
  cookTime: z.number().optional().nullable(),
  servings: z.number().min(1),
  difficulty: z.enum(['Fácil', 'Medio', 'Difícil']),
  recipeType: z.string().optional(),
  sourceUrl: z.string().url().optional(),

  // Nutritional information (optional)
  calories: z.number().optional().nullable(),
  protein: z.number().optional().nullable(),
  carbohydrates: z.number().optional().nullable(),
  fat: z.number().optional().nullable(),
  fiber: z.number().optional().nullable(),
  sugar: z.number().optional().nullable(),
  sodium: z.number().optional().nullable(),

  images: z.array(z.object({
    url: z.string(),
    localPath: z.string().optional().nullable(),
    order: z.number(),
    altText: z.string().optional()
  })).max(3),
  ingredients: z.array(z.object({
    name: z.string().min(1),
    amount: z.string(),  // Allow empty amounts for "al gusto" ingredients
    unit: z.string().nullable().optional().transform(val => val ?? ''),
    order: z.number()
  })),
  instructions: z.array(z.object({
    step: z.number(),
    description: z.string().min(1),
    time: z.string().nullable().optional().transform(val => val ?? ''),
    temperature: z.string().nullable().optional().transform(val => val ?? ''),
    speed: z.string().nullable().optional().transform(val => val ?? '')
  })),
  tags: z.array(z.string()),
  featured: z.boolean().optional(),
  locution: z.string().optional().nullable()
});

// Update recipe schema (more flexible for updates)
const updateRecipeSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  prepTime: z.number().min(1),
  cookTime: z.number().optional().nullable(),
  servings: z.number().min(1),
  difficulty: z.enum(['Fácil', 'Medio', 'Difícil']),
  recipeType: z.string().optional(),
  sourceUrl: z.string().url().optional(),

  // Nutritional information (optional)
  calories: z.number().optional().nullable(),
  protein: z.number().optional().nullable(),
  carbohydrates: z.number().optional().nullable(),
  fat: z.number().optional().nullable(),
  fiber: z.number().optional().nullable(),
  sugar: z.number().optional().nullable(),
  sodium: z.number().optional().nullable(),

  images: z.array(z.object({
    url: z.string(),
    localPath: z.string().optional().nullable(),
    order: z.number(),
    altText: z.string().optional()
  })).max(3),
  ingredients: z.array(z.object({
    name: z.string().min(1),
    amount: z.string(),  // Allow empty amounts for "al gusto" ingredients
    unit: z.string().nullable().optional().transform(val => val ?? ''),
    order: z.number()
  })),
  instructions: z.array(z.object({
    step: z.number(),
    description: z.string().min(1),
    time: z.string().nullable().optional().transform(val => val ?? ''),
    temperature: z.string().nullable().optional().transform(val => val ?? ''),
    speed: z.string().nullable().optional().transform(val => val ?? '')
  })),
  tags: z.array(z.union([
    z.string(),
    z.object({
      tag: z.string(),
      tagId: z.string().optional()
    })
  ])),
  featured: z.boolean().optional(),
  locution: z.string().optional().nullable()
});

// Get all recipes for user
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const recipes = await prisma.recipe.findMany({
      where: { userId: req.user!.id },
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
      },
      orderBy: { createdAt: 'desc' }
    });

    // Transform the data to match frontend interface
    const transformedRecipes = recipes.map(recipe => ({
      ...recipe,
      tags: recipe.tags.map(rt => rt.tag.name),
      instructions: recipe.instructions.map(instruction => ({
        ...instruction,
        thermomixSettings: {
          time: instruction.time,
          temperature: instruction.temperature,
          speed: instruction.speed
        }
      }))
    }));

    res.json(transformedRecipes);
  } catch (error) {
    console.error('Get recipes error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single recipe
router.get('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const recipe = await prisma.recipe.findFirst({
      where: {
        id: req.params.id,
        userId: req.user!.id
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

    if (!recipe) {
      return res.status(404).json({ error: 'Recipe not found' });
    }

    // Transform the data
    const transformedRecipe = {
      ...recipe,
      tags: recipe.tags.map(rt => rt.tag.name),
      instructions: recipe.instructions.map(instruction => ({
        ...instruction,
        thermomixSettings: {
          time: instruction.time,
          temperature: instruction.temperature,
          speed: instruction.speed
        }
      }))
    };

    res.json(transformedRecipe);
  } catch (error) {
    console.error('Get recipe error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create recipe
router.post('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    console.log('🔍 DEBUG: Incoming recipe data:');
    console.log('📝 Ingredients type and sample:', typeof req.body.ingredients, Array.isArray(req.body.ingredients), req.body.ingredients?.slice(0, 2));
    console.log('📝 Instructions type and sample:', typeof req.body.instructions, Array.isArray(req.body.instructions), req.body.instructions?.slice(0, 2));

    const data = createRecipeSchema.parse(req.body);

    // Create recipe with related data
    const recipe = await prisma.recipe.create({
      data: {
        title: data.title,
        description: data.description,
        prepTime: data.prepTime,
        cookTime: data.cookTime,
        servings: data.servings,
        difficulty: data.difficulty,
        recipeType: data.recipeType,
        sourceUrl: data.sourceUrl,
        featured: data.featured,
        locution: data.locution,

        // Nutritional information
        calories: data.calories,
        protein: data.protein,
        carbohydrates: data.carbohydrates,
        fat: data.fat,
        fiber: data.fiber,
        sugar: data.sugar,
        sodium: data.sodium,

        userId: req.user!.id,
        images: {
          create: data.images.map(img => ({
            url: img.url,
            localPath: img.localPath,
            order: img.order,
            altText: img.altText
          }))
        },
        ingredients: {
          create: data.ingredients.map((ing, index) => ({
            name: ing.name,
            amount: ing.amount,
            unit: ing.unit,
            order: (ing as any).order || index + 1
          }))
        },
        instructions: {
          create: data.instructions.map(inst => ({
            step: inst.step,
            description: inst.description,
            time: inst.time,
            temperature: inst.temperature,
            speed: inst.speed
          }))
        },
        tags: {
          create: data.tags.map(tagName => ({
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
        images: true,
        ingredients: true,
        instructions: true,
        tags: {
          include: {
            tag: true
          }
        }
      }
    });

    // Transform the data to match frontend interface
    const transformedRecipe = {
      ...recipe,
      tags: recipe.tags.map(rt => rt.tag.name),
      instructions: recipe.instructions.map(instruction => ({
        ...instruction,
        thermomixSettings: {
          time: instruction.time,
          temperature: instruction.temperature,
          speed: instruction.speed
        }
      }))
    };

    res.status(201).json(transformedRecipe);
  } catch (error) {
    console.error('Create recipe error:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update recipe
router.put('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    console.log('📝 Update recipe request received for ID:', req.params.id);
    console.log('📝 Request body keys:', Object.keys(req.body));
    console.log('📝 Ingredients count:', req.body.ingredients?.length);
    console.log('📝 Instructions count:', req.body.instructions?.length);

    const data = updateRecipeSchema.parse(req.body);

    // Check if recipe belongs to user
    const existingRecipe = await prisma.recipe.findFirst({
      where: {
        id: req.params.id,
        userId: req.user!.id
      }
    });

    if (!existingRecipe) {
      return res.status(404).json({ error: 'Recipe not found' });
    }

    // Update recipe (this is a simplified version - in production you'd want more granular updates)
    const recipe = await prisma.recipe.update({
      where: { id: req.params.id },
      data: {
        title: data.title,
        description: data.description,
        prepTime: data.prepTime,
        cookTime: data.cookTime,
        servings: data.servings,
        difficulty: data.difficulty,
        recipeType: data.recipeType,
        sourceUrl: data.sourceUrl,
        featured: data.featured,
        locution: data.locution,

        // Nutritional information
        calories: data.calories,
        protein: data.protein,
        carbohydrates: data.carbohydrates,
        fat: data.fat,
        fiber: data.fiber,
        sugar: data.sugar,
        sodium: data.sodium,
        // For simplicity, we'll replace all related data
        images: {
          deleteMany: {},
          create: data.images.map(img => ({
            url: img.url,
            localPath: img.localPath,
            order: img.order,
            altText: img.altText
          }))
        },
        ingredients: {
          deleteMany: {},
          create: data.ingredients.map((ing, index) => ({
            name: ing.name,
            amount: ing.amount,
            unit: ing.unit,
            order: (ing as any).order || index + 1
          }))
        },
        instructions: {
          deleteMany: {},
          create: data.instructions.map(inst => ({
            step: inst.step,
            description: inst.description,
            time: inst.time,
            temperature: inst.temperature,
            speed: inst.speed
          }))
        },
        tags: {
          deleteMany: {},
          create: data.tags.map(tagData => {
            const tagName = typeof tagData === 'string' ? tagData : tagData.tag;
            return {
              tag: {
                connectOrCreate: {
                  where: { name: tagName },
                  create: { name: tagName }
                }
              }
            };
          })
        }
      },
      include: {
        images: true,
        ingredients: true,
        instructions: true,
        tags: {
          include: {
            tag: true
          }
        }
      }
    });

    // Transform the data to match frontend interface
    const transformedRecipe = {
      ...recipe,
      tags: recipe.tags.map(rt => rt.tag.name),
      instructions: recipe.instructions.map(instruction => ({
        ...instruction,
        thermomixSettings: {
          time: instruction.time,
          temperature: instruction.temperature,
          speed: instruction.speed
        }
      }))
    };

    res.json(transformedRecipe);
  } catch (error) {
    console.error('Update recipe error:', error);
    if (error instanceof z.ZodError) {
      console.error('🔍 Update recipe validation error details:', JSON.stringify(error.errors, null, 2));
      console.error('🔍 Failed fields:');
      error.errors.forEach(err => {
        console.error(`  Path: ${err.path.join('.')} - Code: ${err.code} - Message: ${err.message}`);
      });
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete recipe
router.delete('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const recipe = await prisma.recipe.findFirst({
      where: {
        id: req.params.id,
        userId: req.user!.id
      }
    });

    if (!recipe) {
      return res.status(404).json({ error: 'Recipe not found' });
    }

    await prisma.recipe.delete({
      where: { id: req.params.id }
    });

    res.json({ message: 'Recipe deleted successfully' });
  } catch (error) {
    console.error('Delete recipe error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;