import * as mammoth from 'mammoth';
import { randomUUID } from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import {
  DocxProcessedContent,
  RecipeDetectionResult,
  DocxExtractedRecipe
} from '../types/docx';

export class DocxProcessor {
  private uploadDir: string;
  private tempFiles: Map<string, { buffer: Buffer; processedContent?: DocxProcessedContent }>;

  constructor() {
    this.uploadDir = process.env.UPLOAD_DIR || './uploads';
    this.tempFiles = new Map();
  }

  /**
   * Process DOCX buffer and extract text content with images
   */
  async processDocxBuffer(buffer: Buffer): Promise<DocxProcessedContent> {
    try {
      console.log('📄 Processing DOCX buffer...');

      const images: string[] = [];

      // Extract HTML with images convertido to base64
      const htmlResult = await mammoth.convertToHtml({ buffer }, {
        convertImage: mammoth.images.imgElement(async (image) => {
          try {
            console.log('🖼️ Extracting image from DOCX...');
            const imageBuffer = await image.read();
            const base64Image = imageBuffer.toString('base64');
            const mimeType = this.getImageMimeType(imageBuffer);
            const dataUrl = `data:${mimeType};base64,${base64Image}`;

            // Store image for later use
            images.push(dataUrl);

            return { src: dataUrl };
          } catch (error) {
            console.warn('⚠️ Error al extract image:', error);
            return { src: '' };
          }
        })
      });

      // Also extract raw text for text-based processing
      const textResult = await mammoth.extractRawText({ buffer });
      const fullText = textResult.value;

      console.log(`📏 Extracted text longitud: ${fullText.length} characters`);
      console.log(`🖼️ Extracted ${images.length} images from DOCX`);

      // Split into pages (approximate - DOCX doesn't have strict page breaks)
      const pages = this.splitIntoPages(fullText);

      console.log(`📑 Split into ${pages.length} approximate pages`);

      return {
        fullText,
        pages,
        totalPages: pages.length,
        images,
        html: htmlResult.value
      };
    } catch (error) {
      console.error('❌ Error processing DOCX:', error);
      throw new Error('Error al process DOCX file');
    }
  }

  /**
   * Detect image MIME type from buffer
   */
  private getImageMimeType(buffer: Buffer): string {
    const header = buffer.toString('hex', 0, 4);

    if (header.startsWith('ffd8ff')) return 'image/jpeg';
    if (header.startsWith('89504e47')) return 'image/png';
    if (header.startsWith('47494638')) return 'image/gif';
    if (header.startsWith('52494646')) return 'image/webp';

    // Default to JPEG
    return 'image/jpeg';
  }

  /**
   * Store uploaded file temporarily for processing
   */
  async storeTemporaryFile(buffer: Buffer, originalName: string): Promise<string> {
    const fileId = randomUUID();

    console.log(`💾 Storing temporary file: ${originalName} with ID: ${fileId}`);

    // Store in memory for now (in production, consider using Redis or file system)
    this.tempFiles.set(fileId, { buffer });

    // Clean up after 1 hour
    setTimeout(() => {
      this.tempFiles.delete(fileId);
      console.log(`🗑️ Cleaned up temporary file: ${fileId}`);
    }, 60 * 60 * 1000);

    return fileId;
  }

  /**
   * Get processed content from temporary file
   */
  async getProcessedContent(fileId: string): Promise<DocxProcessedContent> {
    const fileData = this.tempFiles.get(fileId);

    if (!fileData) {
      throw new Error('File not found or expired');
    }

    // If already processed, return cached version
    if (fileData.processedContent) {
      return fileData.processedContent;
    }

    // Process and cache
    const processedContent = await this.processDocxBuffer(fileData.buffer);
    fileData.processedContent = processedContent;

    return processedContent;
  }

  /**
   * Extract content from specific page range
   */
  async extractPageRange(fileId: string, startPage: number, endPage: number): Promise<string> {
    const content = await this.getProcessedContent(fileId);

    // Validate page range
    if (startPage < 1 || endPage > content.totalPages || startPage > endPage) {
      throw new Error(`Invalid page range: ${startPage}-${endPage}. Document has ${content.totalPages} pages.`);
    }

    console.log(`📖 Extracting pages ${startPage} to ${endPage} from ${content.totalPages} total pages`);

    // Extract pages (convert to 0-based index)
    const selectedPages = content.pages.slice(startPage - 1, endPage);
    const extractedText = selectedPages.join('\n\n--- PAGE BREAK ---\n\n');

    console.log(`📏 Extracted ${extractedText.length} characters from ${selectedPages.length} pages`);

    return extractedText;
  }

  /**
   * Detect individual recipes in text content using LLM processing
   */
  async detectRecipes(text: string): Promise<RecipeDetectionResult> {
    console.log('🤖 Using LLM to detect and extract recipes from document content...');
    console.log(`📄 Processing ${text.length} characters of text`);

    try {
      // Import the LLM service
      const { LLMServiceImproved } = await import('./llmServiceImproved');
      const llmService = new LLMServiceImproved();

      // Use LLM to extract all recipes from the document text
      const llmResult = await llmService.extractMultipleRecipesFromDocument(text);

      if (!llmResult.success) {
        console.error('❌ LLM extraction failed:', llmResult.error);
        return { recipes: [], totalDetected: 0 };
      }

      // Convert LLM results to our expected format
      const recipes = llmResult.recipes.map(recipe => ({
        id: randomUUID(),
        title: recipe.title,
        startIndex: 0, // LLM doesn't provide line positions
        endIndex: 0,   // but that's ok, we have the full content
        content: this.formatRecipeContent(recipe),
        estimatedData: recipe // Store the structured data for preview
      }));

      console.log(`🎯 LLM detected ${recipes.length} recipes:`);
      recipes.forEach((recipe, index) => {
        console.log(`  ${index + 1}. "${recipe.title}" (${recipe.content.length} chars)`);
      });

      return {
        recipes,
        totalDetected: recipes.length
      };

    } catch (error) {
      console.error('❌ Error in LLM recipe detection:', error);
      // Fallback: return the whole text as a single recipe for manual review
      return {
        recipes: [{
          id: randomUUID(),
          title: 'Documento completo (procesamiento manual requerido)',
          startIndex: 0,
          endIndex: 0,
          content: text
        }],
        totalDetected: 1
      };
    }
  }

  /**
   * Format the LLM-extracted recipe data back into text format for storage
   */
  private formatRecipeContent(recipe: any): string {
    const parts = [];

    parts.push(recipe.title);
    parts.push('');

    if (recipe.description) {
      parts.push('DESCRIPCIÓN:');
      parts.push(recipe.description);
      parts.push('');
    }

    if (recipe.prepTime || recipe.cookTime || recipe.servings) {
      if (recipe.prepTime) parts.push(`TIEMPO DE PREPARACIÓN: ${recipe.prepTime} minutos`);
      if (recipe.cookTime) parts.push(`TIEMPO DE COCCIÓN: ${recipe.cookTime} minutos`);
      if (recipe.servings) parts.push(`PORCIONES: ${recipe.servings}`);
      parts.push('');
    }

    if (recipe.ingredients && recipe.ingredients.length > 0) {
      parts.push('INGREDIENTES:');
      recipe.ingredients.forEach(ingredient => {
        parts.push(`• ${ingredient}`);
      });
      parts.push('');
    }

    if (recipe.instructions && recipe.instructions.length > 0) {
      parts.push('PREPARACIÓN:');
      recipe.instructions.forEach((instruction, index) => {
        parts.push(`${index + 1}. ${instruction}`);
      });
      parts.push('');
    }

    return parts.join('\n');
  }

  /**
   * Split text into approximate pages
   */
  private splitIntoPages(text: string): string[] {
    const avgCharsPerPage = 3000; // Approximate characters per page
    const lines = text.split('\n');
    const pages: string[] = [];

    let currentPage = '';
    let currentLength = 0;

    for (const line of lines) {
      // Check for explicit page break indicators
      if (line.includes('\f') || line.includes('PAGE BREAK') || line.match(/^Page\s+\d+/i)) {
        if (currentPage.trim()) {
          pages.push(currentPage.trim());
        }
        currentPage = '';
        currentLength = 0;
        continue;
      }

      // Add line to current page
      currentPage += line + '\n';
      currentLength += line.length;

      // Split if page is getting too long
      if (currentLength > avgCharsPerPage) {
        pages.push(currentPage.trim());
        currentPage = '';
        currentLength = 0;
      }
    }

    // Don't forget the last page
    if (currentPage.trim()) {
      pages.push(currentPage.trim());
    }

    return pages.length > 0 ? pages : [text]; // Fallback to full text as single page
  }

  /**
   * Determine if a line is likely a recipe title
   */
  private isLikelyRecipeTitle(line: string, index: number, allLines: string[]): boolean {
    const cleaned = line.trim();

    // Skip very short or long lines
    if (cleaned.length < 3 || cleaned.length > 100) return false;

    // Skip lines that look like ingredients or instructions
    if (this.isLikelyIngredient(cleaned) || this.isLikelyInstruction(cleaned)) return false;

    // Positive indicators for titles
    const titleIndicators = [
      /^\d+[\.)]\s*[A-ZÁÉÍÓÚÑÜ]/i, // "1. Pollo asado"
      /^[A-ZÁÉÍÓÚÑÜ][A-Za-záéíóúñü\s]+$/i, // Title case
      /RECETA/i, // Contains "receta"
      /^[^a-z]*[A-ZÁÉÍÓÚÑÜ][A-Za-záéíóúñü\s]*$/i // Starts with capital, mostly letters
    ];

    const hasIndicator = titleIndicators.some(pattern => pattern.test(cleaned));

    // Additional context checks
    const nextLine = allLines[index + 1]?.trim();
    const hasIngredientsSoon = allLines.slice(index + 1, index + 5)
      .some(l => l && /INGREDIENTES?:/i.test(l.trim()));

    return hasIndicator || (cleaned.length < 50 && hasIngredientsSoon);
  }

  /**
   * Check if line looks like an ingredient
   */
  private isLikelyIngredient(line: string): boolean {
    const patterns = [
      /^\d+\s*(gr?|kg|ml|l|cucharada|cucharadita|taza|diente|unidad)/i,
      /^\s*[-•*]\s*\d+/i,
      /^\s*\d+\s+\w+/i
    ];

    return patterns.some(pattern => pattern.test(line));
  }

  /**
   * Check if line looks like an instruction
   */
  private isLikelyInstruction(line: string): boolean {
    const patterns = [
      /^\d+[\.)]\s*(Precalentar|Mezclar|Agregar|Cocinar|Hornear)/i,
      /^(Precalentar|Mezclar|Agregar|Cocinar|Hornear|En|Para)/i,
      /minutos?|horas?|grados?/i
    ];

    return patterns.some(pattern => pattern.test(line));
  }


  /**
   * Clean recipe title
   */
  private cleanTitle(title: string): string {
    return title
      .replace(/^\d+[\.)]\s*/, '') // Remove leading numbers
      .replace(/^RECETA\s*\d*\s*[:|-]?\s*/i, '') // Remove "RECETA" prefix
      .trim()
      .replace(/^[^a-zA-ZÁÉÍÓÚÑÜáéíóúñü]+/, '') // Remove leading non-letters
      .trim();
  }

  /**
   * Clean up temporary files
   */
  cleanup(): void {
    console.log(`🧹 Cleaning up ${this.tempFiles.size} temporary files`);
    this.tempFiles.clear();
  }
}