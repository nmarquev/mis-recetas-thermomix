# Claude Code - Recipe Genius

## Comandos de desarrollo
- `npm run dev` - Iniciar servidor de desarrollo
- `npm run build` - Construir aplicación
- `npm run lint` - Verificar código
- `npm run typecheck` - Verificar tipos TypeScript

## Estado del proyecto
- ✅ Funcionalidad base de recetas completada
- ✅ **Chrome Extension implementada** para importación directa
- ✅ Importación desde URLs (Instagram, web) funcionando
- ✅ Importación DOCX implementada con validación mejorada
- ✅ Importación PDF implementada con procesamiento multimodal
- ✅ **Cookidoo/Thermomix optimizado** con función, tiempo, temperatura, velocidad
- ✅ **Recetas multiparte** con soporte para secciones
- ✅ Sistema TTS (Text-to-Speech) integrado
- ✅ Configuración de voz personalizable
- ✅ Edición de perfiles de usuario
- ✅ Manejo de imágenes optimizado
- ✅ Validación Zod robusta para null/undefined
- ✅ UI/UX mejorada con themed components

---

## 🆕 **ÚLTIMA ACTUALIZACIÓN (Sep 2025)**

### ✅ **Chrome Extension + Mejoras Cookidoo/Thermomix - COMPLETADO**

**Implementaciones finalizadas:**

1. **Chrome Extension funcionando completamente**
   - Reemplaza sistema de bookmarklet (eliminado)
   - Importación directa desde cualquier sitio web
   - Modal de instalación con instrucciones completas
   - Menú de usuario actualizado con opción "Instalar Extensión Chrome"

2. **Cookidoo/Thermomix optimizado**
   - ✅ Fix: Ingredientes sin duplicación de unidades ("40 g" ✓, no "40 g g" ✗)
   - ✅ Fix: Instrucciones sin HTML tags (`<nobr>`, `<br>` eliminados)
   - ✅ Fix: Detección de función Thermomix (Amasar, Batir, Picar, etc.)
   - ✅ Fix: Extracción correcta de configuraciones (tiempo, temperatura, velocidad)
   - ✅ Fix: Porciones precisas (manejo de rangos como "4-6" → 6)
   - ✅ Fix: Solo 3-4 tags relevantes (elimina "recetas similares")
   - ✅ Fix: Soporte para recetas multiparte (plato + salsa + acompañamiento)

3. **Migración de base de datos**
   - ✅ Nuevo campo `function` en tabla `instructions`
   - ✅ Nuevo campo `section` en tablas `ingredients` e `instructions`
   - ✅ Migration aplicada: `20250930050343_add_thermomix_function_and_sections`

**Archivos modificados:**
- `backend/prisma/schema.prisma` - Schema actualizado
- `backend/src/services/llmServiceImproved.ts` - Prompts mejorados + HTML cleanup
- `backend/src/routes/importHtml.ts` - Guardado de nuevos campos
- `src/types/recipe.ts` - Interfaces actualizadas
- `src/utils/recipeUtils.ts` - Detección de función
- `src/components/ExtensionInstallModal.tsx` - Nuevo componente
- `src/components/Header.tsx` - Menu actualizado

**Próximos pasos sugeridos:**
- [ ] Actualizar documentación (README + CLAUDE.md) ✅ EN PROGRESO
- [ ] Commit y push a repo remoto
- [ ] Plan de deployment a Vercel (pendiente análisis)

---

## 🎯 **FUNCIONALIDADES IMPLEMENTADAS**

### **1. Chrome Extension para Importación Directa**
- ✅ Manifest V3 para máxima compatibilidad
- ✅ Content script para extracción de contenido HTML
- ✅ Background service worker para comunicación con API
- ✅ Popup UI con autenticación y estado visual
- ✅ Soporte para Cookidoo, Instagram, blogs de cocina y más
- ✅ Extracción automática de recetas completas con un clic
- ✅ Modal de instrucciones de instalación en la app

**Archivos clave:**
- `extension/manifest.json` - Configuración Manifest V3
- `extension/background.js` - Service worker con API communication
- `extension/content.js` - Content script para extracción
- `extension/popup.html/js/css` - UI de la extensión
- `src/components/ExtensionInstallModal.tsx` - Modal de instrucciones

### **2. Sistema de Text-to-Speech (TTS)**
- ✅ Generación automática de scripts narrativos con LLM
- ✅ Configuración de voz personalizable (velocidad, tono, volumen, idioma)
- ✅ Reproducción directa desde tarjetas de recetas
- ✅ Reproducción completa desde modal de recetas
- ✅ Soporte para múltiples idiomas (ES-AR, ES-ES, ES-MX, EN-US, EN-GB)
- ✅ Detección automática de voces del sistema
- ✅ Almacenamiento de configuración en localStorage

**Archivos clave:**
- `src/hooks/useVoiceSettings.ts` - Hook para configuración de voz
- `src/components/VoiceSettingsModal.tsx` - Modal de configuración
- `src/pages/Index.tsx` - Implementación de TTS en cards
- `src/components/RecipeModal.tsx` - TTS completo en modal

### **3. Importación de Documentos (PDF/DOCX)**
- ✅ Soporte para archivos PDF con procesamiento multimodal GPT-4o-mini
- ✅ Soporte para archivos DOCX con extracción avanzada
- ✅ Conversión de páginas PDF a imágenes para análisis visual
- ✅ Detección automática de iconos de tiempo y porciones
- ✅ Generación automática de etiquetas relevantes (3-4 tags)
- ✅ Clasificación automática de dificultad y tipo de receta
- ✅ Sistema de preview con thumbnails de páginas
- ✅ Wizard de 4 pasos para importación PDF
- ✅ Validación robusta con Zod schemas

**Archivos clave:**
- `backend/src/services/pdfProcessor.ts` - Procesamiento PDF
- `backend/src/services/llmServiceImproved.ts` - Análisis con LLM
- `backend/src/routes/importPdf.ts` - API endpoints PDF
- `src/components/pdf/PdfImportModal.tsx` - UI principal PDF
- `backend/src/routes/recipes.ts` - Validación Zod mejorada

### **4. Importación Optimizada de Cookidoo/Thermomix**
- ✅ **Detección de función Thermomix**: Amasar, Batir, Picar, Mezclar, Triturar, etc.
- ✅ **Extracción precisa de configuraciones**: Tiempo, temperatura, velocidad
- ✅ **Limpieza HTML automática**: Elimina tags `<nobr>`, `<br>` y otros
- ✅ **Prevención de duplicación de unidades**: "40 g" en vez de "40 g g"
- ✅ **Detección mejorada de porciones**: Manejo de rangos (4-6 → 6)
- ✅ **Limitación de tags**: Solo 3-4 tags relevantes, sin "recetas similares"
- ✅ **Soporte para recetas multiparte**: Plato principal, salsas, acompañamientos
- ✅ **Schema actualizado**: Nuevos campos `function` y `section` en DB

**Archivos clave:**
- `backend/prisma/schema.prisma` - Campos `function` y `section` agregados
- `backend/src/services/llmServiceImproved.ts` - Prompts optimizados para Cookidoo
- `backend/src/routes/importHtml.ts` - Guardado de nuevos campos
- `src/types/recipe.ts` - Interfaces actualizadas
- `src/utils/recipeUtils.ts` - Utilidades para function detection

**Mejoras específicas en prompts LLM:**
- Instrucciones detalladas para extracción de función Thermomix
- Patrones de detección para tiempo/temperatura/velocidad
- Reglas anti-duplicación de unidades
- Cleanup de HTML entities y tags
- Detección de secciones en recetas complejas

### **5. Gestión de Usuarios y Perfiles**
- ✅ Sistema de autenticación completo
- ✅ Edición de perfiles de usuario
- ✅ Carga de fotos de perfil con preview
- ✅ Validación de formatos de imagen
- ✅ Almacenamiento seguro en base de datos

**Archivos clave:**
- `src/components/EditProfileModal.tsx` - Edición de perfil
- `backend/src/routes/profile.ts` - API de perfiles

### **6. UI/UX Mejoradas**
- ✅ Themed components con TasteBox branding
- ✅ Gradientes y sombras elegantes
- ✅ Animaciones suaves en hover/focus
- ✅ Iconografía consistente con Lucide React
- ✅ Responsive design optimizado
- ✅ Theme switcher (claro/oscuro)
- ✅ Loading states y feedback visual
- ✅ Toasts informativos para acciones

**Archivos clave:**
- `src/index.css` - Estilos globales y themed variants
- `src/components/ThemeSwitcher.tsx` - Switcher de tema
- `src/contexts/ThemeContext.tsx` - Context de tema

### **7. Validación y Manejo de Errores**
- ✅ Schemas Zod robustos para null/undefined
- ✅ Manejo de errores en importación de documentos
- ✅ Cleanup automático de archivos temporales
- ✅ Validación de tipos TypeScript estricta
- ✅ Error boundaries y fallbacks
- ✅ Sistema de cálculo nutricional automático funcional

**Mejoras específicas:**
- Cambio de `.optional().nullable().transform()` a `.nullable().optional()`
- Conversión de `null` a `''` en processing
- Manejo de arrays vacíos en tags e ingredients
- Timeouts para operaciones de larga duración
- **FIX**: Validación `recipeType` para aceptar valores `null` en actualizaciones automáticas de nutrición

### **8. Sistema de Cálculo Nutricional**
- ✅ Cálculo automático de información nutricional con LLM
- ✅ Modal de información nutricional con etiqueta FDA-style
- ✅ Integración transparente en actualización de recetas
- ✅ Manejo robusto de datos nutricionales opcionales
- ✅ Validación backend corregida para campos nullable

**Archivos clave:**
- `src/components/NutritionModal.tsx` - Modal principal con auto-cálculo
- `src/components/NutritionLabel.tsx` - Etiqueta nutricional estilo FDA
- `src/hooks/useNutritionCalculator.ts` - Hook para cálculos LLM
- `backend/src/routes/recipes.ts` - Validación Zod corregida (líneas 17, 61)

---

## 📋 PLAN: IMPORTACIÓN DE RECETAS EN PDF (COMPLETADO)

### 🎯 **Objetivo**
Implementar sistema de importación de recetas desde archivos PDF con soporte completo para:
- Texto extraído de PDF
- Imágenes y elementos visuales (iconos de tiempo, porciones, fotos)
- Layout y formato preservado
- Procesamiento con GPT-5-mini multimodal usando Responses API

### 🏗️ **Arquitectura Propuesta**

```
PDF Upload → Páginas como Imágenes → GPT-5-mini (Responses API) → Recetas Estructuradas
     ↓              ↓                         ↓                           ↓
  pdf-parse    pdf2pic/pdf-img       Multimodal Analysis           JSON Response
```

### 📦 **Dependencias Nuevas**
```bash
# Backend
npm install pdf-parse pdf2pic pdf-img canvas

# Alternativos si pdf2pic falla:
npm install pdf-poppler pdf-to-image
```

### 🔧 **Componentes a Implementar**

#### **1. Backend - PDF Processor Service**
- **Archivo**: `backend/src/services/pdfProcessor.ts`
- **Responsabilidades**:
  - Extraer páginas como imágenes (PNG/JPEG)
  - Almacenar imágenes temporalmente
  - Extraer texto como fallback
  - Limpiar archivos temporales

```typescript
class PdfProcessor {
  async processPdfBuffer(buffer: Buffer): Promise<PdfProcessedContent>
  async convertPageToImage(pageNum: number): Promise<string> // base64 image
  async extractPageRange(fileId: string, start: number, end: number): Promise<PdfPageData[]>
  async detectRecipesWithImages(pages: PdfPageData[]): Promise<RecipeDetectionResult>
}
```

#### **2. Backend - LLM Service Update**
- **Archivo**: `backend/src/services/llmServiceImproved.ts`
- **Nuevo método**: `extractMultipleRecipesFromPdfPages()`

```typescript
async extractMultipleRecipesFromPdfPages(
  pages: { image: string, text?: string, pageNum: number }[]
): Promise<{ success: boolean; recipes: any[]; error?: string }>
```

**Prompt para GPT-5-mini**:
```
Analiza estas páginas de un documento PDF que contiene recetas de cocina.

IMPORTANTE - Busca y extrae:
1. ICONOS VISUALES: Iconos de reloj (tiempo), personas (porciones), dificultad
2. IMÁGENES: Fotos de platos terminados, ingredientes, pasos
3. TEXTO: Títulos, ingredientes, instrucciones completas
4. LAYOUT: Usa la disposición visual para entender la estructura

Para cada receta detectada, responde con JSON:
{
  "recipes": [
    {
      "title": "Título exacto",
      "description": "Incluir referencias a imágenes si las hay",
      "prepTime": [NÚMERO de iconos/texto de tiempo prep],
      "cookTime": [NÚMERO de iconos/texto de tiempo cocción],
      "servings": [NÚMERO de iconos/texto de porciones],
      "hasImage": boolean,
      "ingredients": [...],
      "instructions": [...],
      "pageNumbers": [1, 2] // páginas donde aparece
    }
  ]
}

NO inventes tiempos/porciones si no ves iconos o texto específico.
```

#### **3. Backend - API Routes**
- **Archivo**: `backend/src/routes/importPdf.ts`
- **Endpoints**:
  - `POST /api/import/pdf/upload` - Subir PDF
  - `POST /api/import/pdf/extract` - Extraer recetas con imágenes
  - `GET /api/import/pdf/preview/:fileId/:pageRange` - Preview visual
  - `DELETE /api/import/pdf/cleanup/:fileId` - Limpiar archivos

#### **4. Frontend - PDF Import Components**

**Componentes nuevos**:
- `src/components/pdf/PdfImportModal.tsx` - Modal principal
- `src/components/pdf/PdfUploader.tsx` - Upload con preview PDF
- `src/components/pdf/PdfPageSelector.tsx` - Selector de páginas con thumbnails
- `src/components/pdf/PdfRecipeExtractor.tsx` - Procesamiento visual
- `src/components/pdf/PdfRecipeReviewer.tsx` - Review con imágenes

#### **5. Types - PDF Processing**
```typescript
// backend/src/types/pdf.ts y src/types/pdf.ts
interface PdfProcessedContent {
  totalPages: number;
  pageImages: { pageNum: number; imageUrl: string; text?: string }[];
}

interface PdfExtractedRecipe extends DocxExtractedRecipe {
  hasImage: boolean;
  pageNumbers: number[];
  thumbnailUrl?: string;
}
```

### 🎨 **UI/UX Mejoras**

#### **Page Selector con Thumbnails**
```tsx
// Vista previa visual de páginas PDF como miniaturas
<div className="grid grid-cols-4 gap-2">
  {pageImages.map(page => (
    <div key={page.pageNum} className="relative">
      <img src={page.imageUrl} className="w-full h-32 object-cover" />
      <input type="checkbox" className="absolute top-2 right-2" />
      <span className="absolute bottom-1 left-1 bg-black/50 text-white text-xs px-1">
        Página {page.pageNum}
      </span>
    </div>
  ))}
</div>
```

#### **Recipe Reviewer con Imágenes**
- Mostrar thumbnail de la página donde se encontró la receta
- Indicadores visuales de datos extraídos de iconos vs texto
- Preview de la imagen de la receta si se detectó

### ⚡ **Flujo de Trabajo**

```
1. 📄 Usuario sube PDF
   └── Convertir todas las páginas a imágenes
   └── Extraer texto como fallback
   └── Mostrar thumbnails para selección

2. 🖼️ Usuario selecciona rango de páginas
   └── Mostrar preview visual de páginas seleccionadas
   └── Confirmar que se ven las recetas

3. 🤖 Procesar con GPT-5-mini
   └── Enviar imágenes de páginas + texto extraído
   └── GPT-5-mini analiza contenido visual y textual
   └── Detecta iconos de tiempo/porciones automáticamente

4. ✅ Review y guardado
   └── Mostrar recetas con thumbnails de origen
   └── Indicar qué datos se extrajeron visualmente
   └── Guardar en base de datos
```

### 🔧 **Configuración Técnica**

#### **GPT-5-mini Multimodal Setup (Responses API)**
```typescript
const response = await openai.responses.create({
  model: 'gpt-5-mini', // Costo-optimizado con capacidades multimodales
  input: [
    { type: 'text', text: prompt },
    ...pages.map(page => ({
      type: 'image_url',
      image_url: { url: `data:image/jpeg;base64,${page.image}` }
    }))
  ],
  reasoning: {
    effort: 'minimal' // Velocidad optimizada para tareas de extracción
  },
  text: {
    verbosity: 'medium' // Balance entre detalle y concisión
  },
  max_output_tokens: 8000
  // Usar prompt engineering para JSON estructurado
});
```

#### **✅ Ventajas del Responses API**
- **Chain of Thought**: Razonamiento paso a paso mejorado
- **Menos tokens**: Reutilización del razonamiento entre turnos
- **Mayor cache hit**: Mejor performance
- **Menor latencia**: Especialmente con `effort: 'minimal'`

#### **Image Processing**
```typescript
// Convertir PDF páginas a imágenes optimizadas
const convertOptions = {
  format: 'jpeg',
  out_dir: './temp/',
  out_prefix: 'recipe_page',
  page: pageNum,
  quality: 85, // Balance calidad/tamaño
  width: 1200, // Resolución óptima para GPT-5-mini
  height: 1600
};
```

### 📋 **Lista de Tareas**

#### **Día 1: Setup Backend**
- [ ] Instalar dependencias PDF (pdf2pic, pdf-parse)
- [ ] Crear `PdfProcessor` service
- [ ] Implementar conversión página → imagen
- [ ] Setup almacenamiento temporal de imágenes
- [ ] Crear tipos TypeScript para PDF

#### **Día 2: LLM Integration**
- [ ] Actualizar `LLMServiceImproved` con GPT-5-mini
- [ ] Implementar `extractMultipleRecipesFromPdfPages()`
- [ ] Crear prompt optimizado para análisis visual
- [ ] Testing con documento PDF de ejemplo

#### **Día 3: API Routes**
- [ ] Crear rutas PDF `/api/import/pdf/*`
- [ ] Implementar upload con validación PDF
- [ ] Endpoint de extracción con imágenes
- [ ] Manejo de archivos temporales y cleanup

#### **Día 4: Frontend Components**
- [ ] `PdfImportModal` con wizard de 4 pasos
- [ ] `PdfUploader` con preview de thumbnail
- [ ] `PdfPageSelector` con grid de miniaturas
- [ ] Integrar en Header con botón "PDF"

#### **Día 5: Testing & Polish**
- [ ] Testing con PDF real (tu documento keto)
- [ ] Validar detección de iconos tiempo/porciones
- [ ] Verificar extracción de imágenes de recetas
- [ ] Optimizar prompts según resultados

### 🚨 **Consideraciones Importantes**

#### **Performance**
- Procesar páginas de a chunks (máx 5 páginas por request)
- Comprimir imágenes para reducir payload a GPT-5-mini
- Cachear imágenes procesadas por 1 hora

#### **Fallbacks**
- Si conversión a imagen falla → usar texto extraído
- Si GPT-5-mini falla → fallback a processing por texto
- Validar que PDF tiene contenido antes de procesar

#### **Límites**
- Máximo 50MB por PDF
- Máximo 50 páginas por documento
- Timeout de 5 minutos por procesamiento

### 💰 **Estimación Costos GPT-5-mini**
- ~10-15 recetas por documento típico
- ~5-8 páginas con imágenes por procesamiento
- Costo estimado: [Depende de pricing GPT-5-mini]

---

## 📝 **Notas de Implementación**

- Mantener compatibilidad con sistema DOCX existente
- Reutilizar componentes UI donde sea posible (RecipeReviewer)
- Logging detallado para debug de extracción visual
- Considerar agregar opción "Extraer solo texto" como fallback rápido

Este plan debería resultar en una solución robusta que capture tanto iconos visuales como imágenes de recetas desde PDFs, resolviendo los problemas actuales del sistema DOCX.
- hay un plan creado para agregar importacion de documentos PDF que hay que conitnuar}