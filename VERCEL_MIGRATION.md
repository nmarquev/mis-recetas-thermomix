# Migración de TasteBox a Vercel Serverless

## Análisis Completo de Cambios Necesarios

Este documento detalla todos los cambios necesarios para migrar TasteBox de una arquitectura VPS tradicional (PM2 + Nginx) a un entorno serverless en Vercel.

---

## 🚨 Incompatibilidades Críticas

### 1. Base de Datos - SQLite → PostgreSQL

**Problema Actual:**
- SQLite (`file:./dev.db`) no funciona en serverless
- Vercel no tiene filesystem persistente entre invocaciones
- Cada function invocation es stateless

**Solución Requerida:**

```prisma
// backend/prisma/schema.prisma
datasource db {
  provider = "postgresql"  // ❌ Era: "sqlite"
  url      = env("DATABASE_URL")
}
```

**Opciones de Hosting:**

| Opción | Pros | Contras | Costo |
|--------|------|---------|-------|
| **Neon** (Recomendado) | Serverless Postgres, auto-scaling, plan gratuito generoso | Límites en plan free | $0-19/mes |
| **Supabase** | Postgres + Storage + Auth, plan gratuito | Más complejo de configurar | $0-25/mes |
| **Vercel Postgres** | Integración nativa con Vercel | Caro, límites estrictos en free tier | $0.25/GB |
| **PlanetScale** | MySQL serverless, branching | MySQL != Postgres (requiere ajustes) | $0-29/mes |

**Cambios en Schema:**

```bash
# SQLite → PostgreSQL differences
# 1. @default(cuid()) → Funciona igual
# 2. DateTime → Funciona igual
# 3. NO cambios necesarios en schema.prisma actual ✅
```

**Migration Steps:**

```bash
# 1. Cambiar provider en schema.prisma
# 2. Crear base de datos en Neon/Supabase
# 3. Copiar connection string
DATABASE_URL="postgresql://user:pass@host.neon.tech/dbname?sslmode=require"

# 4. Ejecutar migración
npx prisma migrate deploy

# 5. (Opcional) Migrar datos existentes
# Exportar desde SQLite:
sqlite3 dev.db .dump > backup.sql
# Importar a Postgres (requiere conversión manual de SQL)
```

---

### 2. Dependencias Nativas - Binarios No Disponibles

**Problemas:**

| Paquete | Uso Actual | Problema en Vercel |
|---------|------------|-------------------|
| **canvas** | PDF generation (poco usado) | Requiere Cairo/Pango libraries nativas |
| **pdf-poppler** | PDF to images conversion | Requiere poppler binaries del sistema |
| **pdf2pic** | PDF rendering | Depende de GraphicsMagick/ImageMagick |
| **sharp** | Image optimization | ⚠️ Funciona con configuración especial |

**Soluciones:**

#### A. Sharp (Recomendado - Compatible)

```json
// package.json
{
  "dependencies": {
    "sharp": "^0.33.5"
  }
}
```

```js
// vercel.json
{
  "functions": {
    "api/**/*.ts": {
      "memory": 1024,
      "maxDuration": 60
    }
  }
}
```

Sharp funciona en Vercel con las librerías pre-compiladas correctas. No requiere cambios.

#### B. PDF Processing → Servicios Externos

**Opción 1: PDF.co API**
```typescript
// backend/src/services/pdfProcessor.ts (reemplazo)
import axios from 'axios';

export class PdfProcessor {
  async convertPagesToImages(pdfUrl: string): Promise<string[]> {
    const response = await axios.post('https://api.pdf.co/v1/pdf/convert/to/jpg', {
      url: pdfUrl,
      pages: '0-',
    }, {
      headers: { 'x-api-key': process.env.PDFCO_API_KEY }
    });

    return response.data.urls; // Array de URLs de imágenes
  }
}
```

**Opción 2: Cloudinary PDF Processing**
```typescript
import { v2 as cloudinary } from 'cloudinary';

// Cloudinary puede generar previews de PDFs automáticamente
const imageUrl = cloudinary.url('recipe-pdf.pdf', {
  format: 'jpg',
  page: 1,
  width: 800
});
```

**Opción 3: Eliminar PDF Import (Simplest)**
- Mantener solo DOCX, HTML, URL imports
- Mostrar mensaje: "PDF import no disponible en versión web"

#### C. Canvas → HTML/CSS Rendering

Si usas canvas para generar PDFs:

```typescript
// Antes (con canvas)
import { createCanvas } from 'canvas';

// Después (con Puppeteer en Vercel)
import puppeteer from 'puppeteer-core';
import chrome from '@sparticuz/chromium';

export async function generatePdf(html: string) {
  const browser = await puppeteer.launch({
    args: chrome.args,
    executablePath: await chrome.executablePath(),
  });

  const page = await browser.newPage();
  await page.setContent(html);
  const pdf = await page.pdf({ format: 'A4' });
  await browser.close();

  return pdf;
}
```

---

### 3. Sistema de Archivos - Local Storage → Cloud Storage

**Problema Actual:**

```typescript
// ❌ No funciona en Vercel (filesystem efímero)
const uploadDir = './uploads';
await fs.writeFile(`${uploadDir}/${filename}`, buffer);
```

**Archivos Afectados:**
- `backend/src/services/imageService.ts` - Download/store images
- `backend/src/routes/upload.ts` - User uploads
- `backend/src/routes/profilePhoto.ts` - Profile photos
- `backend/src/services/pdfProcessor.ts` - Temporary PDF files

**Solución Requerida: Vercel Blob Storage**

#### Setup Vercel Blob:

```bash
npm install @vercel/blob
```

```typescript
// backend/src/services/imageService.ts (refactor completo)
import { put, del } from '@vercel/blob';
import sharp from 'sharp';

export class ImageService {
  async uploadImage(buffer: Buffer, filename: string): Promise<string> {
    // 1. Optimizar con Sharp (sigue funcionando)
    const optimizedBuffer = await sharp(buffer)
      .resize(800, 600, { fit: 'inside' })
      .jpeg({ quality: 85 })
      .toBuffer();

    // 2. Upload a Vercel Blob
    const blob = await put(`recipes/${filename}`, optimizedBuffer, {
      access: 'public',
      addRandomSuffix: false,
    });

    return blob.url; // https://[hash].public.blob.vercel-storage.com/...
  }

  async deleteImage(url: string): Promise<void> {
    await del(url);
  }
}
```

#### Migración de RecipeImage Model:

```prisma
// ✅ Schema ya está preparado
model RecipeImage {
  url       String  // URL de Vercel Blob (o externa)
  localPath String? // Deprecar en serverless (nullable)
}
```

```typescript
// Al guardar recetas, usar solo `url`:
{
  url: blob.url, // https://vercel-blob-url.com/...
  localPath: null, // Ya no se usa
  order: 1
}
```

**Cambios en Routes:**

```typescript
// backend/src/routes/upload.ts
router.post('/images', authenticateToken, upload.array('images', 3), async (req, res) => {
  const files = req.files as Express.Multer.File[];
  const imageService = new ImageService();

  const uploadedImages = await Promise.all(
    files.map(async (file, i) => {
      const filename = `recipe-${randomUUID()}.jpg`;
      const blobUrl = await imageService.uploadImage(file.buffer, filename);

      return {
        url: blobUrl, // ✅ URL de Vercel Blob
        localPath: null,
        order: i + 1
      };
    })
  );

  res.json({ success: true, images: uploadedImages });
});
```

**Consideraciones de Costo:**

| Plan | Storage | Bandwidth | Costo |
|------|---------|-----------|-------|
| Hobby | 1 GB | 100 GB/mes | Gratis |
| Pro | 1 TB | 1 TB/mes | Incluido en Pro ($20/mes) |

**Alternativa: Cloudinary (Más features)**

```typescript
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async uploadImage(buffer: Buffer, filename: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: 'tastebox/recipes', public_id: filename },
      (error, result) => {
        if (error) reject(error);
        else resolve(result.secure_url);
      }
    );

    uploadStream.end(buffer);
  });
}
```

---

### 4. Arquitectura Serverless - Express → Vercel Functions

**Problema Actual:**

```typescript
// backend/src/index.ts - Express server tradicional
const app = express();
app.listen(PORT);
```

Esto no funciona en Vercel. Vercel usa **Serverless Functions** que se ejecutan on-demand.

**Solución: Vercel Serverless Functions**

#### Estructura de Proyecto:

```
tastebox/
├── frontend/              # React app (se mantiene igual)
├── api/                   # ✅ NUEVO: Vercel Functions
│   ├── auth/
│   │   ├── login.ts
│   │   └── register.ts
│   ├── recipes/
│   │   ├── index.ts       # GET /api/recipes
│   │   ├── [id].ts        # GET /api/recipes/[id]
│   │   └── create.ts      # POST /api/recipes/create
│   ├── import/
│   │   ├── html.ts
│   │   ├── docx.ts
│   │   └── pdf.ts
│   └── uploads/
│       └── images.ts
└── vercel.json
```

#### Opción A: Separar en Functions Individuales

```typescript
// api/recipes/index.ts
import { VercelRequest, VercelResponse } from '@vercel/node';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const recipes = await prisma.recipe.findMany({
    include: { images: true, tags: true }
  });

  return res.status(200).json(recipes);
}
```

#### Opción B: Express en Serverless (Más fácil de migrar)

```typescript
// api/index.ts (punto de entrada único)
import express from 'express';
import { VercelRequest, VercelResponse } from '@vercel/node';

// Import existing routes (sin cambios)
import authRoutes from '../backend/src/routes/auth';
import recipeRoutes from '../backend/src/routes/recipes';
// ...resto de routes

const app = express();

// Middleware (igual que antes)
app.use(express.json());
app.use(cors(/* ... */));

// Routes (igual que antes)
app.use('/api/auth', authRoutes);
app.use('/api/recipes', recipeRoutes);
// ...

// Export para Vercel
export default app;
```

```json
// vercel.json
{
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api" }
  ]
}
```

**Recomendación:** Usar **Opción B** primero (menos refactor), luego optimizar a Functions separadas.

---

### 5. Variables de Entorno

**Cambios Necesarios:**

```bash
# ❌ Remover (no aplican en serverless)
PORT=3001
SSL_ENABLED=true
UPLOAD_DIR=./uploads

# ✅ Agregar
DATABASE_URL="postgresql://..." # Neon/Supabase
VERCEL_BLOB_READ_WRITE_TOKEN="vercel_blob_..."
OPENAI_API_KEY="sk-..."
JWT_SECRET="..."

# ✅ Opcional (si usas Cloudinary)
CLOUDINARY_CLOUD_NAME="..."
CLOUDINARY_API_KEY="..."
CLOUDINARY_API_SECRET="..."

# ✅ Opcional (si usas PDF.co)
PDFCO_API_KEY="..."
```

**Configurar en Vercel Dashboard:**
1. Project Settings → Environment Variables
2. Agregar cada variable
3. Marcar para Production, Preview, Development

---

### 6. CORS y Seguridad

**Cambios Necesarios:**

```typescript
// api/index.ts o middleware
app.use(cors({
  origin: function(origin, callback) {
    const allowedOrigins = [
      process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '',
      'https://tastebox.vercel.app', // Tu dominio Vercel
      'https://tastebox.beweb.com.ar', // Dominio custom (si tienes)
      'chrome-extension://*' // Extension
    ].filter(Boolean);

    if (!origin || allowedOrigins.some(allowed =>
      allowed.includes('*') ? origin.startsWith(allowed.replace('*', '')) : origin === allowed
    )) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
```

**SSL:** No es necesario configurar SSL manualmente. Vercel provee HTTPS automáticamente.

---

## 📋 Plan de Migración Paso a Paso

### Fase 1: Preparación (1-2 días)

- [ ] Crear cuenta en Neon DB (o Supabase)
- [ ] Crear base de datos PostgreSQL
- [ ] Actualizar `schema.prisma` a `provider = "postgresql"`
- [ ] Ejecutar `npx prisma migrate deploy` en DB nueva
- [ ] Crear cuenta Vercel Blob Storage
- [ ] Configurar variables de entorno en Vercel

### Fase 2: Refactor Backend (3-5 días)

- [ ] Refactorizar `imageService.ts` para usar Vercel Blob
- [ ] Refactorizar `upload.ts` routes para Blob storage
- [ ] Eliminar o reemplazar `pdfProcessor.ts`:
  - Opción 1: Usar PDF.co API
  - Opción 2: Deshabilitar PDF import temporalmente
- [ ] Eliminar dependencias de `canvas`
- [ ] Configurar Sharp con opciones Vercel-compatible
- [ ] Crear `api/index.ts` con Express en serverless
- [ ] Actualizar `vercel.json` con rewrites

### Fase 3: Testing Local (1-2 días)

```bash
# Instalar Vercel CLI
npm i -g vercel

# Ejecutar localmente con Vercel
vercel dev

# Esto simula el entorno Vercel localmente
```

- [ ] Probar autenticación
- [ ] Probar upload de imágenes (a Blob)
- [ ] Probar importación DOCX
- [ ] Probar importación HTML/URL
- [ ] Verificar que todas las rutas funcionan

### Fase 4: Deploy a Vercel (1 día)

```bash
# Deploy
vercel --prod
```

- [ ] Configurar dominio custom (opcional)
- [ ] Configurar variables de entorno en producción
- [ ] Verificar CORS headers
- [ ] Testing completo en producción

### Fase 5: Migración de Datos (1 día)

- [ ] Exportar recetas existentes de SQLite
- [ ] Migrar imágenes locales a Vercel Blob
- [ ] Importar recetas a PostgreSQL
- [ ] Verificar integridad de datos

---

## 💰 Estimación de Costos

### Configuración Recomendada (Hobby/Personal):

| Servicio | Plan | Costo Mensual |
|----------|------|---------------|
| **Vercel** | Hobby | $0 |
| **Neon DB** | Free Tier | $0 (hasta 3GB) |
| **Vercel Blob** | Hobby | $0 (hasta 1GB) |
| **OpenAI API** | Pay as you go | ~$5-20 (depende uso) |
| **Total** | | **$5-20/mes** |

### Configuración Profesional:

| Servicio | Plan | Costo Mensual |
|----------|------|---------------|
| **Vercel** | Pro | $20 |
| **Neon DB** | Scale | $19 (10GB storage) |
| **Cloudinary** | Plus (alternativa a Blob) | $99 (100GB) |
| **OpenAI API** | Pay as you go | ~$20-50 |
| **Total** | | **$158-189/mes** |

---

## 🔄 Comparación: VPS vs Vercel

| Aspecto | VPS Actual | Vercel Serverless |
|---------|------------|-------------------|
| **Escalabilidad** | Manual (PM2 clusters) | Automática e ilimitada |
| **Costo base** | $5-20/mes fijo | $0 (Hobby) o $20 (Pro) |
| **Mantenimiento** | Alto (updates, SSL, PM2) | Cero (Vercel se encarga) |
| **Deploy** | Manual (`./deploy.sh`) | Git push automático |
| **SSL** | Self-signed/Let's Encrypt | Incluido automático |
| **Cold starts** | No | Sí (~300ms en Hobby) |
| **Filesystem** | Persistente | Efímero (requiere Blob) |
| **Database** | SQLite local | Postgres remoto |
| **PDF Processing** | Nativo (poppler) | Requiere API externa |
| **Monitoreo** | PM2 logs | Vercel Analytics incluido |

---

## ⚠️ Limitaciones en Vercel

### Hobby Plan:

- **Function execution time:** 10 segundos máximo
- **Function size:** 50 MB
- **Deployments:** 100/día
- **Bandwidth:** 100 GB/mes
- **Concurrent builds:** 1

**Impacto en TasteBox:**
- ⚠️ Importación PDF con muchas páginas puede timeout (>10s)
- ⚠️ Upload de imágenes muy grandes puede timeout
- ✅ Mayoría de operaciones están dentro de límites

### Pro Plan ($20/mes):

- **Function execution time:** 60 segundos
- **Function size:** 50 MB
- **Deployments:** Ilimitados
- **Bandwidth:** 1 TB/mes
- **Concurrent builds:** 12

---

## 🎯 Recomendación Final

### Para uso personal/demo:
**✅ Migrar a Vercel Hobby Plan**
- Costo: ~$0-10/mes
- Configuración: Neon DB (free) + Vercel Blob (free) + OpenAI
- Limitaciones: Deshabilitar PDF import o usar API externa

### Para producción:
**✅ Migrar a Vercel Pro Plan**
- Costo: ~$40-70/mes
- Configuración: Neon Scale + Cloudinary + OpenAI
- Features completas con PDF processing externo

### Para mantener VPS:
**❌ No recomendado** a menos que:
- Necesites procesamiento PDF nativo sin APIs externas
- Tengas tráfico extremadamente alto (>1TB/mes)
- Prefieras control total del sistema

---

## 📚 Recursos y Documentación

- [Vercel Serverless Functions](https://vercel.com/docs/functions/serverless-functions)
- [Vercel Blob Storage](https://vercel.com/docs/storage/vercel-blob)
- [Neon Serverless Postgres](https://neon.tech/docs/introduction)
- [Prisma con Vercel](https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-vercel)
- [Sharp en Vercel](https://github.com/vercel/vercel/blob/main/examples/nodejs-sharp/README.md)

---

## 🚀 Próximos Pasos

1. **Decidir:** ¿Migrar a Vercel o mantener VPS?
2. **Si migras:** Seguir Fase 1 del plan de migración
3. **Crear branch:** `feature/vercel-migration`
4. **Hacer cambios incrementales** y testear
5. **Deploy a Preview** antes de producción

¿Necesitas ayuda con algún paso específico de la migración?
