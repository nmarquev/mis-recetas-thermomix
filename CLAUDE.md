# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Frontend (Vite dev server - port 8080)
npm run dev

# Backend (Express API - port 3001/5000 with SSL)
cd backend && npm run dev

# Build
npm run build                    # Frontend only
cd backend && npm run build      # Backend only

# Database
cd backend && npx prisma generate    # Generate Prisma client
cd backend && npx prisma db push     # Push schema changes
cd backend && npx prisma studio      # Visual DB editor
cd backend && npx prisma db seed     # Seed test data

# Linting and type checking
npm run lint
npm run typecheck

# Chrome Extension
npm run package-extension        # Creates dist/tastebox-extension.zip
```

## Architecture Overview

### Dual Server Setup

**Frontend (Vite)**
- Port: 8080
- Dev server with hot reload
- Build output: `dist/`
- Production: Served by Nginx

**Backend (Express + HTTPS)**
- Port: 3001 (dev), 5000 (production)
- SSL enabled by default (self-signed certs in `backend/ssl/`)
- Set `SSL_ENABLED=false` to disable HTTPS
- Serves API at `/api/*` and uploaded files at `/uploads/*`

### Database Schema (Prisma + SQLite)

**Key Models:**
- `Recipe`: Main recipe entity with nutritional info
- `Ingredient`: Supports `section` field for multi-part recipes (e.g., "Plato principal", "Salsa")
- `Instruction`: Includes Thermomix-specific fields:
  - `function` - Thermomix function (e.g., "Amasar", "Batir", "Picar")
  - `time` - Duration setting
  - `temperature` - Temperature setting
  - `speed` - Speed setting (1-10, Mariposa, Turbo)
  - `section` - Section for multi-part recipes
- `RecipeImage`: Multiple images per recipe with ordering
- `RecipeTag`: Many-to-many relationship with Tag model

**Important:** All models use `@relation(onDelete: Cascade)` - deleting a recipe deletes all related data.

### Import Architecture

The app supports multiple import formats through dedicated routes:

```
/api/import          - General import (legacy)
/api/import-html     - HTML/URL import (Instagram, Cookidoo, web)
/api/import/docx     - DOCX file processing
/api/import/pdf      - PDF file processing with multimodal GPT-4o-mini
```

**Import Flow:**
1. Upload file/URL → Endpoint receives and stores temporarily
2. Process content → Extract text/images with appropriate parser
3. LLM extraction → `llmServiceImproved.ts` analyzes content with OpenAI
4. Review → Frontend shows extracted data for user confirmation
5. Save → Create recipe with all relations in single transaction

**Key Services:**
- `llmServiceImproved.ts` - OpenAI integration for recipe extraction
- `pdfProcessor.ts` - PDF to images conversion (pdf-poppler)
- `docxProcessor.ts` - DOCX text extraction (mammoth)
- `imageService.ts` - Image downloading and optimization

### Chrome Extension (Manifest V3)

**Architecture:**
- `manifest.json` - Permissions and configuration
- `background.js` - Service worker for API communication
- `content.js` - Extracts HTML from current page
- `popup.js` - Authentication and import UI
- `config.js` - Environment-specific URLs (dev vs production)

**Workflow:**
1. User clicks extension icon on recipe page
2. Content script extracts full HTML
3. Background worker sends to `/api/import-html`
4. Recipe imported and opens in main app

**Packaging:** `npm run package-extension` creates `dist/tastebox-extension.zip`

### OpenAI Integration

**Models Used:**
- GPT-4o-mini - Multimodal PDF processing (vision + text)
- Text-to-Speech API - Recipe narration (Web Speech API fallback)
- Embeddings - Nutritional calculation

**Key Prompts:**
- Cookidoo extraction: Optimized for Thermomix function detection
- PDF extraction: Analyzes images for icons (time, servings, difficulty)
- Nutrition calculation: Per-serving macronutrient estimation

## Environment Variables

### Backend (.env)

**Required:**
```bash
DATABASE_URL="file:./dev.db"           # SQLite (production: ./db/tastebox.db)
OPENAI_API_KEY="sk-..."                 # OpenAI API key
JWT_SECRET="your-secret-key"            # JWT signing secret
PORT=3001                               # API port (3001 dev, 5000 prod)
NODE_ENV=development                    # development | production
```

**Optional:**
```bash
SSL_ENABLED=true                        # Enable HTTPS (default: true)
MAX_FILE_SIZE=10485760                  # 10MB default
UPLOAD_DIR=./uploads                    # Upload directory
```

### Production

**Database:** Production uses `./db/tastebox.db` (see `.env.production.example`)

**SSL Certificates:** Place in `backend/ssl/`:
- `tastebox-local-key.pem`
- `tastebox-local-cert.pem`

## Important Patterns and Gotchas

### 1. Zod Validation - Nullable Fields

Use `.nullable().optional()` for optional database fields, NOT `.optional().nullable()`:

```typescript
// ✅ Correct
recipeType: z.string().nullable().optional()

// ❌ Wrong - causes validation errors
recipeType: z.string().optional().nullable()
```

### 2. CORS Configuration

Backend allows Chrome extensions in both dev and production:
- Development: Allows `chrome-extension://*` and `localhost:*`
- Production: Allows `https://tastebox.beweb.com.ar` and `chrome-extension://*`

Credentials are enabled (`credentials: true`) for JWT cookies.

### 3. Image Handling

Images are downloaded and stored locally for offline access:
- External URLs → `RecipeImage.url`
- Downloaded files → `RecipeImage.localPath`
- Served via `/uploads` with CORS headers

### 4. Multi-part Recipes

Cookidoo recipes often have sections (main dish + sauce + side):
- Use `Ingredient.section` and `Instruction.section`
- Same section values should match between ingredients and instructions
- Frontend groups by section in display

### 5. Thermomix Function Detection

LLM prompts extract Thermomix settings from text patterns:
- "40 seg/100°C/vel 4" → `time: "40 seg"`, `temperature: "100°C"`, `speed: "vel 4"`
- "Amasar 3 min/vel Espiga" → `function: "Amasar"`, `time: "3 min"`, `speed: "vel Espiga"`

**HTML Cleanup:** Instructions are cleaned of HTML tags (`<nobr>`, `<br>`) automatically.

### 6. PDF Processing

PDF workflow:
1. Convert pages to images (pdf-poppler → JPEG)
2. Send images + text to GPT-4o-mini
3. Vision model detects icons (time, servings) from visual layout
4. Store temporary files in `backend/uploads/temp/`
5. Cleanup after 1 hour

### 7. Deployment

Production deployment uses PM2 + Nginx + CloudPanel:

```bash
./deploy.sh   # Pulls latest, builds, restarts PM2
```

**PM2 Process:**
- Name: `tastebox`
- Entry: `backend/dist/index.js`
- Memory limit: 1GB
- Logs: `backend/logs/`

**Frontend:** Built to `dist/` and served by Nginx at root
**Backend:** Proxied to `/api` by Nginx

## Common Tasks

### Adding a New Import Format

1. Create route in `backend/src/routes/import{Format}.ts`
2. Create processor in `backend/src/services/{format}Processor.ts`
3. Add LLM extraction method in `llmServiceImproved.ts`
4. Create frontend modal in `src/components/{Format}ImportModal.tsx`
5. Add button in `Header.tsx`

### Modifying Database Schema

```bash
# 1. Edit backend/prisma/schema.prisma
# 2. Create migration
cd backend && npx prisma migrate dev --name descriptive_name
# 3. Regenerate client
npx prisma generate
```

### Testing Recipe Import

Use test endpoints:
- `/api/test/pdf` - Test PDF processing
- `/api/import-html` - Test HTML import with sample Cookidoo URL

## Project Structure

```
tastebox/
├── src/                          # Frontend React + TypeScript
│   ├── components/               # React components
│   │   ├── pdf/, docx/          # Import-specific components
│   │   └── ui/                  # shadcn/ui base components
│   ├── hooks/                   # Custom hooks (useVoiceSettings, etc.)
│   ├── services/                # API clients
│   └── types/                   # TypeScript interfaces
├── backend/
│   ├── src/
│   │   ├── routes/              # Express route handlers
│   │   ├── services/            # Business logic (LLM, processors)
│   │   ├── middleware/          # Auth, validation
│   │   └── config/              # Environment setup
│   ├── prisma/                  # Database schema + migrations
│   ├── uploads/                 # Uploaded files (gitignored)
│   └── ssl/                     # SSL certificates (gitignored)
├── extension/                   # Chrome Extension Manifest V3
└── dist/                        # Production build output
```

## Key Dependencies

- **Frontend:** React 18, Vite, Tailwind, shadcn/ui, Zustand
- **Backend:** Express, Prisma, Zod, Multer, Sharp
- **AI:** OpenAI SDK (GPT-4o-mini)
- **PDF:** pdf-poppler, pdf2pic, pdf-parse
- **DOCX:** mammoth
- **Deployment:** PM2, Nginx

## Production URLs

- Frontend: `https://tastebox.beweb.com.ar`
- Backend API: `https://tastebox.beweb.com.ar:5000`
- Extension ZIP: `https://tastebox.beweb.com.ar/downloads/tastebox-extension.zip`
