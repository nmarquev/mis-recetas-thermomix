import OpenAI from 'openai';
import { z } from 'zod';
import { RecipeImportResponse } from '../types/recipe';
import axios from 'axios';

// Función auxiliar para limpiar etiquetas HTML del texto
function cleanHtmlFromText(text: string): string {
  if (!text) return text;
  return text
    .replace(/<nobr>/gi, '')
    .replace(/<\/nobr>/gi, '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')  // Remove all HTML tags
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

// Esquema de validation para respuesta LLM - VERSIÓN ULTRA RESILIENTE
const llmResponseSchema = z.object({
  error: z.boolean().optional(),
  title: z.string().min(1).catch('Receta Importada'), // título por defecto
  description: z.string().optional().nullable().transform(val => val || undefined),
  images: z.array(z.object({
    url: z.string().url().catch(''), // URLs inválidas se convierten en vacías
    altText: z.string().optional().nullable().transform(val => val || undefined),
    order: z.number().min(1).max(3).catch(1) // orden inválido se convierte en 1
  })).max(3).optional().catch([]).transform(val => val || []), // hacer imágenes completamente opcionales con fallback
  ingredients: z.array(z.object({
    name: z.string().min(1).catch('Ingrediente'), // nombre de ingrediente por defecto
    amount: z.string().min(0).transform(val => val?.trim() === '' ? 'al gusto' : (val || 'al gusto')),
    unit: z.string().optional().nullable().transform(val => val || undefined),
    section: z.string().optional().nullable().transform(val => val || undefined) // Sección para recetas multiparte
  }).catch({name: 'Ingrediente', amount: 'al gusto', unit: undefined, section: undefined})) // capturar errores de ingredientes individuales
    .transform(ingredients => ingredients.filter(ing => ing.name && ing.name.trim() !== '' && ing.name !== 'Ingrediente')) // filtrar nombres vacíos y fallback
    .transform(ingredients => ingredients.length > 0 ? ingredients : [{name: 'Ingredientes no especificados', amount: 'al gusto', unit: undefined, section: undefined}]), // asegurar al menos 1 ingrediente
  instructions: z.array(z.object({
    step: z.number().min(1).catch(1), // números de paso inválidos se convierten en 1
    description: z.string().min(1).transform(val => cleanHtmlFromText(val)).catch('Paso de preparación'), // Limpiar HTML y descripción fallback
    function: z.string().optional().nullable().transform(val => val || undefined), // Función Thermomix
    time: z.string().optional().nullable().transform(val => val || undefined), // Tiempo Thermomix
    temperature: z.string().optional().nullable().transform(val => val || undefined), // Temperatura Thermomix
    speed: z.string().optional().nullable().transform(val => val || undefined), // Velocidad Thermomix
    section: z.string().optional().nullable().transform(val => val || undefined) // Sección para recetas multiparte
  })).min(1).catch([{step: 1, description: 'Preparar según la receta original', function: undefined, time: undefined, temperature: undefined, speed: undefined, section: undefined}]), // mínimo 1 instrucción
  prepTime: z.number().min(1).nullable().catch(30).transform(val => val ?? 30), // siempre retornar número válido
  cookTime: z.number().nullable().optional().catch(null).transform(val => val === null ? undefined : val),
  servings: z.number().min(1).nullable().catch(4).transform(val => val ?? 4), // siempre retornar número válido
  difficulty: z.enum(['Fácil', 'Medio', 'Difícil']).nullable().catch('Medio').transform(val => val ?? 'Medio'), // siempre retornar dificultad válida
  recipeType: z.string().nullable().optional().catch(null).transform(val => val === null || val === '' ? undefined : val),
  tags: z.array(z.string()).max(4).optional().catch([]).transform(val => val || []) // Límite de 4 tags máximo
});

export class LLMServiceImproved {
  private openai: OpenAI;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('Variable de entorno OPENAI_API_KEY es requerida');
    }

    this.openai = new OpenAI({
      apiKey,
      timeout: 60000 // Timeout de 60 segundos para requests LLM
    });
  }

  async extractRecipeFromUrl(url: string): Promise<RecipeImportResponse> {
    console.log('\n🚀 INICIANDO EXTRACCIÓN DE RECETA');
    console.log('📍 URL:', url);

    try {
      // Check if it's a video URL and handle differently
      if (this.isVideoUrl(url)) {
        console.log('🎥 URL de video detectada, intentando extracción de transcripción...');
        return await this.extractRecipeFromVideo(url);
      }

      // Fetch HTML content for regular pages
      console.log('🌐 Obteniendo contenido web...');
      const html = await this.fetchWebContent(url);
      console.log('✅ Contenido web obtenido successfully');
      console.log('📏 Longitud del contenido:', html.length, 'characters');

      // Extract recipe data with LLM
      console.log('🤖 Iniciando extracción LLM...');
      const recipeData = await this.extractRecipeWithLLM(html, url);

      console.log('🎉 EXTRACCIÓN DE RECETA COMPLETADA EXITOSAMENTE');
      console.log('📋 Título final de receta:', recipeData.title);
      console.log('=====================================\n');

      return recipeData;
    } catch (error) {
      console.error('\n💥 EXTRACCIÓN DE RECETA FALLÓ');
      console.error('❌ Error:', error);
      console.error('📍 URL que falló:', url);
      console.error('=====================================\n');
      throw new Error(`Error al extraer receta: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  private isVideoUrl(url: string): boolean {
    const videoPatterns = [
      /youtube\.com\/watch/i,
      /youtu\.be\//i,
      /instagram\.com\/p\//i,
      /instagram\.com\/reel\//i,
      /instagram\.com\/tv\//i,
      /tiktok\.com\//i,
      /facebook\.com\/.*\/videos\//i,
      /vimeo\.com\//i,
    ];

    return videoPatterns.some(pattern => pattern.test(url));
  }

  private async extractRecipeFromVideo(url: string): Promise<RecipeImportResponse> {
    console.log('🎥 Procesando URL de video para extracción de receta');

    try {
      let content: string = '';

      if (url.includes('youtube.com') || url.includes('youtu.be')) {
        console.log('📺 Video de YouTube detectado');
        content = await this.extractYouTubeContent(url);
      } else if (url.includes('instagram.com')) {
        console.log('📷 Video de Instagram detectado');
        content = await this.extractInstagramContent(url);
      } else {
        console.log('🎬 Otra plataforma de video, obteniendo contenido de página');
        try {
          content = await this.fetchWebContent(url);
        } catch (fetchError) {
          console.log('Error al obtener contenido de video, usando URL como respaldo');
          content = `Video URL: ${url}\nPlatform: Other video platform`;
        }
      }

      // Ensure we have some content to work with
      if (!content || content.trim().length === 0) {
        content = `Video URL: ${url}\nNote: Limited content available for extraction.`;
      }

      console.log('📝 Longitud de contenido para procesar:', content.length, 'characters');

      // Use specialized video prompt
      const recipeData = await this.extractRecipeFromVideoContent(content, url);

      console.log('✅ Extracción de receta de video completada');
      return recipeData;

    } catch (error) {
      console.error('❌ Extracción de video falló:', error);

      // Create a fallback recipe based on the URL
      const fallbackRecipe = this.createFallbackVideoRecipe(url, error instanceof Error ? error.message : 'Error desconocido');
      return fallbackRecipe;
    }
  }

  private createFallbackVideoRecipe(url: string, errorMessage: string): RecipeImportResponse {
    console.log('🔄 Creando receta de respaldo para URL de video');

    const urlParts = url.split('/');
    const videoId = urlParts[urlParts.length - 1] || urlParts[urlParts.length - 2] || 'video';

    const fallbackTitle = url.includes('instagram.com') ? 'Receta de Instagram' :
                         url.includes('youtube.com') ? 'Receta de YouTube' :
                         url.includes('tiktok.com') ? 'Receta de TikTok' : 'Receta de Video';

    return {
      title: fallbackTitle,
      description: `Receta extraída de video. ID: ${videoId}`,
      images: [],
      ingredients: [
        { name: 'Ingredientes según el video', amount: 'al gusto', unit: undefined }
      ],
      instructions: [
        { step: 1, description: 'Seguir las instrucciones mostradas en el video' },
        { step: 2, description: 'Visitar el enlace original para ver el contenido completo' }
      ],
      prepTime: 30,
      cookTime: undefined,
      servings: 4,
      difficulty: 'Medio',
      recipeType: 'Video Recipe',
      tags: ['video', 'importado']
    };
  }

  private async extractYouTubeContent(url: string): Promise<string> {
    console.log('📺 Obteniendo página de YouTube para transcripción/descripción...');

    try {
      // Fetch the YouTube page to get video metadata, description, etc.
      const html = await this.fetchWebContent(url);

      // Extract key information from YouTube page
      // This includes title, description, and any available transcript information
      const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
      const descriptionMatch = html.match(/"shortDescription":"([^"]+)"/);
      const transcriptMatch = html.match(/"captions":\s*{[^}]*"playerCaptionsTracklistRenderer"/);

      let content = '';

      if (titleMatch) {
        content += `Title: ${titleMatch[1]}\n\n`;
      }

      if (descriptionMatch) {
        // Decode JSON string
        const description = descriptionMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
        content += `Description:\n${description}\n\n`;
      }

      if (transcriptMatch) {
        content += 'Note: Video has captions/transcript available\n';
      }

      // Extract video ID and add thumbnail image
      const videoIdMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
      if (videoIdMatch) {
        const videoId = videoIdMatch[1];
        // YouTube provides different quality thumbnails
        const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
        content += `\nVideo Thumbnail: ${thumbnailUrl}\n`;
        console.log('🖼️ Miniatura de YouTube extraída:', thumbnailUrl);
      }

      // Also include relevant metadata from the page
      const scriptMatches = html.match(/<script[^>]*>var ytInitialData = ({.*?});<\/script>/s);
      if (scriptMatches) {
        try {
          const data = JSON.parse(scriptMatches[1]);
          // Extract any recipe-related information from structured data
          const videoData = JSON.stringify(data).substring(0, 5000); // Limit size
          content += `\nVideo metadata:\n${videoData}`;
        } catch (parseError) {
          console.log('No se pudo parsear datos estructurados de YouTube');
        }
      }

      if (!content.trim()) {
        content = html; // Fallback to full HTML if we couldn't extract specific parts
      }

      return content;

    } catch (error) {
      console.error('Error al extraer contenido de YouTube:', error);
      throw error;
    }
  }

  private async extractInstagramContent(url: string): Promise<string> {
    console.log('📷 Obteniendo página de Instagram para caption/contenido...');

    try {
      const html = await this.fetchWebContent(url);

      if (!html || typeof html !== 'string' || html.length === 0) {
        throw new Error('No se recibió contenido HTML de Instagram');
      }

      // Extract Instagram post metadata
      const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
      const metaDescMatch = html.match(/<meta name="description" content="([^"]+)"/i);
      const ogDescMatch = html.match(/<meta property="og:description" content="([^"]+)"/i);
      const ogImageMatch = html.match(/<meta property="og:image" content="([^"]+)"/i);

      let content = '';

      if (titleMatch && titleMatch[1]) {
        content += `Title: ${titleMatch[1]}\n\n`;
      }

      if (metaDescMatch && metaDescMatch[1]) {
        content += `Description: ${metaDescMatch[1]}\n\n`;
      } else if (ogDescMatch && ogDescMatch[1]) {
        content += `Description: ${ogDescMatch[1]}\n\n`;
      }

      // Extract Instagram images - try multiple sources to avoid play button overlay
      const twitterImageMatch = html.match(/<meta name="twitter:image" content="([^"]+)"/i);
      const videoPosterMatch = html.match(/<meta property="og:video:poster" content="([^"]+)"/i);
      const videoThumbnailMatch = html.match(/<meta property="video:thumbnail" content="([^"]+)"/i);

      // Prefer alternative image sources that might not have play button overlay
      let selectedImageUrl = null;
      let imageSource = '';

      if (videoPosterMatch && videoPosterMatch[1]) {
        selectedImageUrl = videoPosterMatch[1];
        imageSource = 'video:poster';
        console.log('🖼️ Poster de video de Instagram encontrado (may have less overlay):', selectedImageUrl);
      } else if (videoThumbnailMatch && videoThumbnailMatch[1]) {
        selectedImageUrl = videoThumbnailMatch[1];
        imageSource = 'video:thumbnail';
        console.log('🖼️ Miniatura de video de Instagram encontrada:', selectedImageUrl);
      } else if (twitterImageMatch && twitterImageMatch[1]) {
        selectedImageUrl = twitterImageMatch[1];
        imageSource = 'twitter:image';
        console.log('🖼️ Imagen de twitter de Instagram encontrada (may have different overlay):', selectedImageUrl);
      } else if (ogImageMatch && ogImageMatch[1]) {
        selectedImageUrl = ogImageMatch[1];
        imageSource = 'og:image';
        console.log('🖼️ og:image de Instagram encontrada (likely has play button overlay):', selectedImageUrl);
      }

      // Look for structured data with recipe information and alternative images
      const jsonLdMatches = html.match(/<script type="application\/ld\+json">([^<]+)<\/script>/g);
      let jsonImageFound = false;

      if (jsonLdMatches && jsonLdMatches.length > 0) {
        for (const match of jsonLdMatches) {
          try {
            const jsonContent = match.replace(/<script[^>]*>/, '').replace(/<\/script>/, '');
            const data = JSON.parse(jsonContent);
            if (data) {
              // Look for images in JSON-LD data
              const findImages = (obj: any): string[] => {
                const images: string[] = [];
                if (typeof obj === 'string' && (obj.includes('.jpg') || obj.includes('.jpeg') || obj.includes('.png') || obj.includes('.webp'))) {
                  images.push(obj);
                } else if (Array.isArray(obj)) {
                  obj.forEach(item => images.push(...findImages(item)));
                } else if (typeof obj === 'object' && obj !== null) {
                  Object.values(obj).forEach(value => images.push(...findImages(value)));
                }
                return images;
              };

              const foundImages = findImages(data);
              if (foundImages.length > 0 && !selectedImageUrl) {
                // Prefer first image from JSON-LD if we don't have a better source
                selectedImageUrl = foundImages[0];
                imageSource = 'json-ld';
                console.log('🖼️ Imagen JSON-LD de Instagram encontrada:', selectedImageUrl);
                jsonImageFound = true;
              }

              content += `\nStructured data: ${JSON.stringify(data).substring(0, 2000)}\n`;
            }
          } catch (e) {
            // Continue with next match
            console.log('Error al parsear datos JSON-LD, continuando...');
          }
        }
      }

      // Add final selected image URL to content
      if (selectedImageUrl) {
        content += `Video Thumbnail (${imageSource}): ${selectedImageUrl}\n`;
      }

      // Try to extract content from Instagram's data
      const instagramDataMatch = html.match(/window\._sharedData\s*=\s*({.*?});/);
      if (instagramDataMatch && instagramDataMatch[1]) {
        try {
          const sharedData = JSON.parse(instagramDataMatch[1]);
          if (sharedData && sharedData.entry_data) {
            content += `\nInstagram data found: ${JSON.stringify(sharedData).substring(0, 1000)}\n`;
          }
        } catch (e) {
          console.log('Error al parsear datos compartidos de Instagram');
        }
      }

      if (!content.trim()) {
        // If we can't extract specific data, create a basic recipe from URL info
        const urlParts = url.split('/');
        const reelId = urlParts[urlParts.length - 1] || urlParts[urlParts.length - 2];
        content = `Instagram Reel ID: ${reelId}\nURL: ${url}\nNote: Limited content extraction from Instagram. Creating basic recipe from available information.`;
      }

      console.log('📱 Contenido de Instagram extracted:', content.length, 'characters');
      return content;

    } catch (error) {
      console.error('Error al extraer contenido de Instagram:', error);
      // Return a fallback content instead of throwing
      return `Instagram Video URL: ${url}\nNote: Could not extract detailed content. Creating basic recipe from URL information.`;
    }
  }

  private async extractRecipeFromVideoContent(content: string, sourceUrl: string): Promise<RecipeImportResponse> {
    console.log('🤖 Processing video content with specialized prompt...');

    try {
      if (!content || content.trim().length === 0) {
        throw new Error('No content provided for video extraction');
      }

      const videoPrompt = this.buildVideoExtractionPrompt(content);

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Eres un extractor especializado de recetas de videos de cocina. Responde rápido sin demoras en razonamiento. Tu trabajo es extraer información de recetas desde:
- Títulos y descripciones de videos de cocina
- Transcripciones o subtítulos cuando estén disponibles
- Metadatos de videos que contengan recetas

BUSCA información sobre:
- Ingredientes mencionados en títulos, descripciones o transcripciones
- Pasos de preparación descritos en el contenido
- Tiempos de cocción o preparación mencionados
- Número de porciones
- Dificultad (si se menciona)

IMPORTANTE para videos:
- Si solo tienes el título/descripción, infiere los ingredientes básicos
- Para ingredientes sin cantidades específicas, usa "al gusto"
- Crea pasos básicos de preparación basados en el tipo de receta
- Si no hay información completa, proporciona una receta básica funcional

La respuesta DEBE ser un JSON válido con la estructura exacta solicitada.`
          },
          {
            role: 'user',
            content: videoPrompt
          }
        ],
        max_completion_tokens: 4000,
        response_format: { type: 'json_object' }
      });

      const responseContent = completion.choices[0]?.message?.content;
      if (!responseContent) {
        throw new Error('No response content from OpenAI API');
      }

      console.log('📄 LLM Response received');
      console.log('📏 Response longitud:', responseContent.length, 'characters');

      let parsedResponse: any;
      try {
        parsedResponse = JSON.parse(responseContent);
      } catch (parseError) {
        console.error('❌ JSON Parse Error:', parseError);
        console.error('📄 Raw response:', responseContent.substring(0, 500));
        throw new Error('Error al parse LLM response as JSON');
      }

      // Apply ultra-resilient validation
      console.log('🛡️ Applying ultra-resilient validation...');
      const validatedData = llmResponseSchema.parse(parsedResponse);

      console.log('✅ Validation successful!');
      console.log('📊 Final data:', {
        title: validatedData.title,
        ingredientsCount: validatedData.ingredients?.length || 0,
        instructionsCount: validatedData.instructions?.length || 0,
        imagesCount: validatedData.images?.length || 0
      });

      // Clean title by removing emojis
      const cleanedTitle = this.cleanRecipeTitle(validatedData.title || 'Receta de Video');

      return {
        title: cleanedTitle,
        description: validatedData.description || '',
        prepTime: validatedData.prepTime || 0,
        cookTime: validatedData.cookTime || 0,
        servings: validatedData.servings || 1,
        difficulty: validatedData.difficulty || 'Medio',
        recipeType: validatedData.recipeType,
        images: (validatedData.images || []).filter(img => img.url && typeof img.order === 'number') as any[],
        ingredients: (validatedData.ingredients || []).filter(ing => ing.name && ing.amount) as any[],
        instructions: (validatedData.instructions || []).filter(inst => inst.description && typeof inst.step === 'number') as any[],
        tags: validatedData.tags || []
      };

    } catch (error) {
      console.error('❌ Error in extractRecipeFromVideoContent:', error);
      throw error; // Re-throw to be handled by the calling method
    }
  }

  private buildVideoExtractionPrompt(content: string): string {
    // Limit content size for API limits
    const truncatedContent = content.length > 8000 ? content.substring(0, 8000) + '\n[Content truncated...]' : content;

    return `Extrae una receta de este contenido de video de cocina.

IMPORTANTE para imágenes:
- Si encuentras "Video Thumbnail:" seguido de una URL, inclúyela en el array de imágenes
- Las imágenes de thumbnails de videos son válidas para recetas
- Usa order: 1 para la imagen principal del thumbnail

Si el contenido es limitado (solo título/descripción), crea una receta básica pero completa basándote en:
- El tipo de plato mencionado
- Ingredientes comunes para ese tipo de comida
- Pasos básicos de preparación típicos

Formato JSON requerido:
{
  "title": "Título exacto o inferido del plato",
  "description": "Descripción breve del plato",
  "images": [
    {
      "url": "URL_del_thumbnail_si_está_disponible",
      "altText": "descripción de la imagen del video",
      "order": 1
    }
  ],
  "ingredients": [
    {"name": "ingrediente", "amount": "cantidad_o_al_gusto", "unit": "unidad_si_aplica"}
  ],
  "instructions": [
    {"step": 1, "description": "paso_de_preparación_detallado"}
  ],
  "prepTime": tiempo_estimado_en_minutos,
  "cookTime": tiempo_cocción_si_aplica,
  "servings": porciones_estimadas,
  "difficulty": "Fácil|Medio|Difícil",
  "recipeType": "tipo_de_receta",
  "tags": ["etiquetas_relevantes"]
}

Contenido del video:
${truncatedContent}`;
  }

  private async fetchWebContent(url: string): Promise<string> {
    console.log('🌐 Fetching content from:', url);

    // Cookpad-specific headers to bypass anti-bot measures
    const cookpadHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br, zstd',
      'Cache-Control': 'max-age=0',
      'Sec-Ch-Ua': '"Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"',
      'Sec-Ch-Ua-Mobile': '?0',
      'Sec-Ch-Ua-Platform': '"Windows"',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'same-origin',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1',
      'Referer': 'https://cookpad.com/',
      'Origin': 'https://cookpad.com'
    };

    const modernHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
      'Sec-Ch-Ua-Mobile': '?0',
      'Sec-Ch-Ua-Platform': '"Windows"',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1',
      'DNT': '1',
      'Connection': 'keep-alive'
    };

    // Cookidoo-specific headers with additional auth-like headers
    const cookidooHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br, zstd',
      'Cache-Control': 'max-age=0',
      'Sec-Ch-Ua': '"Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"',
      'Sec-Ch-Ua-Mobile': '?0',
      'Sec-Ch-Ua-Platform': '"Windows"',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'same-origin',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1',
      'Referer': 'https://cookidoo.international/',
      'Origin': 'https://cookidoo.international'
    };

    // Use specific headers based on domain
    let headers;
    if (url.includes('cookpad.com')) {
      headers = cookpadHeaders;
    } else if (url.includes('cookidoo.international')) {
      headers = cookidooHeaders;
    } else {
      headers = modernHeaders;
    }

    try {
      console.log('🔄 Attempt 1: Site-specific headers with axios...');

      // Add delay for cookpad and other sites that might have rate limiting
      if (url.includes('cookpad.com')) {
        console.log('⏳ Adding delay for cookpad.com...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      const response = await axios({
        method: 'GET',
        url: url,
        headers: headers,
        timeout: 45000, // Increased from 30s to 45s (50% increase)
        maxRedirects: 5,
        responseType: 'text',
        validateStatus: (status) => status < 400,
        // Additional settings for specific sites
        withCredentials: false
      });

      console.log('✅ Axios request successful!');
      console.log('📊 Response info:', {
        status: response.status,
        statusText: response.statusText,
        contentType: response.headers['content-type'],
        contentLength: response.data.length
      });

      console.log('📏 Longitud del contenido:', response.data.length, 'characters');

      // Detect Cookidoo authentication issues
      if (url.includes('cookidoo.international') && this.isCookidooLoginPage(response.data)) {
        console.log('🔒 Cookidoo authentication required - content indicates login needed');
        throw new Error('Cookidoo requiere estar autenticado para acceder a esta receta. Por favor, abre la URL en tu navegador donde ya estés logueado y copia el contenido de la receta manualmente.');
      }

      return response.data;

    } catch (axiosError: any) {
      console.log('❌ Axios attempt failed:', axiosError.message);
      console.log('🔄 Attempt 2: Simplified headers with axios...');

      try {
        const simplifiedResponse = await axios({
          method: 'GET',
          url: url,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8'
          },
          timeout: 45000, // Increased from 30s to 45s (50% increase)
          maxRedirects: 5,
          responseType: 'text',
          validateStatus: (status) => status < 400
        });

        console.log('✅ Simplified axios successful!');
        console.log('📏 Longitud del contenido:', simplifiedResponse.data.length, 'characters');
        return simplifiedResponse.data;

      } catch (secondError: any) {
        console.log('❌ Second axios attempt also failed:', secondError.message);

        // Last attempt with basic fetch as fallback
        console.log('🔄 Attempt 3: Basic fetch fallback...');
        try {
          const response = await fetch(url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          const content = await response.text();
          console.log('✅ Basic fetch successful!');
          console.log('📏 Longitud del contenido:', content.length, 'characters');
          return content;

        } catch (fetchError) {
          console.log('❌ Basic fetch also failed:', fetchError instanceof Error ? fetchError.message : 'Error desconocido');
          throw new Error(`Error al fetch content from URL after all attempts: ${axiosError.message}`);
        }
      }
    }
  }

  private async extractRecipeWithLLM(html: string, sourceUrl: string): Promise<RecipeImportResponse> {
    const prompt = this.buildExtractionPrompt(html, sourceUrl);

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
    console.log('\n🚀 Enviando solicitud a OpenAI...');

    let parsedResponse: any;
    let responseContent: string | undefined;
    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Eres un extractor de recetas de cocina. Responde directamente sin razonamiento extenso. Tu trabajo es encontrar y extraer recetas de páginas web.

BUSCA cualquier contenido que contenga:
- Lista de ingredientes + instrucciones de preparación
- Cantidades + ingredientes + pasos de cocina
- Cualquier información culinaria estructurada

EXTRAE los datos EXACTAMENTE como aparecen:
- Cantidades: tal como están escritas ("200g", "1 taza", "un poquito")
- Ingredientes: nombres completos, no omitas ninguno
- Instrucciones: copia el texto exacto
- Tiempos y porciones: valores exactos mencionados

⚠️ INSTRUCCIONES - REGLAS CRÍTICAS:
- Si ves pasos numerados (1., 2., 3...) incluye TODOS sin excepción
- Si ves bullets o guiones (-, *, •) incluye TODOS los puntos
- Si hay párrafos largos, divídelos en pasos lógicos
- NUNCA generes comentarios como "instrucciones no visibles" o "preparación típica basada en..."
- SOLO incluye pasos de cocina reales: "Mezclar", "Hornear", "Añadir", etc.
- Si no hay instrucciones visibles, genera pasos básicos SIN comentarios explicativos
- Cada step debe ser una acción concreta de cocina

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
        max_completion_tokens: 4000
      });

      console.log('\n✅ LLM RESPONSE RECEIVED');
      console.log('💰 Usage:', completion.usage);

      responseContent = completion.choices[0]?.message?.content || undefined;

      console.log('\n📋 RAW LLM RESPONSE:');
      console.log('---');
      console.log(responseContent);
      console.log('\n=== 🤖 LLM REQUEST END ===\n');
      if (!responseContent) {
        throw new Error('Respuesta vacía de LLM');
      }

      // Parse and validate response
      console.log('🔄 Parsing JSON response...');
      try {
        parsedResponse = JSON.parse(responseContent);
      } catch (parseError) {
        throw new SyntaxError('JSON inválido respuesta de LLM');
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
      console.log('  - Cantidad de ingredientes:', validatedData.ingredients.length);
      console.log('  - Cantidad de instrucciones:', validatedData.instructions.length);
      console.log('  - Cantidad de imágenes:', validatedData.images.length);
      console.log('  - Tiempo de preparación:', validatedData.prepTime, 'minutos');
      console.log('  - Porciones:', validatedData.servings);
      console.log('  - Dificultad:', validatedData.difficulty);

      // Log sections
      const ingredientsWithSection = validatedData.ingredients.filter(ing => ing.section);
      const instructionsWithSection = validatedData.instructions.filter(inst => inst.section);
      console.log('📦 SECCIONES DETECTADAS:');
      console.log('  - Ingredientes con sección:', ingredientsWithSection.length, '/', validatedData.ingredients.length);
      console.log('  - Instrucciones con sección:', instructionsWithSection.length, '/', validatedData.instructions.length);
      if (ingredientsWithSection.length > 0) {
        const ingredientSections = [...new Set(ingredientsWithSection.map(ing => ing.section))];
        console.log('  - Secciones de ingredientes:', ingredientSections);
      }
      if (instructionsWithSection.length > 0) {
        const instructionSections = [...new Set(instructionsWithSection.map(inst => inst.section))];
        console.log('  - Secciones de instrucciones:', instructionSections);
      }

      // Clean title to remove emojis
      const cleanTitle = this.cleanRecipeTitle(validatedData.title);

      // Transform to our interface
      return {
        title: cleanTitle,
        description: validatedData.description,
        images: this.deduplicateImages(validatedData.images || []).filter(img => img.url && img.url.trim() !== '') as any[], // filter out empty URLs and duplicates
        ingredients: validatedData.ingredients.filter(ing => ing.name && ing.amount).map((ing, index) => ({
          ...ing,
          order: index + 1
        })) as any[],
        instructions: validatedData.instructions.filter(inst => inst.description && typeof inst.step === 'number').sort((a, b) => a.step - b.step) as any[],
        prepTime: validatedData.prepTime,
        cookTime: validatedData.cookTime,
        servings: validatedData.servings,
        difficulty: validatedData.difficulty,
        recipeType: validatedData.recipeType,
        tags: validatedData.tags
      };
    } catch (error: any) {
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
        throw new Error('Datos de receta inválidos data extracted from page');
      }

      if (error instanceof SyntaxError) {
        console.error('🔧 JSON parse error details:', error.message);
        console.error('📋 Raw response that failed to parse:');
        console.error(responseContent);
        throw new Error('Formato de respuesta inválido de LLM');
      }

      console.error('🚨 Error inesperado:', error);
      throw error;
    }
  }

  private buildExtractionPrompt(html: string, sourceUrl?: string): string {
    // Truncate HTML if too long to avoid token limits
    const maxHtmlLength = 20000;
    const truncatedHtml = html.length > maxHtmlLength
      ? html.substring(0, maxHtmlLength) + '...[truncated]'
      : html;

    // Check if this is a Cookidoo recipe
    const isCookidoo = sourceUrl?.includes('cookidoo.international') || false;

    return `Analiza esta página web y busca CUALQUIER contenido relacionado con recetas de cocina.

🔍 SÉ MUY FLEXIBLE EN LA DETECCIÓN - BUSCA:
- Listas de ingredientes (formales o informales)
- Instrucciones de preparación (paso a paso o párrafos)
- Recetas en blogs, comentarios, descripciones de videos
- Menciones de cantidades + ingredientes + preparación
- Cualquier contenido culinario que pueda ser una receta

🚨 PERO SÉ PRECISO EN LA EXTRACCIÓN - NO MODIFIQUES NADA:
- CANTIDADES: Extrae EXACTAMENTE ("300g", "1 cdta", "2 tazas", "un puñado")
  * Si NO hay cantidad específica (ej: "sal", "aceite"), usa string VACÍO "" en amount
  * ⚠️ CRÍTICO: Si la cantidad YA incluye unidad (ej: "40g"), NO dupliques en unit
  * Formato correcto: {"name": "mantequilla", "amount": "40", "unit": "g"}
  * Formato INCORRECTO: {"amount": "40 g", "unit": "g"} → resultaría en "40 g g"
- INGREDIENTES: Nombres COMPLETOS y EXACTOS, no omitas ninguno
- INSTRUCCIONES: Transcribe SIN MODIFICAR, mantén el texto original, LIMPIA tags HTML
- TIEMPOS/PORCIONES: Valores EXACTOS o estimaciones mencionadas

🔢 INSTRUCCIONES - CAPTURA TODOS LOS PASOS COMPLETOS:
- Si hay secuencia numerada (1., 2., 3...) incluye TODOS los números sin saltar
- Si hay viñetas/bullets (-, *, •) incluye TODOS los puntos
- Si un paso tiene sub-pasos o detalles, inclúyelos completos
- Verifica que no falten pasos en la secuencia (ej: si ves 1,2,4 busca el 3)
- Mantén orden exacto y numeración como aparece

${isCookidoo ? `
🚨 COOKIDOO/THERMOMIX ESPECIAL:
Esta es una receta de Cookidoo.international (Thermomix). EXTRACCIÓN MEJORADA:

1. PORCIONES - EXTRACCIÓN PRECISA:
   - Busca números antes de: "personas", "porciones", "raciones", "comensales", "servings"
   - Si dice "4-6 personas" → usa el número MAYOR: 6
   - Si dice "rinde 8 porciones" → usa 8
   - Busca iconos de personas (👥, 🍽️) con números cerca
   - Formato JSON: "servings": 8 (número entero)

2. INSTRUCCIONES - Si están vacías/incompletas:
   - COMPLETA usando tu conocimiento de recetas Thermomix
   - Basándote en ingredientes, genera pasos lógicos
   - NO dejes instrucciones vacías

3. CONFIGURACIONES THERMOMIX (NUEVO - MUY IMPORTANTE):
   Cada paso puede tener hasta 4 datos Thermomix. Busca en el TEXTO del paso:

   a) FUNCIÓN: Palabras clave como:
      - Amasar, Batir, Picar, Mezclar, Triturar, Cocinar, Calentar
      - Emulsionar, Moler, Sofreír, Cocer, etc.
      - Formato: "function": "Amasar"

   b) TIEMPO: Patrones como:
      - "2 min", "30 seg", "5 segundos", "1 minuto"
      - Formato: "time": "2 min" o "time": "30 sec"

   c) TEMPERATURA: Busca:
      - Números + "°C", "grados", o palabra "Varoma"
      - Formato: "temperature": "80°C" o "temperature": "Varoma"

   d) VELOCIDAD: Busca:
      - "vel 1-10", "velocidad 5", "v.10", "Mariposa", "Turbo"
      - Formato: "speed": "5" o "speed": "Mariposa"

   Ejemplo de paso Thermomix:
   Texto: "Amasar 2 min / 90°C / vel 3"
   JSON: {
     "step": 1,
     "description": "Amasar 2 min / 90°C / vel 3",
     "function": "Amasar",
     "time": "2 min",
     "temperature": "90°C",
     "speed": "3"
   }

4. TAGS - SOLO 3-4 RELEVANTES:
   - Ingrediente principal (ej: "pollo", "chocolate")
   - Tipo de plato (ej: "postre", "entrada")
   - Característica especial (ej: "sin gluten", "vegano")
   - NO incluyas nombres de recetas similares
   - Máximo 4 tags
` : ''}

⭐ IMÁGENES: Busca hasta 3 URLs de imágenes de comida/cocina.

📦 RECETAS MULTIPARTE (si aplica):
Si la receta tiene múltiples componentes (ej: plato + salsa + guarnición):
- DETECTA secciones por títulos: "Plato principal", "Salsa", "Acompañamiento", "Para la base", etc.
- ASIGNA cada ingrediente a su sección usando campo "section"
- Si NO hay secciones, usa "section": null

⚠️ INSTRUCCIONES - MUY IMPORTANTE:
1. **EXTRAE TODOS LOS PASOS NUMERADOS** - Si hay 11 pasos numerados, debes devolver exactamente 11 pasos
2. **PARSEA CONFIGURACIONES THERMOMIX DEL TEXTO**:
   - Si ves "15 seg/vel 10" → time: "15 seg", speed: "vel 10"
   - Si ves "5 min/100°" → time: "5 min", temperature: "100°"
   - Si ves "2 min/80°/vel 3" → time: "2 min", temperature: "80°", speed: "vel 3"
   - Si NO encuentras configuraciones, deja los campos como null
   - NO es obligatorio que todos los pasos tengan configuraciones Thermomix
3. **LIMPIA EL TEXTO**:
   - Elimina configuraciones Thermomix de la descripción después de parsearlas
   - Ejemplo: "Agregar harina. 15 seg/vel 10" → description: "Agregar harina", time: "15 seg", speed: "vel 10"

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
    {"name": "nombre", "amount": "cantidad", "unit": "unidad", "section": "Componente 1"},
    {"name": "nombre", "amount": "cantidad", "unit": "", "section": null}
  ],
  "instructions": [
    {
      "step": 1,
      "description": "Colocar ingredientes en el vaso (sin configuraciones Thermomix en el texto)",
      "function": "Picar",
      "time": "15 seg",
      "temperature": null,
      "speed": "vel 10",
      "section": "Componente 1"
    },
    {
      "step": 2,
      "description": "Otro paso (texto limpio sin configuraciones)",
      "function": null,
      "time": "2 min",
      "temperature": "100°",
      "speed": null,
      "section": null
    }
    // ⚠️ IMPORTANTE: Si el HTML tiene 11 pasos, JSON debe tener 11 pasos
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
- **NO OMITAS PASOS DE INSTRUCCIONES** - Cuenta cuántos pasos numerados hay en el HTML y devuelve exactamente ese número

✅ ANTES DE RESPONDER:
1. Cuenta los pasos numerados en la sección de instrucciones del HTML
2. Verifica que tu JSON tenga exactamente ese número de pasos
3. Busca patrones como "X min/Y°/vel Z" en cada paso y extrae las configuraciones

Contenido HTML:
${truncatedHtml}`;
  }

  // For compatibility with existing code
  async extractRecipeFromHtml(html: string, sourceUrl: string): Promise<RecipeImportResponse> {
    return this.extractRecipeWithLLM(html, sourceUrl);
  }

  /**
   * Elimina emojis de un texto
   */
  private removeEmojis(text: string): string {
    // Regex que detecta la mayoría de emojis Unicode
    const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F900}-\u{1F9FF}]|[\u{1F018}-\u{1F270}]|[\u{238C}]|[\u{2194}-\u{2199}]|[\u{21A9}-\u{21AA}]|[\u{231A}]|[\u{231B}]|[\u{23E9}-\u{23F3}]|[\u{25FD}-\u{25FE}]|[\u{2614}]|[\u{2615}]|[\u{2648}-\u{2653}]|[\u{267F}]|[\u{2693}]|[\u{26A1}]|[\u{26AA}]|[\u{26AB}]|[\u{26BD}]|[\u{26BE}]|[\u{26C4}]|[\u{26C5}]|[\u{26CE}]|[\u{26D4}]|[\u{26EA}]|[\u{26F2}]|[\u{26F3}]|[\u{26F5}]|[\u{26FA}]|[\u{26FD}]|[\u{2705}]|[\u{270A}]|[\u{270B}]|[\u{2728}]|[\u{274C}]|[\u{274E}]|[\u{2753}-\u{2755}]|[\u{2757}]|[\u{2795}-\u{2797}]|[\u{27B0}]|[\u{27BF}]|[\u{2B1B}]|[\u{2B1C}]|[\u{2B50}]|[\u{2B55}]/gu;
    return text.replace(emojiRegex, '').trim();
  }

  /**
   * Limpia un título de receta eliminando emojis y espacios extra
   */
  private cleanRecipeTitle(title: string): string {
    return this.removeEmojis(title).replace(/\s+/g, ' ').trim();
  }

  /**
   * Extract multiple recipes from PDF pages using GPT-4o-mini multimodal (for PDF processing)
   */
  async extractMultipleRecipesFromPdfPages(pages: { pageNum: number; imageBase64: string; text?: string }[]): Promise<{ success: boolean; recipes: any[]; error?: string }> {
    try {
      console.log('🤖 Enviando PDF pages to GPT-4o-mini for multimodal recipe extraction...');
      console.log(`📄 Processing ${pages.length} PDF pages`);

      const prompt = `
Analiza estas páginas de un documento PDF que contiene recetas de cocina.

IMPORTANTE - Busca y extrae información tanto VISUAL como TEXTUAL:

🔍 ELEMENTOS VISUALES A DETECTAR:
- ICONOS de reloj/tiempo (⏰) para tiempos de preparación y cocción
- ICONOS de personas/cubiertos (👥🍽️) para número de porciones
- ICONOS de dificultad (⭐) o nivel de habilidad
- IMÁGENES DE RECETAS: Fotos de platos terminados, ingredientes, pasos (NO incluir páginas completas)
- LAYOUT y disposición visual para entender estructura de recetas

🖼️ IMPORTANTE PARA IMÁGENES:
- Si detectas UNA FOTO CLARA del plato terminado, marca hasImage: true
- Si solo ves texto/página completa sin foto del plato, marca hasImage: false
- NO uses thumbnails de páginas completas como imágenes de recetas

📝 ELEMENTOS TEXTUALES A EXTRAER:
- Títulos de recetas
- Listas de ingredientes con cantidades exactas
- Instrucciones paso a paso
- Metadatos (categoría, tipo de plato, etc.)

⚠️ REGLAS IMPORTANTES:
- NO inventes tiempos/porciones si no ves iconos o texto específico
- Si detectas iconos visuales, úsalos para extraer datos precisos
- Incluye referencias a imágenes si las detectas
- Detecta correctamente dónde termina una receta y empieza otra
- Usa la disposición visual para entender la estructura

🎯 CLASIFICACIÓN AUTOMÁTICA:
- DIFFICULTY: Analiza complejidad de ingredientes e instrucciones ("Fácil", "Medio", "Difícil")
- RECIPE_TYPE: Clasifica por tipo de plato ("postre", "plato principal", "entrada", "bebida", "snack", "acompañamiento", "salsa")
- TAGS: Genera 3-4 etiquetas relevantes basadas en ingredientes principales, técnica de cocción, dieta especial, etc.

Responde SOLO con un JSON válido con este formato exacto:
{
  "recipes": [
    {
      "title": "Título exacto de la receta",
      "description": "Descripción incluyendo referencias a imágenes detectadas",
      "prepTime": 30,
      "cookTime": 45,
      "servings": 4,
      "hasImage": true,
      "imageUrl": "recipe_photo_detected", // Si detectas foto del plato, usa este valor
      "difficulty": "Fácil",
      "recipeType": "postre",
      "tags": ["chocolate", "sin gluten", "vegano", "navidad"],
      "ingredients": [
        {"name": "naranja en rodajas para decorar", "amount": "1", "unit": ""},
        {"name": "edulcorante de fruta del monje", "amount": "140-155", "unit": "gramos"}
      ],
      "instructions": [
        {"step": 1, "description": "Paso 1 de la preparación"},
        {"step": 2, "description": "Paso 2 de la preparación"}
      ],
      "pageNumbers": [1, 2]
    }
  ]
}
`;

      // Build multimodal messages with page images
      const messages: any[] = [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt
            },
            ...pages.map(page => ({
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${page.imageBase64}`,
                detail: 'high'
              }
            }))
          ]
        }
      ];

      console.log(`🖼️ Enviando ${pages.length} page images to GPT-4o-mini for multimodal analysis`);

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages,
        max_completion_tokens: 8000,
        response_format: { type: 'json_object' }
      });

      const content = response.choices[0]?.message?.content?.trim();
      if (!content) {
        throw new Error('Respuesta vacía de GPT-4o-mini');
      }

      console.log('🤖 GPT-4o-mini Response received, parsing JSON...');

      // Parse the JSON response
      let jsonResponse;
      try {
        // Try to extract JSON if wrapped in markdown or other formatting
        const jsonMatch = content.match(/```json\n(.*)\n```/s) ||
                         content.match(/```\n(.*)\n```/s) ||
                         content.match(/\{[\s\S]*\}/);
        const jsonString = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
        jsonResponse = JSON.parse(jsonString);
      } catch (parseError) {
        console.error('❌ Error al parse GPT-5-mini JSON response:', parseError);
        console.log('Raw response sample:', content.substring(0, 500));
        throw new Error('JSON inválido respuesta de GPT-5-mini');
      }

      if (!jsonResponse.recipes || !Array.isArray(jsonResponse.recipes)) {
        throw new Error('GPT-5-mini response does not contain recipes array');
      }

      console.log(`✅ Successfully extracted ${jsonResponse.recipes.length} recipes from PDF pages`);
      jsonResponse.recipes.forEach((recipe, index) => {
        console.log(`  ${index + 1}. "${recipe.title}" (${recipe.ingredients?.length || 0} ingredients, ${recipe.instructions?.length || 0} steps, hasImage: ${recipe.hasImage})`);
      });

      return {
        success: true,
        recipes: jsonResponse.recipes
      };

    } catch (error: any) {
      console.error('❌ Error in GPT-5-mini PDF recipe extraction:', error);
      return {
        success: false,
        recipes: [],
        error: error.message
      };
    }
  }

  /**
   * Extract multiple recipes from a document text (for DOCX processing)
   */
  async extractMultipleRecipesFromDocument(documentText: string): Promise<{ success: boolean; recipes: any[]; error?: string }> {
    try {
      console.log('🤖 Enviando document to LLM for multiple recipe extraction...');
      console.log(`📄 Document longitud: ${documentText.length} characters`);

      const prompt = `
Analiza el siguiente documento y extrae TODAS las recetas que encuentres. El documento puede contener múltiples recetas.

Para cada receta que encuentres, extrae:
- Título de la receta
- Descripción (si existe)
- Tiempo de preparación (en minutos, solo números)
- Tiempo de cocción (en minutos, solo números)
- Número de porciones (solo números)
- Lista completa de ingredientes con cantidades exactas
- Lista completa de instrucciones paso a paso
- Tipo de receta (ej: "postre", "plato principal", "entrada", "bebida", "snack")
- Etiquetas/tags relevantes (máximo 5)
- Si hay referencias a imágenes embebidas, menciónalas en la descripción

IMPORTANTE:
- Si una receta tiene metadatos como "Nombre:", "Categoría:", etc., úsalos
- Detecta correctamente dónde termina una receta y empieza otra
- Incluye TODA la información disponible para cada receta
- No inventes información que no esté en el documento
- Si hay imágenes mencionadas o embebidas, inclúyelas en la descripción
- Para recipe type y tags, infiere basándote en ingredientes y tipo de preparación

Responde SOLO con un JSON válido con este formato exacto:
{
  "recipes": [
    {
      "title": "Título exacto de la receta",
      "description": "Descripción o información adicional",
      "prepTime": 30,
      "cookTime": 45,
      "servings": 4,
      "recipeType": "postre",
      "tags": ["dulce", "sin gluten", "keto", "navidad"],
      "ingredients": [
        "1 naranja, más extra en rodajas para decorar",
        "140-155 gramos edulcorante de fruta del monje"
      ],
      "instructions": [
        "Paso 1 de la preparación",
        "Paso 2 de la preparación"
      ]
    }
  ]
}

DOCUMENTO A ANALIZAR:
${documentText}
`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_completion_tokens: 8000,
        response_format: { type: 'json_object' }
      });

      const content = response.choices[0]?.message?.content?.trim();
      if (!content) {
        throw new Error('Respuesta vacía de OpenAI');
      }

      console.log('🤖 LLM Response received, parsing JSON...');

      // Parse the JSON response
      let jsonResponse;
      try {
        jsonResponse = JSON.parse(content);
      } catch (parseError) {
        console.error('❌ Error al parse LLM JSON response:', parseError);
        console.log('Raw response sample:', content.substring(0, 500));
        throw new Error('JSON inválido respuesta de LLM');
      }

      if (!jsonResponse.recipes || !Array.isArray(jsonResponse.recipes)) {
        throw new Error('LLM response does not contain recipes array');
      }

      console.log(`✅ Successfully extracted ${jsonResponse.recipes.length} recipes from document`);
      jsonResponse.recipes.forEach((recipe, index) => {
        console.log(`  ${index + 1}. "${recipe.title}" (${recipe.ingredients?.length || 0} ingredients, ${recipe.instructions?.length || 0} steps)`);
      });

      return {
        success: true,
        recipes: jsonResponse.recipes
      };

    } catch (error: any) {
      console.error('❌ Error in LLM multiple recipe extraction:', error);
      return {
        success: false,
        recipes: [],
        error: error.message
      };
    }
  }

  /**
   * Extract recipe from direct text content (for DOCX processing)
   */
  async extractRecipeFromText(
    text: string,
    options: { suggestedTitle?: string; context?: string } = {}
  ): Promise<RecipeImportResponse> {
    console.log('\n🚀 INICIANDO EXTRACCIÓN DE RECETA FROM TEXT');
    console.log('📏 Text longitud:', text.length, 'characters');
    console.log('💡 Suggested title:', options.suggestedTitle || 'none');
    console.log('🏷️ Context:', options.context || 'general');

    try {
      const prompt = this.buildTextExtractionPrompt(text, options);

      console.log('\n=== 🤖 TEXT EXTRACTION LLM REQUEST START ===');
      console.log('🎯 Model: gpt-5-mini');
      console.log('🌡️ Temperature: 0.1');
      console.log('📄 Max Tokens: 4000');

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Eres un extractor de recetas especializado en procesar contenido de documentos Word. Extrae información directamente sin análisis prolongado.

TAREA: Extraer UNA receta completa del texto proporcionado.

REGLAS ESTRICTAS:
- Extrae datos EXACTAMENTE como aparecen, sin modificaciones
- Si encuentras múltiples recetas en el texto, extrae solo la PRIMERA completa
- Cantidades: mantén formato original ("200g", "1 cucharada", "al gusto")
- Ingredientes: nombres completos sin omitir ninguno
- Instrucciones: texto original sin cambios, todos los pasos en orden

FORMATO ESPERADO: JSON válido con estructura exacta solicitada.

Si el texto no contiene una receta válida, responde: {"error": true}`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        response_format: { type: 'json_object' },
        max_completion_tokens: 4000
      });

      console.log('\n✅ LLM RESPONSE RECEIVED');
      console.log('💰 Usage:', completion.usage);

      const responseContent = completion.choices[0]?.message?.content;
      if (!responseContent) {
        throw new Error('Respuesta vacía de LLM');
      }

      console.log('\n📋 RAW TEXT EXTRACTION RESPONSE:');
      console.log('---');
      console.log(responseContent.substring(0, 1000) + (responseContent.length > 1000 ? '...[truncated]' : ''));
      console.log('\n=== 🤖 TEXT EXTRACTION LLM REQUEST END ===\n');

      // Parse and validate response
      console.log('🔄 Parsing JSON response...');
      let parsedResponse: any;
      try {
        parsedResponse = JSON.parse(responseContent);
      } catch (parseError) {
        console.error('❌ JSON Parse Error:', parseError);
        throw new SyntaxError('JSON inválido respuesta de LLM');
      }

      console.log('🔍 Parsed response keys:', Object.keys(parsedResponse));

      // Check for error flag
      if (parsedResponse.error) {
        console.log('❌ LLM returned error flag - no recipe found in text');
        throw new Error('No valid recipe found in provided text');
      }

      console.log('✅ No error flag detected, proceeding with validation...');

      // Validate with schema
      console.log('🛡️ Validating response with Zod schema...');
      const validatedData = llmResponseSchema.parse(parsedResponse);
      console.log('✅ Schema validation passed successfully');

      console.log('📊 Extracted recipe summary:');
      console.log('  - Title:', validatedData.title);
      console.log('  - Cantidad de ingredientes:', validatedData.ingredients.length);
      console.log('  - Cantidad de instrucciones:', validatedData.instructions.length);
      console.log('  - Tiempo de preparación:', validatedData.prepTime, 'minutos');
      console.log('  - Porciones:', validatedData.servings);

      // Clean title
      const cleanTitle = this.cleanRecipeTitle(validatedData.title);

      return {
        title: cleanTitle,
        description: validatedData.description,
        images: (validatedData.images || []).filter(img => img.url && typeof img.order === 'number') as any[], // DOCX typically won't have images
        ingredients: validatedData.ingredients.filter(ing => ing.name && ing.amount).map((ing, index) => ({
          ...ing,
          order: index + 1
        })) as any[],
        instructions: validatedData.instructions.filter(inst => inst.description && typeof inst.step === 'number').sort((a, b) => a.step - b.step) as any[],
        prepTime: validatedData.prepTime,
        cookTime: validatedData.cookTime,
        servings: validatedData.servings,
        difficulty: validatedData.difficulty,
        recipeType: validatedData.recipeType,
        tags: validatedData.tags
      };

    } catch (error: any) {
      console.log('\n❌ ERROR IN TEXT EXTRACTION');
      console.log('Error type:', error.constructor.name);
      console.log('Error message:', error.message);

      if (error instanceof z.ZodError) {
        console.error('🛡️ Zod validation errors:');
        error.errors.forEach((err, index) => {
          console.error(`  ${index + 1}. Path: ${err.path.join('.')} - ${err.message}`);
        });
        throw new Error('Datos de receta inválidos data extracted from text');
      }

      if (error instanceof SyntaxError) {
        console.error('🔧 JSON parse error details:', error.message);
        throw new Error('Formato de respuesta inválido de LLM');
      }

      console.error('🚨 Error inesperado:', error);
      throw error;
    }
  }

  /**
   * Generate text using OpenAI for general purposes
   */
  async generateText(prompt: string): Promise<{ success: boolean; content?: string; error?: string }> {
    try {
      console.log('🤖 Generando texto con LLM...');
      console.log('📏 Prompt longitud:', prompt.length, 'characters');

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Eres un asistente especializado en cocina que ayuda a generar scripts naturales y conversacionales para recetas. Responde directamente sin demoras.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_completion_tokens: 2000
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error('Respuesta vacía de OpenAI');
      }

      console.log('✅ Text generation successful');
      console.log('📏 Response longitud:', content.length, 'characters');

      return {
        success: true,
        content: content.trim()
      };

    } catch (error: any) {
      console.error('❌ Error in text generation:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Build extraction prompt for direct text content
   */
  private buildTextExtractionPrompt(
    text: string,
    options: { suggestedTitle?: string; context?: string } = {}
  ): string {
    // Truncate text if too long
    const maxTextLength = 15000; // Smaller limit for text-only content
    const truncatedText = text.length > maxTextLength
      ? text.substring(0, maxTextLength) + '\n...[texto truncado]'
      : text;

    let contextHint = '';
    if (options.context === 'docx_import') {
      contextHint = `\n🗒️ CONTEXTO: Este texto proviene de un documento Word (.docx) que puede contener múltiples recetas.
Si encuentras varias recetas, extrae solo la PRIMERA receta completa que encuentres.`;
    }

    let titleHint = '';
    if (options.suggestedTitle) {
      titleHint = `\n📝 TÍTULO SUGERIDO: "${options.suggestedTitle}" (usa este como referencia, pero extrae el título real del texto)`;
    }

    return `Extrae UNA receta completa del siguiente texto.
${contextHint}${titleHint}

📋 INSTRUCCIONES DE EXTRACCIÓN:
- Busca patrones típicos: título, ingredientes, preparación/instrucciones
- Extrae cantidades EXACTAS como aparecen ("200g", "1 cucharada", "al gusto")
- Incluye TODOS los ingredientes mencionados sin omitir ninguno
- Captura TODOS los pasos de preparación en orden
- Si hay tiempos mencionados, extráelos exactamente
- Si hay número de porciones, extráelo

📊 FORMATO JSON REQUERIDO:
{
  "title": "Título exacto de la receta extracted del texto",
  "description": "Descripción breve si está disponible",
  "images": [],
  "ingredients": [
    {"name": "nombre_exacto_ingrediente", "amount": "cantidad_exacta", "unit": "unidad_si_separada"}
  ],
  "instructions": [
    {"step": 1, "description": "primer_paso_completo_exacto"},
    {"step": 2, "description": "segundo_paso_sin_modificar"}
  ],
  "prepTime": tiempo_preparacion_minutos_numero,
  "cookTime": tiempo_coccion_minutos_numero_o_null,
  "servings": numero_porciones,
  "difficulty": "Fácil|Medio|Difícil",
  "recipeType": "tipo_de_receta_si_mencionado",
  "tags": ["etiquetas_relevantes"]
}

⚠️ Si no encuentras una receta válida en el texto, responde: {"error": true}

TEXTO A PROCESAR:
${truncatedText}`;
  }

  /**
   * Calculate nutritional information for a recipe based on ingredients and servings
   */
  async calculateNutrition(ingredients: Array<{name: string; amount: string; unit?: string}>, servings: number = 4): Promise<{
    success: boolean;
    nutrition?: {
      calories: number;
      protein: number;
      carbohydrates: number;
      fat: number;
      fiber: number;
      sugar: number;
      sodium: number;
    };
    error?: string;
  }> {
    try {
      console.log('🥗 Iniciando nutrition calculation...');
      console.log('📊 Cantidad de ingredientes:', ingredients.length);
      console.log('🍽️ Porciones:', servings);

      const ingredientsList = ingredients.map(ing =>
        `${ing.amount} ${ing.unit || ''} ${ing.name}`.trim()
      ).join('\n');

      const prompt = `Calcula la información nutricional de esta receta con la mayor precisión posible.

INGREDIENTES DE LA RECETA (${servings} porciones):
${ingredientsList}

INSTRUCCIONES:
1. Para cada ingrediente, calcula: calorías, grasa total, sodio, carbohidratos totales, fibra, azúcares y proteína en la cantidad estipulada
2. Suma todos los valores para obtener el total de la receta
3. Divide el resultado entre ${servings} porciones para obtener valores por porción

IMPORTANTE - Estimaciones para ingredientes "al gusto":
- Si no hay cantidad específica o dice "al gusto", haz una estimación realista:
  * Sal: ~1 cucharadita (5g) para platos salados
  * Pimienta: ~1/4 cucharadita (0.5g)
  * Azúcar: ~1-2 cucharaditas (5-10g) para postres
  * Aceite para cocinar: ~1-2 cucharadas (15-30ml)
  * Especias secas: ~1/2 cucharadita (1-2g)
  * Hierbas frescas: ~1 cucharada (3-5g)

Responde SOLO con JSON, valores POR PORCIÓN:
{
  "calories": [número],
  "protein": [número],
  "carbohydrates": [número],
  "fat": [número],
  "fiber": [número],
  "sugar": [número],
  "sodium": [número]
}`;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Eres un nutricionista experto. Utiliza tu conocimiento nutricional para calcular valores precisos y realistas. Responde rápidamente en JSON válido sin razonamiento extenso.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_completion_tokens: 500,
        response_format: { type: "json_object" }
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error('Respuesta vacía de OpenAI');
      }

      console.log('📦 Raw nutrition response:', content);

      let parsedResponse;
      try {
        parsedResponse = JSON.parse(content);
      } catch (parseError) {
        console.error('❌ JSON parse error:', parseError);
        throw new Error('JSON inválido respuesta de AI');
      }

      // Validate required nutritional fields
      const requiredFields = ['calories', 'protein', 'carbohydrates', 'fat', 'fiber', 'sugar', 'sodium'];
      for (const field of requiredFields) {
        if (typeof parsedResponse[field] !== 'number') {
          throw new Error(`Missing or invalid ${field} in nutrition response`);
        }
      }

      console.log('✅ Nutrition calculation successful');
      console.log('📊 Calculated nutrition per serving:', parsedResponse);

      return {
        success: true,
        nutrition: {
          calories: Math.round(parsedResponse.calories * 10) / 10,
          protein: Math.round(parsedResponse.protein * 10) / 10,
          carbohydrates: Math.round(parsedResponse.carbohydrates * 10) / 10,
          fat: Math.round(parsedResponse.fat * 10) / 10,
          fiber: Math.round(parsedResponse.fiber * 10) / 10,
          sugar: Math.round(parsedResponse.sugar * 10) / 10,
          sodium: Math.round(parsedResponse.sodium)
        }
      };

    } catch (error: any) {
      console.error('❌ Error in nutrition calculation:', error);
      return {
        success: false,
        error: error.message || 'Error al calcular información nutricional'
      };
    }
  }

  /**
   * Search for real recipes using AI with natural language queries
   */
  async searchRecipesWithAI(query: string, count: number = 3, offset: number = 0): Promise<{ success: boolean; recipes: any[]; error?: string; hasMore?: boolean }> {
    try {
      console.log('🔍 Iniciando AI recipe search...');
      console.log('📝 Query:', query);
      console.log('📊 Count:', count, 'Offset:', offset);

      const offsetInstruction = offset > 0
        ? `IMPORTANTE: Esta es una búsqueda de continuación (offset: ${offset}). Busca recetas DIFERENTES y NUEVAS que no habrías mostrado en búsquedas anteriores de la misma consulta. Varía los sitios web y tipos de recetas.`
        : '';

      const prompt = `Busca ${count} recetas reales que coincidan con: "${query}"

${offsetInstruction}

INSTRUCCIONES CRUCIALES:
- Busca recetas EXISTENTES en sitios web reales de cocina
- Incluye la URL REAL y verificable de donde encontraste cada receta
- Extrae todos los datos completos de esas recetas originales
- NO inventes URLs, utiliza fuentes reales y conocidas

🖼️ IMÁGENES - MUY IMPORTANTE:
- Para cada receta, busca SOLO URLs de imágenes que sean públicamente accesibles
- Usa ÚNICAMENTE estas fuentes confiables:
  * Unsplash: https://images.unsplash.com/photo-[ID]?w=800
  * Pexels: https://images.pexels.com/photos/[ID]/[description].jpeg
  * Pixabay: https://cdn.pixabay.com/photo/[year]/[month]/[day]/[ID].jpg
- EJEMPLOS DE URLs REALES QUE FUNCIONAN:
  * Pasta: "https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=800"
  * Pizza: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=800"
  * Ensalada: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800"
  * Pollo: "https://images.unsplash.com/photo-1606728035253-49e8a23146de?w=800"
- Si no puedes encontrar una imagen apropiada, déjalo VACÍO (no inventes URLs)

🚨 IMPORTANTE PARA URLs:
- TODAS las URLs deben comenzar con "https://"
- NO uses URLs incompletas o relativas
- Verifica que el formato sea correcto: https://sitio.com/ruta-completa
- Ejemplos de URLs válidas:
  • https://www.recetasgratis.net/receta-de-flan-de-coco-72345.html
  • https://cookpad.com/es/recetas/8765432-tarta-de-chocolate
  • https://www.allrecipes.com/recipe/123456/chocolate-cake

🍎 INFORMACIÓN NUTRICIONAL OBLIGATORIA:
- Calcula los valores nutricionales POR PORCIÓN basándote en los ingredientes
- Usa tu conocimiento nutricional para estimar valores realistas
- Incluye: calorías, proteínas (g), carbohidratos (g), grasas (g), fibra (g), azúcar (g), sodio (mg)
- Sé preciso: los valores deben ser coherentes con los ingredientes y cantidades
- Ejemplo: 100g de pollo = ~165 cal, 31g proteína, 0g carbohidratos, 3.6g grasa

🤖 CONFIGURACIONES THERMOMIX (cuando aplique):
- Si la receta es compatible con Thermomix o proviene de un sitio Thermomix, incluye configuraciones por paso:
- time: tiempo de procesamiento (ej: "30 sec", "2 min", "5 min")
- temperature: temperatura de cocción (ej: "80°C", "100°C", "Varoma", "sin temperatura")
- speed: velocidad del robot (ej: "3", "5", "7", "10", "Mariposa", "Turbo")
- Si un paso NO requiere Thermomix, puedes omitir thermomixSettings o usar valores null
- Solo incluye estos datos si la receta original los menciona o es claramente adaptable a Thermomix

Responde ÚNICAMENTE con JSON válido en este formato:
{
  "recipes": [
    {
      "title": "Título exacto de la receta encontrada",
      "description": "Descripción original del sitio web",
      "sourceUrl": "https://sitio-real.com/url-completa-de-la-receta",
      "siteName": "Nombre del sitio web",
      "foundAt": "${new Date().toISOString().split('T')[0]}",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800",
          "altText": "Imagen del plato terminado"
        }
      ],
      "ingredients": [
        {
          "name": "nombre del ingrediente",
          "amount": "cantidad",
          "unit": "unidad de medida"
        }
      ],
      "instructions": [
        {
          "step": 1,
          "description": "descripción completa del paso",
          "thermomixSettings": {
            "time": "tiempo en segundos o minutos (ej: '30 sec', '2 min')",
            "temperature": "temperatura en grados (ej: '80°C', 'Varoma')",
            "speed": "velocidad del 1-10 o especial (ej: '5', 'Mariposa')"
          }
        }
      ],
      "prepTime": 30,
      "cookTime": 25,
      "servings": 4,
      "difficulty": "Fácil",
      "recipeType": "Tipo de receta",
      "tags": ["etiquetas", "relevantes", "de", "la", "receta"],
      "nutritionalInfo": {
        "calories": 250,
        "protein": 12.5,
        "carbohydrates": 35.0,
        "fat": 8.2,
        "fiber": 4.1,
        "sugar": 6.5,
        "sodium": 480
      }
    }
  ]
}

NO agregues explicaciones antes o después del JSON. Responde solo con el JSON válido.`;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Eres un asistente experto en búsqueda de recetas que puede encontrar recetas reales en sitios web de cocina conocidos. Responde rápidamente con JSON válido sin análisis prolongado.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_completion_tokens: 4000,
        response_format: { type: "json_object" }
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error('Respuesta vacía de OpenAI');
      }

      console.log('📦 Raw AI response longitud:', content.length);

      let parsedResponse;
      try {
        parsedResponse = JSON.parse(content);
      } catch (parseError) {
        console.error('❌ JSON parse error:', parseError);
        throw new Error('JSON inválido respuesta de AI');
      }

      // Validate that we have recipes
      if (!parsedResponse.recipes || !Array.isArray(parsedResponse.recipes)) {
        throw new Error('Inválido response format: missing recipes array');
      }

      // Basic validation for each recipe
      const validatedRecipes = parsedResponse.recipes
        .filter((recipe: any) => {
          return recipe.title &&
                 recipe.sourceUrl &&
                 recipe.ingredients &&
                 Array.isArray(recipe.ingredients) &&
                 recipe.instructions &&
                 Array.isArray(recipe.instructions);
        })
        .map((recipe: any) => ({
          ...recipe,
          // Ensure required fields have defaults
          description: recipe.description || 'Descripción no disponible',
          prepTime: recipe.prepTime || 30,
          servings: recipe.servings || 4,
          difficulty: recipe.difficulty || 'Medio',
          tags: recipe.tags || [],
          images: recipe.images || [],
          siteName: recipe.siteName || new URL(recipe.sourceUrl).hostname,
          foundAt: recipe.foundAt || new Date().toISOString().split('T')[0]
        }));

      console.log('✅ AI recipe search successful');
      console.log('📊 Found recipes:', validatedRecipes.length);

      if (validatedRecipes.length === 0) {
        return {
          success: false,
          recipes: [],
          error: 'No se encontraron recetas válidas para la consulta'
        };
      }

      return {
        success: true,
        recipes: validatedRecipes,
        hasMore: true // Siempre hay más recetas posibles
      };

    } catch (error: any) {
      console.error('❌ Error in AI recipe search:', error);
      return {
        success: false,
        recipes: [],
        error: error.message || 'Error al buscar recetas con IA'
      };
    }
  }

  private deduplicateImages(images: any[]): any[] {
    const seen = new Set<string>();
    const unique: any[] = [];

    for (const image of images) {
      if (!image?.url) continue;

      // Normalize URL for comparison (remove protocol, query params, etc.)
      const normalizedUrl = image.url
        .toLowerCase()
        .replace(/^https?:\/\//, '')
        .replace(/[?#].*$/, '');

      if (!seen.has(normalizedUrl)) {
        seen.add(normalizedUrl);
        unique.push({
          ...image,
          order: unique.length + 1 // Reorder after deduplication
        });
      }
    }

    console.log(`🖼️ Images deduplication: ${images.length} → ${unique.length}`);
    return unique;
  }

  private isCookidooLoginPage(htmlContent: string): boolean {
    const loginIndicators = [
      'Un mundo de recetas Thermomix®',
      'Accede a Cookidoo®',
      'Iniciar sesión',
      'Log in to Cookidoo',
      'Please sign in',
      'authentication required',
      'login-form',
      'signin-form',
      'cookidoo-login',
      'data-testid="login"',
      'class="login-page"',
      'id="loginForm"',
      'Inicia sesión en tu cuenta',
      'Sign in to your account',
      'Cookidoo® es la plataforma',
      'subscription required',
      'premium content',
      'members only',
      'exclusive content'
    ];

    const lowerHtml = htmlContent.toLowerCase();

    for (const indicator of loginIndicators) {
      if (lowerHtml.includes(indicator.toLowerCase())) {
        console.log(`🔍 Login indicator found: "${indicator}"`);
        return true;
      }
    }

    // Check for generic Cookidoo landing page content (usually indicates no access)
    const genericIndicators = [
      'miles de recetas exclusivas',
      'thousands of exclusive recipes',
      'recetas paso a paso',
      'step-by-step recipes',
      'guías de cocina',
      'cooking guides'
    ];

    for (const indicator of genericIndicators) {
      if (lowerHtml.includes(indicator.toLowerCase())) {
        console.log(`🔍 Generic content indicator found: "${indicator}"`);
        return true;
      }
    }

    // Check if we have actual recipe content indicators
    const recipeContentIndicators = [
      'ingredientes:',
      'ingredients:',
      'preparación:',
      'preparation:',
      'instrucciones:',
      'instructions:',
      'tiempo de preparación',
      'preparation time',
      'porciones:',
      'servings:',
      'recipe-ingredients',
      'recipe-instructions'
    ];

    let hasRecipeContent = false;
    for (const indicator of recipeContentIndicators) {
      if (lowerHtml.includes(indicator.toLowerCase())) {
        hasRecipeContent = true;
        break;
      }
    }

    if (!hasRecipeContent) {
      console.log('🔍 No recipe content indicators found - likely a login/generic page');
      return true;
    }

    console.log('✅ Recipe content detected - page appears to be accessible');
    return false;
  }
}