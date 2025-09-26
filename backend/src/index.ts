import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config();

// Import routes
import authRoutes from './routes/auth';
import recipeRoutes from './routes/recipes';
import importRoutes from './routes/importImproved';
import importHtmlRoutes from './routes/importHtml';
import importDocxRoutes from './routes/importDocx';
import uploadRoutes from './routes/upload';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://your-domain.com']
    : (origin, callback) => {
        // Permitir sin origin (ej. aplicaciones móviles)
        if (!origin) return callback(null, true);

        // Permitir localhost en diferentes puertos
        if (origin.match(/^http:\/\/localhost:\d+$/)) {
          return callback(null, true);
        }

        // Permitir toda la red local 192.168.0.x (puerto 8080-8089)
        if (origin.match(/^http:\/\/192\.168\.0\.\d+:808[0-9]$/)) {
          return callback(null, true);
        }

        // Permitir red local 172.x (Docker/WSL) (puerto 8080-8089)
        if (origin.match(/^http:\/\/172\.\d+\.\d+\.\d+:808[0-9]$/)) {
          return callback(null, true);
        }

        // Permitir red local 10.x (otra red común) (puerto 8080-8089)
        if (origin.match(/^http:\/\/10\.\d+\.\d+\.\d+:808[0-9]$/)) {
          return callback(null, true);
        }

        // Permitir Cookidoo para el bookmarklet
        if (origin && origin.match(/^https:\/\/cookidoo\.(es|com|de|fr|it)$/)) {
          return callback(null, true);
        }

        // Rechazar otros orígenes
        callback(new Error('Not allowed by CORS'));
      },
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve uploaded images with CORS headers
app.use('/uploads', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
}, express.static(path.join(__dirname, '../uploads')));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/recipes', recipeRoutes);
app.use('/api/import', importRoutes);
app.use('/api/import-html', importHtmlRoutes);
app.use('/api/import/docx', importDocxRoutes);
app.use('/api/upload', uploadRoutes);

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

app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Server accessible on all network interfaces`);
  console.log(`📁 Upload directory: ${process.env.UPLOAD_DIR || './uploads'}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});