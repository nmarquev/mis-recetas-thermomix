import { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { authenticateToken } from '../utils/auth';
import { put } from '@vercel/blob';
import OpenAI from 'openai';

const importUrlSchema = z.object({
  url: z.string().url()
});

const llmResponseSchema = z.object({
  error: z.boolean().optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  images: z.array(z.object({
    url: z.string().url(),
    altText: z.string().optional(),
    order: z.number().min(1).max(3)
  })).max(3),
  ingredients: z.array(z.object({
    name: z.string().min(1),
    amount: z.string().min(1),
    unit: z.string().optional()
  })),
  instructions: z.array(z.object({
    step: z.number().min(1),
    description: z.string().min(1)
  })),
  prepTime: z.number().min(1).nullable().transform(val => val ?? 30),
  cookTime: z.number().nullable().optional().transform(val => val ?? undefined),
  servings: z.number().min(1).nullable().transform(val => val ?? 4),
  difficulty: z.enum(['Fácil', 'Medio', 'Difícil']).nullable().transform(val => val ?? 'Medio'),
  recipeType: z.string().nullable().optional().transform(val => val ?? undefined),
  tags: z.array(z.string())
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = await authenticateToken(req);
  if (!user) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const { url } = importUrlSchema.parse(req.body);

    console.log(`Starting recipe import from: ${url}`);

    const recipeData = await extractRecipeFromUrl(url);

    console.log(`Extracted recipe: ${recipeData.title}`);
    console.log(`Found ${recipeData.images.length} images`);

    let processedImages = [];
    if (recipeData.images.length > 0) {
      console.log('Downloading and processing images...');
      try {
        const imageUrls = recipeData.images.map(img => img.url);
        processedImages = await downloadAndStoreImages(imageUrls);
        console.log(`Successfully processed ${processedImages.length} images`);
      } catch (imageError) {
        console.error('Image processing error:', imageError);
      }
    }

    const responseData = {
      title: recipeData.title,
      description: recipeData.description,
      prepTime: recipeData.prepTime,
      cookTime: recipeData.cookTime,
      servings: recipeData.servings,
      difficulty: recipeData.difficulty,
      recipeType: recipeData.recipeType,
      sourceUrl: url,
      images: processedImages.map(img => ({
        url: img.url,
        localPath: img.localPath,
        order: img.order,
        altText: img.altText
      })),
      ingredients: recipeData.ingredients,
      instructions: recipeData.instructions.map(inst => ({
        step: inst.step,
        description: inst.description,
        time: undefined,
        temperature: undefined,
        speed: undefined
      })),
      tags: recipeData.tags
    };

    res.json({
      success: true,
      recipe: responseData,
      preview: true
    });

  } catch (error) {
    console.error('Import error:', error);

    let errorMessage = 'Failed to import recipe';
    let statusCode = 500;

    if (error instanceof z.ZodError) {
      errorMessage = 'Invalid URL provided';
      statusCode = 400;
    } else if (error instanceof Error) {
      errorMessage = error.message;
      if (error.message.includes('No valid recipe found')) {
        statusCode = 404;
      } else if (error.message.includes('Failed to fetch')) {
        statusCode = 400;
      }
    }

    res.status(statusCode).json({
      success: false,
      error: errorMessage
    });
  }
}

async function extractRecipeFromUrl(url: string) {
  console.log('🚀 STARTING RECIPE EXTRACTION');
  console.log('📍 URL:', url);

  try {
    console.log('🌐 Fetching web content...');
    const html = await fetchWebContent(url);
    console.log('✅ Web content fetched successfully');

    console.log('🤖 Starting LLM extraction...');
    const recipeData = await extractRecipeWithLLM(html, url);

    console.log('🎉 RECIPE EXTRACTION COMPLETED SUCCESSFULLY');
    return recipeData;
  } catch (error) {
    console.error('💥 RECIPE EXTRACTION FAILED');
    console.error('❌ Error:', error);
    throw new Error(`Failed to extract recipe: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function fetchWebContent(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Charset': 'utf-8'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const buffer = await response.arrayBuffer();
    const decoder = new TextDecoder('utf-8');
    return decoder.decode(buffer);
  } catch (error) {
    throw new Error(`Failed to fetch content from URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function extractRecipeWithLLM(html: string, sourceUrl: string) {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });

  const prompt = buildExtractionPrompt(html);

  console.log('📤 Sending request to OpenAI...');
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: 'You are an expert at extracting structured recipe data from web content. Always respond with valid JSON only.' },
      { role: 'user', content: prompt }
    ],
    temperature: 0.3,
    max_tokens: 4000
  });

  const response = completion.choices[0]?.message?.content;
  if (!response) {
    throw new Error('No response from OpenAI');
  }

  console.log('📥 Response received from OpenAI');

  let parsedResponse;
  try {
    parsedResponse = JSON.parse(response);
  } catch (parseError) {
    console.error('❌ JSON Parse Error:', parseError);
    throw new Error('Invalid JSON response from LLM');
  }

  const validatedData = llmResponseSchema.parse(parsedResponse);
  return validatedData;
}

function buildExtractionPrompt(html: string): string {
  const cleanHtml = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  const truncatedHtml = cleanHtml.length > 8000 ? cleanHtml.substring(0, 8000) + '...' : cleanHtml;

  return `Extract recipe information from this HTML content and return it as valid JSON only. No explanation, just the JSON object.

HTML Content:
${truncatedHtml}

Extract and return a JSON object with this exact structure:
{
  "title": "Recipe name",
  "description": "Brief description (optional)",
  "images": [
    {
      "url": "full image URL",
      "altText": "image description",
      "order": 1
    }
  ],
  "ingredients": [
    {
      "name": "ingredient name",
      "amount": "quantity",
      "unit": "unit of measure"
    }
  ],
  "instructions": [
    {
      "step": 1,
      "description": "instruction text"
    }
  ],
  "prepTime": 30,
  "cookTime": 45,
  "servings": 4,
  "difficulty": "Fácil",
  "recipeType": "Main course",
  "tags": ["tag1", "tag2"]
}

Important requirements:
- Return ONLY valid JSON, no markdown formatting
- Extract maximum 3 images with full URLs
- Include all ingredients with amounts
- Number instructions sequentially starting from 1
- Use "Fácil", "Medio", or "Difícil" for difficulty
- If a field is not found, use null (not undefined)
- Ensure all URLs are complete and valid`;
}

async function downloadAndStoreImages(imageUrls: string[]) {
  const processedImages = [];

  for (let i = 0; i < Math.min(imageUrls.length, 3); i++) {
    try {
      const imageUrl = imageUrls[i];
      console.log(`Downloading image ${i + 1}: ${imageUrl}`);

      const response = await fetch(imageUrl);
      if (!response.ok) {
        console.log(`Failed to download image ${i + 1}: ${response.statusText}`);
        continue;
      }

      const buffer = await response.arrayBuffer();
      const contentType = response.headers.get('content-type') || 'image/jpeg';

      const timestamp = Date.now();
      const extension = contentType.includes('png') ? 'png' :
                      contentType.includes('webp') ? 'webp' : 'jpg';
      const filename = `recipe-image-${timestamp}-${i + 1}.${extension}`;

      const blob = await put(filename, buffer, {
        access: 'public',
        contentType: contentType
      });

      processedImages.push({
        url: blob.url,
        localPath: blob.url,
        order: i + 1,
        altText: `Recipe image ${i + 1}`
      });

      console.log(`Successfully processed image ${i + 1}`);
    } catch (error) {
      console.error(`Error processing image ${i + 1}:`, error);
    }
  }

  return processedImages;
}