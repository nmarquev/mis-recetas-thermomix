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
      // Check if this is a video thumbnail that might have play button overlay
      const processedBuffer = await this.removeVideoPlayButtonOverlay(buffer);

      await sharp(processedBuffer)
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

  private async removeVideoPlayButtonOverlay(buffer: Buffer): Promise<Buffer> {
    try {
      const image = sharp(buffer);
      const metadata = await image.metadata();

      if (!metadata.width || !metadata.height) {
        return buffer; // Return original if we can't get dimensions
      }

      // Common video play button positions (center of image)
      const centerX = Math.floor(metadata.width / 2);
      const centerY = Math.floor(metadata.height / 2);

      // Define play button detection area (typically 60-120px area around center)
      const playButtonSize = Math.floor(Math.min(120, Math.min(metadata.width, metadata.height) * 0.15));
      const halfSize = Math.floor(playButtonSize / 2);

      // Extract the center region to analyze
      const centerRegion = await image
        .extract({
          left: Math.floor(Math.max(0, centerX - halfSize)),
          top: Math.floor(Math.max(0, centerY - halfSize)),
          width: Math.floor(Math.min(playButtonSize, metadata.width)),
          height: Math.floor(Math.min(playButtonSize, metadata.height))
        })
        .raw()
        .toBuffer({ resolveWithObject: true });

      // Simple heuristic: look for high contrast areas that might be play buttons
      // This is a basic implementation - in production you might want more sophisticated detection
      const hasPlayButton = await this.detectPlayButtonPattern(centerRegion.data, centerRegion.info.width, centerRegion.info.height);

      if (hasPlayButton) {
        console.log('🎬 Video play button detected, attempting to remove overlay');

        // Apply a gentle blur to the center area to reduce play button visibility
        // This is safer than trying to completely remove it
        const blurredCenter = await sharp(centerRegion.data, {
          raw: {
            width: centerRegion.info.width,
            height: centerRegion.info.height,
            channels: centerRegion.info.channels
          }
        })
        .blur(2) // Gentle blur to soften play button
        .modulate({
          brightness: 1.1, // Slightly brighten to reduce contrast
          saturation: 1.05 // Slightly increase saturation to make it look more natural
        })
        .raw()
        .toBuffer();

        // Composite the blurred center back onto the original image
        const processedImage = await image
          .composite([{
            input: blurredCenter,
            raw: {
              width: centerRegion.info.width,
              height: centerRegion.info.height,
              channels: centerRegion.info.channels
            },
            left: Math.max(0, centerX - halfSize),
            top: Math.max(0, centerY - halfSize)
          }])
          .toBuffer();

        return processedImage;
      }

      return buffer; // Return original if no play button detected

    } catch (error) {
      console.error('Error in play button removal:', error);
      return buffer; // Return original on any error
    }
  }

  private async detectPlayButtonPattern(buffer: Buffer, width: number, height: number): Promise<boolean> {
    try {
      // Convert to grayscale for pattern detection
      const grayscale = await sharp(buffer, {
        raw: { width, height, channels: 3 }
      })
      .greyscale()
      .raw()
      .toBuffer();

      // Simple edge detection to find high contrast areas
      let edgePixels = 0;
      const threshold = 100; // Brightness difference threshold

      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          const idx = y * width + x;
          const current = grayscale[idx];
          const right = grayscale[idx + 1];
          const bottom = grayscale[(y + 1) * width + x];

          if (Math.abs(current - right) > threshold || Math.abs(current - bottom) > threshold) {
            edgePixels++;
          }
        }
      }

      // If more than 15% of pixels are high-contrast edges, likely a play button
      const edgeRatio = edgePixels / (width * height);
      const hasPlayButton = edgeRatio > 0.15;

      if (hasPlayButton) {
        console.log(`🎯 Play button pattern detected (edge ratio: ${(edgeRatio * 100).toFixed(1)}%)`);
      }

      return hasPlayButton;

    } catch (error) {
      console.error('Error in play button detection:', error);
      return false;
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