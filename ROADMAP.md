# 🗺️ TasteBox - Roadmap de Desarrollo

**Última actualización**: Octubre 2025
**URL Producción**: https://tastebox.beweb.com.ar (Backend: puerto 5000)

---

## 📊 Estado Actual del Proyecto

### ✅ Completado (v1.0)
- Sistema base de recetas CRUD
- Autenticación y gestión de usuarios
- Chrome Extension para importación directa
- Importación desde URLs (HTML/Instagram/Cookidoo)
- Importación de archivos DOCX
- Importación de archivos PDF con análisis visual
- Detección optimizada de recetas Thermomix/Cookidoo
- Soporte para recetas multiparte (secciones)
- Sistema TTS (Text-to-Speech)
- Cálculo nutricional automático
- Edición de perfiles con foto
- UI/UX con tema claro/oscuro
- Modal de edición con tabs organizados
- Sistema de empaquetado de extensión

---

## 🎯 Roadmap por Prioridad

---

## 🔴 **PRIORIDAD ALTA** - Funcionalidades Core Faltantes

### 1. **Sistema de Planificación de Menús** 🍽️
**Descripción**: Planificador semanal de comidas con generación de lista de compras.

**Funcionalidades**:
- Calendario semanal drag-and-drop para asignar recetas
- Vista diaria/semanal/mensual
- Generación automática de lista de compras consolidada
- Ajuste de porciones por comida
- Filtros: tipo de comida (desayuno, almuerzo, cena, snack)
- Notificaciones/recordatorios de comidas planificadas

**Componentes a crear**:
- `src/pages/MealPlanner.tsx` - Página principal
- `src/components/planner/WeekCalendar.tsx` - Calendario semanal
- `src/components/planner/DayView.tsx` - Vista de día
- `src/components/planner/ShoppingList.tsx` - Lista de compras
- `backend/src/routes/mealPlanner.ts` - API de planificación

**Database**:
```prisma
model MealPlan {
  id          String   @id @default(cuid())
  userId      String
  date        DateTime
  mealType    String   // breakfast, lunch, dinner, snack
  recipeId    String
  servings    Int      @default(1)
  notes       String?
  completed   Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  user   User   @relation(fields: [userId], references: [id])
  recipe Recipe @relation(fields: [recipeId], references: [id])

  @@map("meal_plans")
}

model ShoppingList {
  id         String   @id @default(cuid())
  userId     String
  weekStart  DateTime
  items      Json     // Array of { ingredient, amount, unit, checked, recipeIds[] }
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  user User @relation(fields: [userId], references: [id])

  @@map("shopping_lists")
}
```

**Estimación**: 5-7 días
**Dependencias**: Ninguna

---

### 2. **Sistema de Favoritos y Colecciones** ⭐
**Descripción**: Organización de recetas en colecciones personalizadas.

**Funcionalidades**:
- Marcar recetas como favoritas (corazón)
- Crear colecciones personalizadas ("Mis postres", "Comidas rápidas", etc.)
- Drag-and-drop de recetas entre colecciones
- Compartir colecciones públicas (opcional)
- Página de favoritos con grid de recetas
- Filtro por colección en página principal

**Componentes a crear**:
- `src/pages/Favorites.tsx` - Página de favoritos
- `src/components/collections/CollectionModal.tsx` - Crear/editar colección
- `src/components/collections/CollectionList.tsx` - Lista de colecciones
- `backend/src/routes/collections.ts` - API de colecciones

**Database**:
```prisma
model Collection {
  id          String   @id @default(cuid())
  userId      String
  name        String
  description String?
  isPublic    Boolean  @default(false)
  coverImage  String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  user    User              @relation(fields: [userId], references: [id])
  recipes CollectionRecipe[]

  @@map("collections")
}

model CollectionRecipe {
  id           String   @id @default(cuid())
  collectionId String
  recipeId     String
  order        Int      @default(0)
  createdAt    DateTime @default(now())

  collection Collection @relation(fields: [collectionId], references: [id], onDelete: Cascade)
  recipe     Recipe     @relation(fields: [recipeId], references: [id], onDelete: Cascade)

  @@unique([collectionId, recipeId])
  @@map("collection_recipes")
}

model Favorite {
  id        String   @id @default(cuid())
  userId    String
  recipeId  String
  createdAt DateTime @default(now())

  user   User   @relation(fields: [userId], references: [id])
  recipe Recipe @relation(fields: [recipeId], references: [id], onDelete: Cascade)

  @@unique([userId, recipeId])
  @@map("favorites")
}
```

**Estimación**: 3-4 días
**Dependencias**: Ninguna

---

### 3. **Sistema de Comentarios y Ratings** 💬⭐
**Descripción**: Permitir a usuarios valorar y comentar recetas.

**Funcionalidades**:
- Rating de 1-5 estrellas por receta
- Comentarios con texto y opcional foto del resultado
- Ordenar recetas por mejor rating
- Mostrar promedio de rating en cards
- Responder comentarios (threading básico)
- Marcar comentarios como útiles

**Componentes a crear**:
- `src/components/ratings/RatingStars.tsx` - Estrellas de rating
- `src/components/comments/CommentSection.tsx` - Sección de comentarios
- `src/components/comments/CommentForm.tsx` - Form para comentar
- `backend/src/routes/ratings.ts` - API de ratings
- `backend/src/routes/comments.ts` - API de comentarios

**Database**:
```prisma
model Rating {
  id        String   @id @default(cuid())
  userId    String
  recipeId  String
  rating    Int      // 1-5 stars
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user   User   @relation(fields: [userId], references: [id])
  recipe Recipe @relation(fields: [recipeId], references: [id], onDelete: Cascade)

  @@unique([userId, recipeId])
  @@map("ratings")
}

model Comment {
  id           String   @id @default(cuid())
  userId       String
  recipeId     String
  parentId     String?  // For threading
  content      String
  imageUrl     String?  // Optional photo of user's result
  helpfulCount Int      @default(0)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  user     User      @relation(fields: [userId], references: [id])
  recipe   Recipe    @relation(fields: [recipeId], references: [id], onDelete: Cascade)
  parent   Comment?  @relation("CommentThread", fields: [parentId], references: [id], onDelete: Cascade)
  replies  Comment[] @relation("CommentThread")

  @@map("comments")
}
```

**Estimación**: 3-4 días
**Dependencias**: Ninguna

---

## 🟡 **PRIORIDAD MEDIA** - Mejoras de UX/Performance

### 4. **Sistema de Búsqueda Avanzada** 🔍
**Descripción**: Búsqueda con filtros múltiples y autocompletado.

**Funcionalidades**:
- Búsqueda por ingredientes ("tengo pollo, cebolla, tomate")
- Filtros combinados: dificultad, tiempo, tipo, tags
- Autocompletado con sugerencias
- Búsqueda por rangos (tiempo: 10-30 min)
- Historial de búsquedas
- Resultados con highlighting de matches

**Componentes a crear**:
- `src/components/search/AdvancedSearchBar.tsx` - Barra de búsqueda avanzada
- `src/components/search/FilterPanel.tsx` - Panel de filtros
- `src/components/search/SearchResults.tsx` - Resultados de búsqueda
- `backend/src/routes/search.ts` - API de búsqueda optimizada

**Backend**:
- Implementar full-text search (PostgreSQL FTS o Elasticsearch)
- Índices optimizados para búsqueda
- Paginación de resultados

**Estimación**: 4-5 días
**Dependencias**: Ninguna

---

### 5. **Sistema de Sustituciones de Ingredientes** 🔄
**Descripción**: Sugerir sustitutos para ingredientes basados en alergias/disponibilidad.

**Funcionalidades**:
- Base de datos de sustituciones comunes
- Configurar alergias/intolerancias en perfil
- Sugerir automáticamente sustitutos al ver receta
- Ajustar cantidades según sustituto
- Marcar ingredientes como "no tengo"
- LLM sugiere alternativas creativas

**Componentes a crear**:
- `src/components/substitutions/SubstitutionBadge.tsx` - Badge de sustitución
- `src/components/substitutions/SubstitutionModal.tsx` - Modal de sustituciones
- `src/components/profile/AllergySettings.tsx` - Config de alergias
- `backend/src/services/substitutionService.ts` - Servicio de sustituciones

**Database**:
```prisma
model Substitution {
  id          String @id @default(cuid())
  ingredient  String
  substitute  String
  ratio       Float  @default(1.0) // Conversion ratio
  category    String // dairy, gluten, meat, etc.
  notes       String?

  @@map("substitutions")
}

model UserAllergy {
  id         String   @id @default(cuid())
  userId     String
  allergen   String
  severity   String   // mild, moderate, severe
  createdAt  DateTime @default(now())

  user User @relation(fields: [userId], references: [id])

  @@map("user_allergies")
}
```

**Estimación**: 4-5 días
**Dependencias**: Ninguna

---

### 6. **Modo Cocina (Cooking Mode)** 👨‍🍳
**Descripción**: Interfaz hands-free para seguir recetas mientras cocinas.

**Funcionalidades**:
- Pantalla completa con pasos grandes
- Avance con gestos o comandos de voz
- Timer integrado por paso
- Modo nocturno/alto contraste
- Opción de TTS automático paso a paso
- Keep screen on
- Notas rápidas por paso (voz a texto)

**Componentes a crear**:
- `src/pages/CookingMode.tsx` - Página de modo cocina
- `src/components/cooking/StepDisplay.tsx` - Display de paso actual
- `src/components/cooking/CookingTimer.tsx` - Timer integrado
- `src/hooks/useVoiceCommands.ts` - Hook para comandos de voz
- `src/hooks/useScreenWakeLock.ts` - Hook para mantener pantalla activa

**Tecnologías**:
- Web Speech API para comandos de voz
- Screen Wake Lock API
- Gestures con touch events

**Estimación**: 5-6 días
**Dependencias**: Sistema TTS ya implementado

---

### 7. **Optimización de Imágenes y CDN** 📸
**Descripción**: Mejorar carga de imágenes con optimización y CDN.

**Funcionalidades**:
- Compresión automática de imágenes al subir
- Generación de thumbnails (small, medium, large)
- Lazy loading de imágenes
- Placeholder blur mientras carga
- WebP/AVIF con fallback a JPG
- CDN para servir imágenes (Cloudflare/Cloudinary)

**Componentes a actualizar**:
- `backend/src/services/imageProcessor.ts` - Procesamiento de imágenes
- `src/components/ui/OptimizedImage.tsx` - Componente de imagen optimizada
- `backend/src/routes/upload.ts` - Upload con procesamiento

**Librerías**:
- `sharp` para procesamiento de imágenes
- Cloudinary SDK (opcional)

**Estimación**: 3-4 días
**Dependencias**: Ninguna

---

## 🟢 **PRIORIDAD BAJA** - Features Nice-to-Have

### 8. **Importación desde Video** 🎥
**Descripción**: Extraer recetas de videos de cocina (YouTube, TikTok).

**Funcionalidades**:
- Pegar URL de video
- Transcripción automática de audio (Whisper API)
- Detección de ingredientes y pasos con LLM
- Captura de frames para imágenes
- Timestamps de pasos importantes

**Componentes a crear**:
- `src/components/import/VideoImportModal.tsx`
- `backend/src/services/videoProcessor.ts`
- `backend/src/services/transcriptionService.ts`

**APIs**:
- YouTube Data API
- OpenAI Whisper API
- FFmpeg para procesamiento de video

**Estimación**: 6-8 días
**Dependencias**: Budget para APIs de transcripción

---

### 9. **Modo Multijugador/Colaborativo** 👥
**Descripción**: Cocinar recetas en grupo con sincronización en tiempo real.

**Funcionalidades**:
- Crear "sesión de cocina" compartida
- Múltiples usuarios siguiendo misma receta
- Ver progreso de otros en tiempo real
- Chat en vivo durante cocina
- Dividir tareas entre participantes
- Votación de resultados finales

**Componentes a crear**:
- `src/components/multiplayer/CookingSession.tsx`
- `src/components/multiplayer/ParticipantsList.tsx`
- `src/components/multiplayer/LiveChat.tsx`
- `backend/src/services/websocket.ts` - WebSocket server

**Tecnologías**:
- WebSockets (Socket.io)
- Redis para state compartido

**Estimación**: 8-10 días
**Dependencias**: Infraestructura de WebSockets

---

### 10. **Integración con Asistentes de Voz** 🗣️
**Descripción**: Control por voz con Alexa, Google Assistant.

**Funcionalidades**:
- "Alexa, dame una receta de pollo"
- "Google, siguiente paso"
- "Siri, pon un timer de 10 minutos"
- Lectura de recetas completas
- Añadir ingredientes a lista de compras por voz

**Skills/Actions**:
- Alexa Skill
- Google Action
- Siri Shortcuts

**Estimación**: 10-12 días
**Dependencias**: Aprobación de Amazon/Google, cuentas de desarrollador

---

## 🔧 **MEJORAS TÉCNICAS** - Deuda Técnica

### 11. **Testing E2E y Unitarios** ✅
**Tareas**:
- Tests unitarios para servicios críticos (LLM, PDF processor)
- Tests E2E para flujos principales (Playwright)
- Coverage mínimo 70%
- CI/CD con tests automáticos

**Estimación**: 5-7 días

---

### 12. **Migración a React Query v5** 🔄
**Tareas**:
- Actualizar @tanstack/react-query a v5
- Implementar caching agresivo
- Optimistic updates en edición de recetas
- Prefetching de recetas relacionadas

**Estimación**: 2-3 días

---

### 13. **Internacionalización (i18n)** 🌍
**Tareas**:
- Setup de i18next
- Traducciones ES, EN, PT
- Detección automática de idioma
- Selector de idioma en UI

**Estimación**: 4-5 días

---

### 14. **Analytics y Métricas** 📊
**Tareas**:
- Google Analytics 4 setup
- Event tracking (importación, edición, TTS)
- Dashboard de métricas en admin
- Heatmaps con Hotjar (opcional)

**Estimación**: 2-3 días

---

## 📅 Cronograma Sugerido (próximos 3 meses)

### **Mes 1**: Funcionalidades Core
- ✅ Semana 1-2: Sistema de Planificación de Menús
- ✅ Semana 3: Sistema de Favoritos y Colecciones
- ✅ Semana 4: Sistema de Comentarios y Ratings

### **Mes 2**: Mejoras de UX
- ✅ Semana 1-2: Sistema de Búsqueda Avanzada
- ✅ Semana 2-3: Sistema de Sustituciones
- ✅ Semana 3-4: Modo Cocina

### **Mes 3**: Optimización y Testing
- ✅ Semana 1: Optimización de Imágenes y CDN
- ✅ Semana 2-3: Testing E2E y Unitarios
- ✅ Semana 4: Analytics y Deploy final

---

## 🎯 Métricas de Éxito

### KPIs a Trackear:
- **Recetas importadas por usuario**: >5/semana
- **Tasa de retención 30 días**: >40%
- **Recetas cocinadas (modo cocina usado)**: >20%
- **Ratings promedio de recetas**: >4.0 estrellas
- **Tiempo promedio en app**: >15 min/sesión

---

## 💡 Ideas Futuras (Backlog)

- **Marketplace de recetas**: Vender/comprar recetas premium
- **Nutricionista virtual**: Recomendaciones personalizadas basadas en objetivos
- **Modo offline**: PWA con recetas descargadas
- **Integración con smartwatches**: Notificaciones de timers
- **AR Mode**: Ver receta en realidad aumentada sobre la mesa
- **AI Chef**: Generar recetas personalizadas con IA generativa
- **Social feed**: Feed de recetas de usuarios seguidos
- **Challenges semanales**: Retos de cocina con premios

---

## 📝 Notas Finales

**Priorización basada en**:
1. Valor para usuario (funcionalidades más demandadas)
2. Complejidad técnica (quick wins primero)
3. Dependencias entre features
4. Recursos disponibles (tiempo, budget)

**Próximos pasos inmediatos**:
1. ✅ Commit y push de todos los cambios recientes
2. ✅ Documentar configuración de producción
3. ✅ Setup de analytics básico
4. ▶️ Comenzar con Sistema de Favoritos (quick win)
