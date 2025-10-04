import express from 'express';
import axios from 'axios';
import { z } from 'zod';

const router = express.Router();

const imageProxySchema = z.object({
  url: z.string().url()
});

// Helper function to get domain-specific headers
const getDomainHeaders = (url: string) => {
  const domain = new URL(url).hostname.toLowerCase();

  const baseHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9,es;q=0.8',
    'DNT': '1',
    'Connection': 'keep-alive',
  };

  // Domain-specific headers
  if (domain.includes('allrecipes.com')) {
    return {
      ...baseHeaders,
      'Referer': 'https://www.allrecipes.com/',
      'Sec-Fetch-Dest': 'image',
      'Sec-Fetch-Mode': 'no-cors',
      'Sec-Fetch-Site': 'same-origin'
    };
  }

  if (domain.includes('tasty.co')) {
    return {
      ...baseHeaders,
      'Referer': 'https://tasty.co/',
      'Origin': 'https://tasty.co'
    };
  }

  if (domain.includes('bbcgoodfood.com')) {
    return {
      ...baseHeaders,
      'Referer': 'https://www.bbcgoodfood.com/',
      'Origin': 'https://www.bbcgoodfood.com'
    };
  }

  if (domain.includes('recetasgratis.net')) {
    return {
      ...baseHeaders,
      'Referer': 'https://www.recetasgratis.net/',
      'Origin': 'https://www.recetasgratis.net',
      'Accept-Encoding': 'gzip, deflate, br'
    };
  }

  if (domain.includes('cloudfront.net')) {
    return {
      ...baseHeaders,
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    };
  }

  if (domain.includes('instagram.com') || domain.includes('cdninstagram.com')) {
    return {
      ...baseHeaders,
      'Referer': 'https://www.instagram.com/',
      'Origin': 'https://www.instagram.com',
      'X-Instagram-AJAX': '1',
      'X-Requested-With': 'XMLHttpRequest'
    };
  }

  if (domain.includes('loveandlemons.com')) {
    return {
      ...baseHeaders,
      'Referer': 'https://www.loveandlemons.com/',
      'Origin': 'https://www.loveandlemons.com',
      'Sec-Fetch-Dest': 'image',
      'Sec-Fetch-Mode': 'no-cors',
      'Sec-Fetch-Site': 'same-origin',
      'Accept-Encoding': 'gzip, deflate, br'
    };
  }

  // Default headers for other domains
  return {
    ...baseHeaders,
    'Referer': 'https://www.google.com/',
    'Sec-Fetch-Dest': 'image',
    'Sec-Fetch-Mode': 'no-cors',
    'Sec-Fetch-Site': 'cross-site'
  };
};

// Image proxy endpoint to avoid CORS and access denied issues
router.get('/image', async (req, res) => {
  try {
    const { url } = imageProxySchema.parse(req.query);
    console.log('🖼️ Image proxy request for:', url);

    const headers = getDomainHeaders(url);

    // Try multiple strategies if the first one fails
    const strategies = [
      // Strategy 1: Domain-specific headers
      { headers, timeout: 10000 },
      // Strategy 2: Minimal headers
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'image/*,*/*;q=0.8'
        },
        timeout: 8000
      },
      // Strategy 3: Simple GET with basic headers
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; ImageProxy/1.0)'
        },
        timeout: 5000
      },
      // Strategy 4: Curl-like headers for stubborn servers
      {
        headers: {
          'User-Agent': 'curl/7.68.0',
          'Accept': '*/*'
        },
        timeout: 3000
      }
    ];

    let lastError: any;

    for (let i = 0; i < strategies.length; i++) {
      try {
        console.log(`🔄 Trying strategy ${i + 1} for:`, url);

        const response = await axios.get(url, {
          headers: strategies[i].headers,
          responseType: 'stream',
          timeout: strategies[i].timeout,
          maxRedirects: 5,
          validateStatus: (status) => status < 400
        });

        console.log(`✅ Strategy ${i + 1} successful for:`, url);

        // Set appropriate headers for the response
        res.set({
          'Content-Type': response.headers['content-type'] || 'image/jpeg',
          'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
          'Access-Control-Allow-Origin': '*',
          'Cross-Origin-Resource-Policy': 'cross-origin'
        });

        // Pipe the image data to the response
        response.data.pipe(res);
        return; // Success, exit the function

      } catch (error) {
        console.log(`❌ Strategy ${i + 1} failed for:`, url,
          axios.isAxiosError(error) ?
            `HTTP ${error.response?.status || 'Error de red'}` :
            (error instanceof Error ? error.message : String(error))
        );
        lastError = error;
        continue; // Try next strategy
      }
    }

    // All strategies failed
    throw lastError;

  } catch (error) {
    console.error('Image proxy error:', error);

    if (axios.isAxiosError(error)) {
      const status = error.response?.status || 500;
      console.error(`Image fetch failed with status ${status} for URL:`, req.query.url);

      // Handle DNS resolution errors
      if (error.code === 'ENOTFOUND') {
        return res.status(502).json({
          error: 'DNS resolution failed',
          message: 'Could not resolve the image server domain'
        });
      }

      if (status === 403) {
        return res.status(403).json({
          error: 'Access denied to image',
          message: 'The image server blocked our request. Try refreshing or the image may be protected.'
        });
      }

      if (status === 404) {
        return res.status(404).json({
          error: 'Image not found',
          message: 'The image could not be found on the server. It may have been moved or deleted.'
        });
      }

      if (status === 406) {
        return res.status(406).json({
          error: 'Image request not acceptable',
          message: 'The server rejected our request format'
        });
      }
    }

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'URL inválida',
        details: error.errors
      });
    }

    res.status(500).json({
      error: 'Error al fetch image',
      message: 'An error occurred while fetching the image'
    });
  }
});

export default router;