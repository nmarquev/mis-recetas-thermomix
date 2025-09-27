export interface PdfProcessedContent {
  totalPages: number;
  pageImages: PdfPageData[];
  fullText?: string; // Fallback text extraction
}

export interface PdfPageData {
  pageNum: number;
  imageBase64: string;
  text?: string; // Optional text extraction per page
  thumbnailBase64?: string; // Smaller version for UI
}

export interface PdfUploadResponse {
  success: boolean;
  fileId: string;
  totalPages: number;
  preview: string; // First page as base64 image
  error?: string;
}

export interface PdfExtractRequest {
  fileId: string;
  startPage: number;
  endPage: number;
}

export interface PdfExtractedRecipe {
  id: string;
  title: string;
  content: string; // Text format for storage
  hasImage: boolean;
  pageNumbers: number[];
  thumbnailUrl?: string;
  estimatedData?: {
    title: string;
    description?: string;
    ingredients?: string[];
    instructions?: string[];
    prepTime?: number;
    cookTime?: number;
    servings?: number;
  };
}

export interface PdfExtractResponse {
  success: boolean;
  recipes: PdfExtractedRecipe[];
  processedPages: number;
  error?: string;
}

export interface PdfRecipeDetectionResult {
  recipes: PdfExtractedRecipe[];
  totalDetected: number;
}