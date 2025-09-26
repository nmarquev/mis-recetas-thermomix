import OpenAI from 'openai';
import { z } from 'zod';
import { RecipeImportResponse } from '../types/recipe';
import axios from 'axios';

// Validation schema for LLM response - ULTRA RESILIENT VERSION
const llmResponseSchema = z.object({
  error: z.boolean().optional(),
  title: z.string().min(1).catch('Receta Importada'), // fallback title
  description: z.string().optional().nullable().transform(val => val || undefined),
  images: z.array(z.object({
    url: z.string().url().catch(''), // invalid URLs become empty
    altText: z.string().optional().nullable().transform(val => val || undefined),
    order: z.number().min(1).max(3).catch(1) // invalid order becomes 1
  })).max(3).optional().catch([]).transform(val => val || []), // make images completely optional with fallback
  ingredients: z.array(z.object({
    name: z.string().min(1).catch('Ingrediente'), // fallback ingredient name
    amount: z.string().min(0).transform(val => val?.trim() === '' ? 'al gusto' : (val || 'al gusto')),
    unit: z.string().optional().nullable().transform(val => val || undefined)
  }).catch({name: 'Ingrediente', amount: 'al gusto', unit: undefined})) // catch individual ingredient errors
    .transform(ingredients => ingredients.filter(ing => ing.name && ing.name.trim() !== '' && ing.name !== 'Ingrediente')) // filter out empty names and fallback names
    .transform(ingredients => ingredients.length > 0 ? ingredients : [{name: 'Ingredientes no especificados', amount: 'al gusto', unit: undefined}]), // ensure at least 1 ingredient
  instructions: z.array(z.object({
    step: z.number().min(1).catch(1), // invalid step numbers become 1
    description: z.string().min(1).catch('Paso de preparación') // fallback description
  })).min(1).catch([{step: 1, description: 'Preparar según la receta original'}]), // minimum 1 instruction
  prepTime: z.number().min(1).nullable().catch(30).transform(val => val ?? 30), // always return valid number
  cookTime: z.number().nullable().optional().catch(null).transform(val => val === null ? undefined : val),
  servings: z.number().min(1).nullable().catch(4).transform(val => val ?? 4), // always return valid number
  difficulty: z.enum(['Fácil', 'Medio', 'Difícil']).nullable().catch('Medio').transform(val => val ?? 'Medio'), // always return valid difficulty
  recipeType: z.string().nullable().optional().catch(null).transform(val => val === null || val === '' ? undefined : val),
  tags: z.array(z.string()).optional().catch([]).transform(val => val || []) // make tags completely optional with fallback
});

export class LLMServiceImproved {
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
      // Check if it's a video URL and handle differently
      if (this.isVideoUrl(url)) {
        console.log('🎥 Video URL detected, attempting transcript extraction...');
        return await this.extractRecipeFromVideo(url);
      }

      // Fetch HTML content for regular pages
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
    console.log('🎥 Processing video URL for recipe extraction');

    try {
      let content: string = '';

      if (url.includes('youtube.com') || url.includes('youtu.be')) {
        console.log('📺 YouTube video detected');
        content = await this.extractYouTubeContent(url);
      } else if (url.includes('instagram.com')) {
        console.log('📷 Instagram video detected');
        content = await this.extractInstagramContent(url);
      } else {
        console.log('🎬 Other video platform, fetching page content');
        try {
          content = await this.fetchWebContent(url);
        } catch (fetchError) {
          console.log('Failed to fetch video content, using URL as fallback');
          content = `Video URL: ${url}\nPlatform: Other video platform`;
        }
      }

      // Ensure we have some content to work with
      if (!content || content.trim().length === 0) {
        content = `Video URL: ${url}\nNote: Limited content available for extraction.`;
      }

      console.log('📝 Content length for processing:', content.length, 'characters');

      // Use specialized video prompt
      const recipeData = await this.extractRecipeFromVideoContent(content, url);

      console.log('✅ Video recipe extraction completed');
      return recipeData;

    } catch (error) {
      console.error('❌ Video extraction failed:', error);

      // Create a fallback recipe based on the URL
      const fallbackRecipe = this.createFallbackVideoRecipe(url, error instanceof Error ? error.message : 'Unknown error');
      return fallbackRecipe;
    }
  }

  private createFallbackVideoRecipe(url: string, errorMessage: string): RecipeImportResponse {
    console.log('🔄 Creating fallback recipe for video URL');

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
    console.log('📺 Fetching YouTube page for transcript/description...');

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
        console.log('🖼️ YouTube thumbnail extracted:', thumbnailUrl);
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
          console.log('Could not parse YouTube structured data');
        }
      }

      if (!content.trim()) {
        content = html; // Fallback to full HTML if we couldn't extract specific parts
      }

      return content;

    } catch (error) {
      console.error('Failed to extract YouTube content:', error);
      throw error;
    }
  }

  private async extractInstagramContent(url: string): Promise<string> {
    console.log('📷 Fetching Instagram page for caption/content...');

    try {
      const html = await this.fetchWebContent(url);

      if (!html || typeof html !== 'string' || html.length === 0) {
        throw new Error('No HTML content received from Instagram');
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
        console.log('🖼️ Instagram video poster found (may have less overlay):', selectedImageUrl);
      } else if (videoThumbnailMatch && videoThumbnailMatch[1]) {
        selectedImageUrl = videoThumbnailMatch[1];
        imageSource = 'video:thumbnail';
        console.log('🖼️ Instagram video thumbnail found:', selectedImageUrl);
      } else if (twitterImageMatch && twitterImageMatch[1]) {
        selectedImageUrl = twitterImageMatch[1];
        imageSource = 'twitter:image';
        console.log('🖼️ Instagram twitter image found (may have different overlay):', selectedImageUrl);
      } else if (ogImageMatch && ogImageMatch[1]) {
        selectedImageUrl = ogImageMatch[1];
        imageSource = 'og:image';
        console.log('🖼️ Instagram og:image found (likely has play button overlay):', selectedImageUrl);
      }

      // We'll add the selected image URL after checking all sources

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
                console.log('🖼️ Instagram JSON-LD image found:', selectedImageUrl);
                jsonImageFound = true;
              }

              content += `\nStructured data: ${JSON.stringify(data).substring(0, 2000)}\n`;
            }
          } catch (e) {
            // Continue with next match
            console.log('Failed to parse JSON-LD data, continuing...');
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
          console.log('Failed to parse Instagram shared data');
        }
      }

      if (!content.trim()) {
        // If we can't extract specific data, create a basic recipe from URL info
        const urlParts = url.split('/');
        const reelId = urlParts[urlParts.length - 1] || urlParts[urlParts.length - 2];
        content = `Instagram Reel ID: ${reelId}\nURL: ${url}\nNote: Limited content extraction from Instagram. Creating basic recipe from available information.`;
      }

      console.log('📱 Instagram content extracted:', content.length, 'characters');
      return content;

    } catch (error) {
      console.error('Failed to extract Instagram content:', error);
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
            content: `Eres un extractor especializado de recetas de videos de cocina. Tu trabajo es extraer información de recetas desde:
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
        temperature: 0.1,
        max_tokens: 4000,
        response_format: { type: 'json_object' }
      });

      const responseContent = completion.choices[0]?.message?.content;
      if (!responseContent) {
        throw new Error('No response content from OpenAI API');
      }

      console.log('📄 LLM Response received');
      console.log('📏 Response length:', responseContent.length, 'characters');

      let parsedResponse: any;
      try {
        parsedResponse = JSON.parse(responseContent);
      } catch (parseError) {
        console.error('❌ JSON Parse Error:', parseError);
        console.error('📄 Raw response:', responseContent.substring(0, 500));
        throw new Error('Failed to parse LLM response as JSON');
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
        ...validatedData,
        title: cleanedTitle
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

    // Use cookpad-specific headers for cookpad.com
    const headers = url.includes('cookpad.com') ? cookpadHeaders : modernHeaders;

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
        timeout: 30000,
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

      console.log('📏 Content length:', response.data.length, 'characters');
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
          timeout: 30000,
          maxRedirects: 5,
          responseType: 'text',
          validateStatus: (status) => status < 400
        });

        console.log('✅ Simplified axios successful!');
        console.log('📏 Content length:', simplifiedResponse.data.length, 'characters');
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
          console.log('📏 Content length:', content.length, 'characters');
          return content;

        } catch (fetchError) {
          console.log('❌ Basic fetch also failed:', fetchError instanceof Error ? fetchError.message : 'Unknown error');
          throw new Error(`Failed to fetch content from URL after all attempts: ${axiosError.message}`);
        }
      }
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

    let parsedResponse: any;
    let responseContent: string | undefined;
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

⚠️ INSTRUCCIONES - CAPTURA TODOS LOS PASOS:
- Si ves pasos numerados (1., 2., 3...) incluye TODOS sin excepción
- Si ves bullets o guiones (-, *, •) incluye TODOS los puntos
- Si hay párrafos largos, divídelos en pasos lógicos
- Verifica que no falte ningún paso de la secuencia
- Mantén el orden exacto como aparece en la página

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

      responseContent = completion.choices[0]?.message?.content || undefined;

      console.log('\n📋 RAW LLM RESPONSE:');
      console.log('---');
      console.log(responseContent);
      console.log('\n=== 🤖 LLM REQUEST END ===\n');
      if (!responseContent) {
        throw new Error('Empty response from LLM');
      }

      // Parse and validate response
      console.log('🔄 Parsing JSON response...');
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

      // Clean title to remove emojis
      const cleanTitle = this.cleanRecipeTitle(validatedData.title);

      // Transform to our interface
      return {
        title: cleanTitle,
        description: validatedData.description,
        images: validatedData.images.filter(img => img.url && img.url.trim() !== ''), // filter out empty URLs
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
  * Si NO hay cantidad específica (ej: "sal", "aceite"), usa string VACÍO "" en amount
- INGREDIENTES: Nombres COMPLETOS y EXACTOS, no omitas ninguno
- INSTRUCCIONES: Transcribe SIN MODIFICAR, mantén el texto original
- TIEMPOS/PORCIONES: Valores EXACTOS o estimaciones mencionadas

🔢 INSTRUCCIONES - CAPTURA TODOS LOS PASOS COMPLETOS:
- Si hay secuencia numerada (1., 2., 3...) incluye TODOS los números sin saltar
- Si hay viñetas/bullets (-, *, •) incluye TODOS los puntos
- Si un paso tiene sub-pasos o detalles, inclúyelos completos
- Verifica que no falten pasos en la secuencia (ej: si ves 1,2,4 busca el 3)
- Mantén orden exacto y numeración como aparece

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
    {"name": "nombre_exacto_del_ingrediente", "amount": "cantidad_exacta_como_aparece", "unit": "unidad_si_está_separada"},
    {"name": "ingrediente_sin_cantidad_específica", "amount": "", "unit": ""}
  ],
  "instructions": [
    {"step": 1, "description": "instrucción_completa_exacta_sin_modificar_incluyendo_detalles_thermomix"},
    {"step": 2, "description": "INCLUYE_TODOS_LOS_PASOS_SIN_SALTAR_NINGUNO"},
    {"step": 3, "description": "verifica_que_captures_secuencia_completa"}
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
}