# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Thermomix Recipe Management Application with dual deployment architecture supporting both traditional development and Vercel serverless deployment.

## Development Commands

### Quick Start
```bash
# Traditional development (uses Express.js backend)
npm run start  # or double-click start.bat

# Vercel development mode
vercel dev     # port 3000 with API routes

# Individual services
npm run start:frontend  # port 8080
npm run start:backend   # port 3002
```

### Database Operations (Traditional Backend)
```bash
cd backend
npm run db:generate    # Generate Prisma client
npm run db:push       # Push schema to database
npm run db:migrate    # Create migration
npm run db:seed       # Seed with demo data
```

### Build & Testing
```bash
npm run build         # Production build
npm run lint         # ESLint check
npx playwright test  # Run E2E tests
npm run preview      # Preview production build
```

## Architecture Overview

### Dual Deployment Strategy

**Branch Strategy:**
- `main`: Vercel-ready with serverless API routes
- `local`: Traditional Express.js development
- `vercel-compatible`: Migration development branch

**API Architecture:**
- Traditional: `backend/src/` Express.js + Prisma + SQLite
- Vercel: `api/` Serverless functions + Vercel KV + Vercel Blob

### Dynamic Environment Detection

The application automatically detects its environment via `src/utils/api.ts`:

```typescript
// Detects: localhost:8080 (traditional) vs localhost:3000 (Vercel) vs production
export const getApiBaseUrl = (): string => {
  // Vercel production/dev: uses /api routes
  // Traditional dev: uses http://localhost:3002/api
}
```

**Critical**: This enables the same frontend to work with both architectures.

### Authentication Flow

JWT-based authentication with dual validation:
- `AuthContext` manages user state with localStorage persistence
- Requires both user data AND token for valid sessions
- API calls automatically include Bearer tokens via `authFetch()`

### Recipe Data Flow

1. **Frontend**: React components → AuthContext → api.ts → Backend
2. **Import System**: URL → LLM extraction → Image processing → Database
3. **Image Handling**: Local uploads OR Vercel Blob (auto-detected)

### Theme System

Multi-theme CSS architecture with custom properties:
- `ThemeContext` manages theme state
- `src/index.css` defines theme variables
- Shimmer animations with `background-clip: text`
- Supports: violetas, tierra, pop, frutilla themes

## Key Components Architecture

### Recipe Management
- `RecipeCard`: Main recipe display with favorite toggle
- `RecipeModal`: Detailed view with Thermomix-specific settings
- `CreateRecipeModal`: Form with React Hook Form + Zod validation
- `EditRecipeModal`: Updates with optimistic UI
- `ImportRecipeModal`: LLM-powered URL extraction

### Authentication & Layout
- `AuthContext`: JWT management with localStorage
- `Header`: Navigation with theme switcher
- `Hero`: Landing with shimmer text animation
- `FilterPanel`: Recipe filtering by tags/difficulty

### Error Handling
- `ErrorBoundary`: Catches React errors gracefully
- API error handling with toast notifications
- Validation with Zod schemas

## Backend Services (Traditional)

### API Routes Structure
```
backend/src/routes/
├── auth.ts      # JWT login/register
├── recipes.ts   # CRUD with Prisma relations
├── import.ts    # LLM recipe extraction
└── upload.ts    # Image processing with Sharp
```

### LLM Integration
- OpenAI GPT-4o-mini for recipe extraction
- Structured output with Zod validation
- Image download and processing pipeline
- UTF-8 encoding for Spanish content

### Database Schema
- User → Recipe (1:many)
- Recipe → Images, Ingredients, Instructions (1:many)
- Recipe ↔ Tags (many:many via RecipeTag)
- Thermomix-specific fields (time, temperature, speed)

## Vercel Serverless (API Routes)

### Structure
```
api/
├── auth/        # login.ts, register.ts
├── recipes/     # index.ts, [id].ts
├── import/      # index.ts, validate-url.ts
└── utils/       # auth.ts (JWT validation)
```

### Data Storage
- **Vercel KV**: Redis-like key-value store for user/recipe data
- **Vercel Blob**: File storage for images
- **Keys**: `user:email`, `userid:id`, `recipe:id`, `user_recipes:userId`

## Testing & Quality

### Demo Data
Auto-created users:
- `demo@thermomix.com` / `demo123`
- `chef@cocina.com` / `demo123`

### Playwright Tests
- Authentication flows
- Recipe CRUD operations
- Image upload functionality
- Theme switching
- Responsive design

### Code Quality
- TypeScript strict mode
- ESLint with React hooks rules
- Zod validation for all API inputs/outputs
- Error boundaries for React components

## Environment Variables

### Traditional Backend (.env)
```
DATABASE_URL="file:./dev.db"
JWT_SECRET="your-jwt-secret"
OPENAI_API_KEY="your-openai-key"
PORT=3002
```

### Vercel (.env.local)
```
JWT_SECRET="your-jwt-secret"
OPENAI_API_KEY="your-openai-key"
# KV and Blob tokens auto-configured by Vercel
```

## Critical Implementation Notes

### Tag Handling
Recipe tags can be strings OR objects `{tag: {name: string}}`. Always handle both:
```typescript
const tagValue = typeof tag === 'string' ? tag : tag.tag?.name || String(tag);
```

### Image URLs
Images can be local paths OR full URLs (Vercel Blob). Use `resolveImageUrl()` utility.

### API Compatibility
Frontend must work with both Express.js and Vercel API routes. Check `src/services/api.ts` for dual compatibility patterns.

### Spanish Content
Application is in Spanish. LLM prompts specify Spanish difficulty levels: "Fácil", "Medio", "Difícil".

## Deployment

### Traditional
1. Set environment variables
2. Run `npm run build`
3. Deploy frontend + backend separately

### Vercel
1. Connect repository (main branch)
2. Add Vercel KV and Blob storage
3. Configure environment variables in dashboard
4. Auto-deployment from main branch