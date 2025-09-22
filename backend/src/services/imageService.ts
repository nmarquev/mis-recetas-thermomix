import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { randomUUID } from 'crypto';

export class ImageService {
  private uploadDir: string;

  constructor() {
    this.uploadDir = process.env.UPLOAD_DIR || './uploads';
    this.ensureUploadDir();
  }

  private async ensureUploadDir() {
    try {
      await fs.access(this.uploadDir);
    } catch {
      await fs.mkdir(this.uploadDir, { recursive: true });
    }
  }

  async downloadAndStoreImages(imageUrls: string[]): Promise<Array<{
    originalUrl: string;
    localPath: string;
    url: string;
    order: number;
    altText?: string;
  }>> {
    const results = [];

    for (let i = 0; i < Math.min(imageUrls.length, 3); i++) {
      const imageUrl = imageUrls[i];

      try {
        const result = await this.downloadSingleImage(imageUrl, i + 1);
        if (result) {
          results.push(result);
        }
      } catch (error) {
        console.error(`Failed to download image ${imageUrl}:`, error);
        // Continue with other images even if one fails
      }
    }

    return results;
  }

  private async downloadSingleImage(imageUrl: string, order: number): Promise<{
    originalUrl: string;
    localPath: string;
    url: string;
    order: number;
    altText?: string;
  } | null> {
    try {
      // Validate URL
      if (!this.isValidImageUrl(imageUrl)) {
        throw new Error('Invalid image URL');
      }

      // Download image
      const response = await fetch(imageUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType?.startsWith('image/')) {
        throw new Error('URL does not point to an image');
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Generate unique filename
      const fileExtension = this.getExtensionFromContentType(contentType) || 'jpg';
      const filename = `recipe-${randomUUID()}-${order}.${fileExtension}`;
      const localPath = path.join(this.uploadDir, filename);

      // Process and save image
      await this.processAndSaveImage(buffer, localPath);

      return {
        originalUrl: imageUrl,
        localPath: filename,
        url: `/uploads/${filename}`,
        order,
        altText: `Recipe image ${order}`
      };
    } catch (error) {
      console.error(`Error processing image ${imageUrl}:`, error);
      return null;
    }
  }

  private async processAndSaveImage(buffer: Buffer, outputPath: string): Promise<void> {
    try {
      await sharp(buffer)
        .resize(800, 600, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({
          quality: 85,
          progressive: true
        })
        .toFile(outputPath);
    } catch (error) {
      console.error('Error processing image with Sharp:', error);
      // Fallback: save original if Sharp fails
      await fs.writeFile(outputPath, buffer);
    }
  }

  private isValidImageUrl(url: string): boolean {
    try {
      const parsedUrl = new URL(url);
      return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';
    } catch {
      return false;
    }
  }

  private getExtensionFromContentType(contentType: string): string | null {
    const typeMap: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/gif': 'gif'
    };

    return typeMap[contentType] || null;
  }

  async validateImageUrl(url: string): Promise<boolean> {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      const contentType = response.headers.get('content-type');
      return response.ok && contentType?.startsWith('image/') === true;
    } catch {
      return false;
    }
  }

  async deleteImage(filename: string): Promise<void> {
    try {
      const filePath = path.join(this.uploadDir, filename);
      await fs.unlink(filePath);
    } catch (error) {
      console.error(`Error deleting image ${filename}:`, error);
    }
  }
}