import OpenAI from 'openai';
import { z } from 'zod';
import { RecipeImportResponse } from '../types/recipe';

// Validation schema for LLM response
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

export class LLMService {
  private openai: OpenAI;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }

    this.openai = new OpenAI({
      apiKey
    });
  }

  async extractRecipeFromUrl(url: string): Promise<RecipeImportResponse> {
    console.log('\n🚀 STARTING RECIPE EXTRACTION');
    console.log('📍 URL:', url);

    try {
      // Fetch HTML content
      console.log('🌐 Fetching web content...');
      const html = await this.fetchWebContent(url);
      console.log('✅ Web content fetched successfully');
      console.log('📏 Content length:', html.length, 'characters');

      // Extract recipe data with LLM
      console.log('🤖 Starting LLM extraction...');
      const recipeData = await this.extractRecipeWithLLM(html, url);

      console.log('🎉 RECIPE EXTRACTION COMPLETED SUCCESSFULLY');
      console.log('📋 Final recipe title:', recipeData.title);
      console.log('=====================================\n');

      return recipeData;
    } catch (error) {
      console.error('\n💥 RECIPE EXTRACTION FAILED');
      console.error('❌ Error:', error);
      console.error('📍 URL that failed:', url);
      console.error('=====================================\n');
      throw new Error(`Failed to extract recipe: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async fetchWebContent(url: string): Promise<string> {
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

      // Get content as buffer first, then decode as UTF-8
      const buffer = await response.arrayBuffer();
      const decoder = new TextDecoder('utf-8');
      return decoder.decode(buffer);
    } catch (error) {
      throw new Error(`Failed to fetch content from URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async extractRecipeWithLLM(html: string, sourceUrl: string): Promise<RecipeImportResponse> {
    const prompt = this.buildExtractionPrompt(html);

    console.log('\n=== 🤖 LLM REQUEST START ===');
    console.log('📍 Source URL:', sourceUrl);
    console.log('📝 HTML Content Length:', html.length, 'characters');
    console.log('🎯 Model:', 'gpt-4o-mini');
    console.log('🌡️ Temperature:', 0.1);
    console.log('📄 Max Tokens:', 4000);
    console.log('\n📋 SYSTEM PROMPT:');
    console.log('---');
    console.log(`Eres un extractor de recetas de cocina. Tu trabajo es encontrar y extraer recetas de páginas web.

BUSCA cualquier contenido que contenga:
- Lista de ingredientes + instrucciones de preparación
- Cantidades + ingredientes + pasos de cocina
- Cualquier información culinaria estructurada

EXTRAE los datos EXACTAMENTE como aparecen:
- Cantidades: tal como están escritas ("200g", "1 taza", "un poquito")
- Ingredientes: nombres completos, no omitas ninguno
- Instrucciones: copia el texto exacto
- Tiempos y porciones: valores exactos mencionados

IMÁGENES: Busca hasta 3 URLs de imágenes de comida

Si hay CUALQUIER indicio de receta (ingredientes + preparación), extráela.
Solo responde {"error": true} si definitivamente no hay ninguna receta en la página.`);
    console.log('\n📝 USER PROMPT (first 500 chars):');
    console.log('---');
    console.log(prompt.substring(0, 500) + (prompt.length > 500 ? '...[truncated]' : ''));
    console.log('\n🚀 Sending request to OpenAI...');

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Eres un extractor de recetas de cocina. Tu trabajo es encontrar y extraer recetas de páginas web.

BUSCA cualquier contenido que contenga:
- Lista de ingredientes + instrucciones de preparación
- Cantidades + ingredientes + pasos de cocina
- Cualquier información culinaria estructurada

EXTRAE los datos EXACTAMENTE como aparecen:
- Cantidades: tal como están escritas ("200g", "1 taza", "un poquito")
- Ingredientes: nombres completos, no omitas ninguno
- Instrucciones: copia el texto exacto
- Tiempos y porciones: valores exactos mencionados

IMÁGENES: Busca hasta 3 URLs de imágenes de comida

Si hay CUALQUIER indicio de receta (ingredientes + preparación), extráela.
Solo responde {"error": true} si definitivamente no hay ninguna receta en la página.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
        max_tokens: 4000
      });

      console.log('\n✅ LLM RESPONSE RECEIVED');
      console.log('💰 Usage:', completion.usage);

      const responseContent = completion.choices[0]?.message?.content;

      console.log('\n📋 RAW LLM RESPONSE:');
      console.log('---');
      console.log(responseContent);
      console.log('\n=== 🤖 LLM REQUEST END ===\n');
      if (!responseContent) {
        throw new Error('Empty response from LLM');
      }

      // Parse and validate response
      console.log('🔄 Parsing JSON response...');
      let parsedResponse;
      try {
        parsedResponse = JSON.parse(responseContent);
      } catch (parseError) {
        throw new SyntaxError('Invalid JSON response from LLM');
      }

      console.log('🔍 Parsed response keys:', Object.keys(parsedResponse));

      // Check for error flag
      if (parsedResponse.error) {
        console.log('❌ LLM returned error flag - no recipe found');
        throw new Error('No valid recipe found on this page');
      }

      console.log('✅ No error flag detected, proceeding with validation...');

      // Validate with schema
      console.log('🛡️ Validating response with Zod schema...');
      const validatedData = llmResponseSchema.parse(parsedResponse);
      console.log('✅ Schema validation passed successfully');

      console.log('📊 Extracted recipe summary:');
      console.log('  - Title:', validatedData.title);
      console.log('  - Ingredients count:', validatedData.ingredients.length);
      console.log('  - Instructions count:', validatedData.instructions.length);
      console.log('  - Images count:', validatedData.images.length);
      console.log('  - Prep time:', validatedData.prepTime, 'minutes');
      console.log('  - Servings:', validatedData.servings);
      console.log('  - Difficulty:', validatedData.difficulty);

      // Transform to our interface
      return {
        title: validatedData.title,
        description: validatedData.description,
        images: validatedData.images,
        ingredients: validatedData.ingredients.map((ing, index) => ({
          ...ing,
          order: index + 1
        })),
        instructions: validatedData.instructions.sort((a, b) => a.step - b.step),
        prepTime: validatedData.prepTime,
        cookTime: validatedData.cookTime,
        servings: validatedData.servings,
        difficulty: validatedData.difficulty,
        recipeType: validatedData.recipeType,
        tags: validatedData.tags
      };
    } catch (error) {
      console.log('\n❌ ERROR IN LLM PROCESSING');
      console.log('Error type:', error.constructor.name);
      console.log('Error message:', error.message);

      if (error instanceof z.ZodError) {
        console.error('🛡️ Zod validation errors:');
        error.errors.forEach((err, index) => {
          console.error(`  ${index + 1}. Path: ${err.path.join('.')} - ${err.message}`);
        });
        console.error('📋 Raw parsed response that failed validation:');
        console.error(JSON.stringify(parsedResponse || 'undefined', null, 2));
        throw new Error('Invalid recipe data extracted from page');
      }

      if (error instanceof SyntaxError) {
        console.error('🔧 JSON parse error details:', error.message);
        console.error('📋 Raw response that failed to parse:');
        console.error(responseContent);
        throw new Error('Invalid response format from LLM');
      }

      console.error('🚨 Unexpected error:', error);
      throw error;
    }
  }

  private buildExtractionPrompt(html: string): string {
    // Truncate HTML if too long to avoid token limits
    const maxHtmlLength = 20000;
    const truncatedHtml = html.length > maxHtmlLength
      ? html.substring(0, maxHtmlLength) + '...[truncated]'
      : html;

    return `Analiza esta página web y busca CUALQUIER contenido relacionado con recetas de cocina.

🔍 SÉ MUY FLEXIBLE EN LA DETECCIÓN - BUSCA:
- Listas de ingredientes (formales o informales)
- Instrucciones de preparación (paso a paso o párrafos)
- Recetas en blogs, comentarios, descripciones de videos
- Menciones de cantidades + ingredientes + preparación
- Cualquier contenido culinario que pueda ser una receta

🚨 PERO SÉ PRECISO EN LA EXTRACCIÓN - NO MODIFIQUES NADA:
- CANTIDADES: Extrae EXACTAMENTE ("300g", "1 cdta", "2 tazas", "un puñado")
- INGREDIENTES: Nombres COMPLETOS y EXACTOS, no omitas ninguno
- INSTRUCCIONES: Transcribe SIN MODIFICAR, mantén el texto original
- TIEMPOS/PORCIONES: Valores EXACTOS o estimaciones mencionadas

⭐ IMÁGENES: Busca hasta 3 URLs de imágenes de comida/cocina.

Extrae en formato JSON exacto:
{
  "title": "Título EXACTO de la receta tal como aparece",
  "description": "Descripción tal como está escrita (máximo 200 caracteres)",
  "images": [
    {
      "url": "URL_completa_absoluta_de_imagen",
      "altText": "descripción de la imagen",
      "order": 1
    }
  ],
  "ingredients": [
    {"name": "nombre_exacto_del_ingrediente", "amount": "cantidad_exacta_como_aparece", "unit": "unidad_si_está_separada"}
  ],
  "instructions": [
    {"step": 1, "description": "instrucción_completa_exacta_sin_modificar_incluyendo_detalles_thermomix"}
  ],
  "prepTime": tiempo_en_minutos_exacto,
  "cookTime": tiempo_cocción_en_minutos_si_existe,
  "servings": número_exacto_porciones,
  "difficulty": "Fácil|Medio|Difícil" (inferir del contexto),
  "recipeType": "tipo_de_receta_si_se_menciona",
  "tags": ["etiquetas_relevantes_basadas_en_contenido"]
}

❌ NO HAGAS:
- No cambies "200g" por "200 gramos"
- No omitas ingredientes
- No modifiques cantidades
- No agregues información que no está
- No conviertas unidades de medida

Contenido HTML:
${truncatedHtml}`;
  }
}