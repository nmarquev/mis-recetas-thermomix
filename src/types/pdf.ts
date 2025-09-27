export interface PdfProcessedContent {
  totalPages: number;
  pageImages: PdfPageData[];
  fullText?: string;
}

export interface PdfPageData {
  pageNum: number;
  imageBase64: string;
  text?: string;
  thumbnailBase64?: string;
}

export interface PdfUploadResponse {
  success: boolean;
  fileId: string;
  totalPages: number;
  preview: string; // Base64 image
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
  content: string;
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

export interface PdfPreviewResponse {
  success: boolean;
  pages: Array<{
    pageNum: number;
    thumbnail: string | null;
  }>;
  totalPages: number;
  error?: string;
}

export interface PageRange {
  start: number;
  end: number;
}