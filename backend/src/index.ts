import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import https from 'https';
import fs from 'fs';

// Load environment variables
dotenv.config();

// Import routes
import authRoutes from './routes/auth';
import recipeRoutes from './routes/recipes';
import importRoutes from './routes/importImproved';
import importHtmlRoutes from './routes/importHtml';
import importDocxRoutes from './routes/importDocx';
import importPdfRoutes from './routes/importPdf';
import uploadRoutes from './routes/upload';
import llmRoutes from './routes/llm';
import profilePhotoRoutes from './routes/profilePhoto';
import imageProxyRoutes from './routes/imageProxy';
import nutritionRoutes from './routes/nutrition';
import pdfRoutes from './routes/pdf';
import testPdfRoutes from './routes/testPdf';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://your-domain.com']
    : true, // Permitir todo en desarrollo
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve uploaded images with CORS headers
app.use('/uploads', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(path.join(__dirname, '../uploads')));

// Serve bookmarklet script with CORS headers
app.use('/bookmarklet', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  res.header('Content-Type', 'application/javascript');
  next();
}, express.static(path.join(__dirname, '../public/bookmarklet')));

// Health check with CORS headers for bookmarklet
app.get('/health', (req, res) => {
  // Agregar headers CORS específicos para bookmarklet
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/recipes', recipeRoutes);
app.use('/api/import', importRoutes);
app.use('/api/import-html', importHtmlRoutes);
app.use('/api/import/docx', importDocxRoutes);
app.use('/api/import/pdf', importPdfRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/llm', llmRoutes);
app.use('/api/upload', profilePhotoRoutes);
app.use('/api/proxy', imageProxyRoutes);
app.use('/api/nutrition', nutritionRoutes);
app.use('/api/pdf', pdfRoutes);
app.use('/api/test', testPdfRoutes);

// Health endpoint for bookmarklet server detection
app.get('/api/health', (req, res) => {
  // Agregar headers CORS específicos para bookmarklet
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

  res.json({
    status: 'ok',
    service: 'TasteBox Recipe API',
    timestamp: new Date().toISOString(),
    version: '2.0.0'
  });
});

// Error handling middleware
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', error);

  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      error: 'File too large',
      message: 'Maximum file size is 5MB'
    });
  }

  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// SSL Configuration
const isSSLEnabled = process.env.SSL_ENABLED !== 'false'; // Default to true
let server;

if (isSSLEnabled) {
  try {
    const privateKey = fs.readFileSync(path.join(__dirname, '../ssl/tastebox-local-key.pem'), 'utf8');
    const certificate = fs.readFileSync(path.join(__dirname, '../ssl/tastebox-local-cert.pem'), 'utf8');

    const httpsOptions = {
      key: privateKey,
      cert: certificate
    };

    server = https.createServer(httpsOptions, app);
    server.listen(Number(PORT), '0.0.0.0', () => {
      console.log(`🔒 HTTPS Server running on port ${PORT}`);
      console.log(`🌐 Server accessible on all network interfaces`);
      console.log(`📁 Upload directory: ${process.env.UPLOAD_DIR || './uploads'}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔐 SSL Certificate: localhost-cert.pem`);
      console.log(`🔑 Access URLs:`);
      console.log(`   - https://localhost:${PORT}`);
      console.log(`   - https://127.0.0.1:${PORT}`);
      console.log(`   - https://192.168.0.10:${PORT}`);
    });
  } catch (error) {
    console.error('❌ SSL Certificate not found, falling back to HTTP:', error.message);
    server = app.listen(Number(PORT), '0.0.0.0', () => {
      console.log(`🚀 HTTP Server running on port ${PORT} (SSL disabled)`);
      console.log(`🌐 Server accessible on all network interfaces`);
    });
  }
} else {
  server = app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`🚀 HTTP Server running on port ${PORT} (SSL disabled)`);
    console.log(`🌐 Server accessible on all network interfaces`);
    console.log(`📁 Upload directory: ${process.env.UPLOAD_DIR || './uploads'}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}