import * as fs from 'fs/promises';
import * as path from 'path';
import { randomUUID } from 'crypto';
// Lazy load pdf-poppler solo cuando se necesite (evita crash en Linux sin binarios)
// import * as pdfPoppler from 'pdf-poppler';
import pdfParse from 'pdf-parse';
import {
  PdfProcessedContent,
  PdfPageData,
  PdfRecipeDetectionResult,
  PdfExtractedRecipe
} from '../types/pdf';

export class PdfProcessor {
  private uploadDir: string;
  private tempFiles: Map<string, { buffer: Buffer; processedContent?: PdfProcessedContent }>;

  constructor() {
    this.uploadDir = process.env.UPLOAD_DIR || './uploads';
    this.tempFiles = new Map();
  }

  /**
   * Process PDF buffer and extract pages as images + text
   */
  async processPdfBuffer(buffer: Buffer): Promise<PdfProcessedContent> {
    try {
      console.log('📄 Processing PDF buffer...');

      // Extract basic info and text using pdf-parse
      const pdfData = await pdfParse(buffer);
      console.log(`📏 PDF has ${pdfData.numpages} pages, ${pdfData.text.length} characters of text`);

      // Convert pages to images
      const pageImages = await this.convertPagesToImages(buffer, pdfData.numpages);

      console.log(`🖼️ Convertido ${pageImages.length} pages to images`);

      return {
        totalPages: pdfData.numpages,
        pageImages,
        fullText: pdfData.text
      };

    } catch (error) {
      console.error('❌ Error procesando PDF:', error);
      throw new Error('Error al process PDF file');
    }
  }

  /**
   * Convert PDF pages to base64 images using pdf-poppler
   */
  private async convertPagesToImages(buffer: Buffer, totalPages: number): Promise<PdfPageData[]> {
    // TODO: Implementar conversión de PDF a imágenes
    // Por ahora, retornar error descriptivo hasta que se instalen binarios necesarios
    console.warn('⚠️ PDF image conversion not available - pdf-poppler binaries not installed');
    throw new Error('PDF image conversion requires poppler-utils to be installed on the server. Please use text-only PDF import for now.');

    /* COMMENTED OUT UNTIL POPPLER IS INSTALLED
    const pageImages: PdfPageData[] = [];

    try {
      // Lazy load pdf-poppler only when needed
      const pdfPoppler = await import('pdf-poppler');

      // Create temporary file for pdf-poppler
      const tempPdfPath = path.join(this.uploadDir, `temp_${randomUUID()}.pdf`);
      await fs.writeFile(tempPdfPath, buffer);

      // Create temporary output directory
      const tempOutputDir = path.join(this.uploadDir, `temp_output_${randomUUID()}`);
      await fs.mkdir(tempOutputDir, { recursive: true });

      // Configure pdf-poppler options
      const options = {
        format: 'jpeg',
        out_dir: tempOutputDir,
        out_prefix: 'page',
        page: null as number | null, // Will be set per page
        scale: 1200, // Output scale
      };

      // Convert each page
      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        try {
          console.log(`🖼️ Converting page ${pageNum}/${totalPages}...`);

          // Set specific page to convert
          const pageOptions = { ...options, page: pageNum };

          // Convert page to image
          await pdfPoppler.convert(tempPdfPath, pageOptions);

          // Read the generated image file
          const imageFileName = `page-${pageNum}.jpg`;
          const imagePath = path.join(tempOutputDir, imageFileName);

          try {
            const imageBuffer = await fs.readFile(imagePath);
            const imageBase64 = imageBuffer.toString('base64');

            // Create thumbnail (smaller version for UI)
            const thumbnailBase64 = await this.createThumbnail(imageBase64);

            pageImages.push({
              pageNum,
              imageBase64,
              thumbnailBase64
            });

            // Clean up individual image file
            await fs.unlink(imagePath).catch(() => {});

          } catch (readError) {
            console.error(`❌ Error reading image for page ${pageNum}:`, readError);
          }

        } catch (pageError) {
          console.error(`❌ Error converting page ${pageNum}:`, pageError);
          // Continue with other pages
        }
      }

      // Clean up temporary files and directories
      await fs.rmdir(tempOutputDir, { recursive: true }).catch(() => {});
      await fs.unlink(tempPdfPath).catch(() => {});

    } catch (error) {
      console.error('❌ Error in page conversion:', error);
      throw new Error('Error al convert PDF pages to images');
    }

    console.log(`🖼️ Convertido ${pageImages.length} pages to images`);
    return pageImages;
    END OF COMMENTED CODE */
  }

  /**
   * Create thumbnail version of image (for UI performance)
   */
  private async createThumbnail(base64Image: string): Promise<string> {
    try {
      // For now, return the same image
      // TODO: Implement actual thumbnail generation with canvas if needed
      return base64Image;
    } catch (error) {
      console.warn('⚠️ Thumbnail generation failed:', error);
      return base64Image; // Fallback to original
    }
  }

  /**
   * Store uploaded file temporarily for processing
   */
  async storeTemporaryFile(buffer: Buffer, originalName: string): Promise<string> {
    const fileId = randomUUID();

    console.log(`💾 Storing temporary PDF: ${originalName} with ID: ${fileId}`);

    // Store in memory for now (in production, consider using Redis or file system)
    this.tempFiles.set(fileId, { buffer });

    // Clean up after 2 hours (PDF processing takes longer than DOCX)
    setTimeout(() => {
      this.tempFiles.delete(fileId);
      console.log(`🗑️ Cleaned up temporary PDF: ${fileId}`);
    }, 2 * 60 * 60 * 1000);

    return fileId;
  }

  /**
   * Get processed content from temporary file
   */
  async getProcessedContent(fileId: string): Promise<PdfProcessedContent> {
    const fileData = this.tempFiles.get(fileId);

    if (!fileData) {
      throw new Error('File not found or expired');
    }

    // If already processed, return cached version
    if (fileData.processedContent) {
      return fileData.processedContent;
    }

    // Process and cache
    const processedContent = await this.processPdfBuffer(fileData.buffer);
    fileData.processedContent = processedContent;

    return processedContent;
  }

  /**
   * Extract specific page range as images
   */
  async extractPageRange(fileId: string, startPage: number, endPage: number): Promise<PdfPageData[]> {
    const content = await this.getProcessedContent(fileId);

    // Validate page range
    if (startPage < 1 || endPage > content.totalPages || startPage > endPage) {
      throw new Error(`Invalid page range: ${startPage}-${endPage}. Document has ${content.totalPages} pages.`);
    }

    console.log(`📖 Extracting pages ${startPage} to ${endPage} from ${content.totalPages} total pages`);

    // Extract pages (convert to 0-based index)
    const selectedPages = content.pageImages.slice(startPage - 1, endPage);

    console.log(`🖼️ Extracted ${selectedPages.length} pages as images`);

    return selectedPages;
  }

  /**
   * Detect recipes using LLM multimodal analysis (to be called from routes)
   */
  async detectRecipesFromPages(pages: PdfPageData[]): Promise<PdfRecipeDetectionResult> {
    console.log('🤖 Iniciando LLM-based recipe detection from PDF pages...');
    console.log(`📄 Processing ${pages.length} pages`);

    try {
      // Import the LLM service
      const { LLMServiceImproved } = await import('./llmServiceImproved');
      const llmService = new LLMServiceImproved();

      // Use LLM to extract all recipes from the PDF pages
      const llmResult = await llmService.extractMultipleRecipesFromPdfPages(pages);

      if (!llmResult.success) {
        console.error('❌ LLM extraction failed:', llmResult.error);
        return { recipes: [], totalDetected: 0 };
      }

      // Convert LLM results to our expected format
      const recipes: PdfExtractedRecipe[] = llmResult.recipes.map((recipe, index) => {
        // Use the page number from the recipe if available, otherwise use the recipe index
        const pageIndex = recipe.pageNumbers && recipe.pageNumbers.length > 0
          ? recipe.pageNumbers[0] - 1  // Convert 1-based to 0-based index
          : index; // Fallback to recipe index

        // Get the corresponding page image
        const pageImage = pages[pageIndex] || pages[0]; // Fallback to first page if index is out of bounds

        return {
          id: randomUUID(),
          title: recipe.title,
          content: this.formatRecipeContent(recipe),
          hasImage: false, // Always false for PDF imports until we can extract individual images
          pageNumbers: recipe.pageNumbers || [index + 1],
          thumbnailUrl: undefined, // No thumbnails for PDF imports
          estimatedData: recipe // Store the structured data for preview
        };
      });

      console.log(`🎯 LLM detected ${recipes.length} recipes from PDF pages:`);
      recipes.forEach((recipe, index) => {
        console.log(`  ${index + 1}. "${recipe.title}" (pages: ${recipe.pageNumbers?.join(', ')}, hasImage: ${recipe.hasImage})`);
      });

      return {
        recipes,
        totalDetected: recipes.length
      };

    } catch (error) {
      console.error('❌ Error in LLM recipe detection:', error);
      // Fallback: return empty result for manual review
      return {
        recipes: [],
        totalDetected: 0
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
      recipe.ingredients.forEach((ingredient: string) => {
        parts.push(`• ${ingredient}`);
      });
      parts.push('');
    }

    if (recipe.instructions && recipe.instructions.length > 0) {
      parts.push('PREPARACIÓN:');
      recipe.instructions.forEach((instruction: string, index: number) => {
        parts.push(`${index + 1}. ${instruction}`);
      });
      parts.push('');
    }

    if (recipe.hasImage) {
      parts.push('📸 Esta receta incluye imagen(es) del documento original');
      parts.push('');
    }

    return parts.join('\n');
  }

  /**
   * Clean up temporary files
   */
  cleanup(): void {
    console.log(`🧹 Cleaning up ${this.tempFiles.size} temporary PDF files`);
    this.tempFiles.clear();
  }
}