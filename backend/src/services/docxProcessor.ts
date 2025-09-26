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
   * Process DOCX buffer and extract text content
   */
  async processDocxBuffer(buffer: Buffer): Promise<DocxProcessedContent> {
    try {
      console.log('📄 Processing DOCX buffer...');

      // Extract text from DOCX using mammoth
      const result = await mammoth.extractRawText({ buffer });
      const fullText = result.value;

      console.log(`📏 Extracted text length: ${fullText.length} characters`);

      // Split into pages (approximate - DOCX doesn't have strict page breaks)
      // We'll use common page break indicators and chunk by reasonable size
      const pages = this.splitIntoPages(fullText);

      console.log(`📑 Split into ${pages.length} approximate pages`);

      return {
        fullText,
        pages,
        totalPages: pages.length
      };
    } catch (error) {
      console.error('❌ Error processing DOCX:', error);
      throw new Error('Failed to process DOCX file');
    }
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
   * Detect individual recipes in text content
   */
  detectRecipes(text: string): RecipeDetectionResult {
    console.log('🔍 Detecting individual recipes in text...');

    // Common patterns that indicate recipe boundaries
    const recipeIndicators = [
      /^\s*\d+[\.)]\s*.{1,100}$/gm, // Numbered recipes: "1. Recipe Name"
      /^[A-ZÁÉÍÓÚÑÜ][A-ZÁÉÍÓÚÑÜa-záéíóúñü\s]{2,80}$/gm, // Title case lines (likely recipe titles)
      /^RECETA[\s\d]*[:|-]?.{0,50}$/gmi, // Lines starting with "RECETA"
      /^(INGREDIENTES?|PREPARACI[ÓO]N|INSTRUCCI[ÓO]N|ELABORACI[ÓO]N):/gmi, // Section headers
    ];

    const recipes: { id: string; title: string; startIndex: number; endIndex: number; content: string; }[] = [];
    const lines = text.split('\n');

    let currentRecipe: { title: string; startIndex: number; lines: string[]; } | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line.length === 0) continue;

      // Check if this line looks like a recipe title
      const isTitle = this.isLikelyRecipeTitle(line, i, lines);

      if (isTitle && line.length > 3) {
        // Save previous recipe if exists
        if (currentRecipe) {
          const content = currentRecipe.lines.join('\n');
          recipes.push({
            id: randomUUID(),
            title: currentRecipe.title,
            startIndex: currentRecipe.startIndex,
            endIndex: i - 1,
            content: content
          });
        }

        // Start new recipe
        currentRecipe = {
          title: this.cleanTitle(line),
          startIndex: i,
          lines: [line]
        };
      } else if (currentRecipe) {
        // Add line to current recipe
        currentRecipe.lines.push(line);
      }
    }

    // Don't forget the last recipe
    if (currentRecipe) {
      const content = currentRecipe.lines.join('\n');
      recipes.push({
        id: randomUUID(),
        title: currentRecipe.title,
        startIndex: currentRecipe.startIndex,
        endIndex: lines.length - 1,
        content: content
      });
    }

    console.log(`🎯 Detected ${recipes.length} potential recipes`);

    return {
      recipes,
      totalDetected: recipes.length
    };
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