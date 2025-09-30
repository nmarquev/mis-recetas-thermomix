# 🍳 TasteBox - Recipe Genius

Una aplicación web avanzada para gestión de recetas de cocina con funcionalidades de importación inteligente y síntesis de voz.

## ✨ Características Principales

### 🎯 **Gestión de Recetas**
- ✅ CRUD completo de recetas con validación robusta
- ✅ Soporte para imágenes múltiples con gestión optimizada
- ✅ Sistema de etiquetas y categorización automática
- ✅ Filtrado avanzado por dificultad, tiempo, tipo, etc.
- ✅ Favoritos y búsqueda inteligente

### 🤖 **Importación Inteligente**
- ✅ **Chrome Extension**: Importación directa desde cualquier sitio web con un clic
- ✅ **URLs**: Instagram, sitios web de recetas
- ✅ **PDF**: Análisis multimodal con GPT-4o-mini
- ✅ **DOCX**: Extracción avanzada de documentos Word
- ✅ Detección automática de ingredientes e instrucciones
- ✅ Generación automática de metadatos (tags, dificultad, tipo)
- ✅ **Cookidoo/Thermomix**: Extracción optimizada con función, tiempo, temperatura, velocidad
- ✅ **Recetas multiparte**: Soporte para secciones (plato principal, salsa, acompañamiento)

### 🎧 **Text-to-Speech (TTS)**
- ✅ Reproducción de recetas con voz natural
- ✅ Generación automática de scripts narrativos
- ✅ Configuración personalizable (velocidad, tono, idioma)
- ✅ Soporte multi-idioma (ES-AR, ES-ES, EN-US, etc.)

### 🥗 **Información Nutricional**
- ✅ Cálculo automático de datos nutricionales con IA
- ✅ Etiqueta nutricional estilo FDA
- ✅ Análisis por porción y total
- ✅ Integración transparente con OpenAI

### 👤 **Gestión de Usuario**
- ✅ Sistema de autenticación completo
- ✅ Perfiles personalizables con foto
- ✅ Configuraciones globales (tema, voz)

### 🎨 **UI/UX Moderna**
- ✅ Diseño responsivo con Tailwind CSS
- ✅ Tema claro/oscuro
- ✅ Componentes elegantes con shadcn/ui
- ✅ Animaciones suaves y feedback visual

## 🛠️ Stack Tecnológico

### **Frontend**
- **React 18** con TypeScript
- **Vite** para desarrollo rápido
- **Tailwind CSS** + **shadcn/ui** para styling
- **Lucide React** para iconografía
- **Zustand** para gestión de estado

### **Backend**
- **Node.js** con Express
- **Prisma ORM** con SQLite
- **JWT** para autenticación
- **Multer** para upload de archivos
- **Zod** para validación

### **IA y Procesamiento**
- **OpenAI GPT-5-mini** con Responses API para extracción optimizada
- **OpenAI GPT-4o-mini** para análisis multimodal
- **pdf-poppler** para procesamiento PDF
- **mammoth** para archivos DOCX
- **Web Speech API** para síntesis de voz

### **Browser Extension**
- **Chrome Manifest V3** para máxima compatibilidad
- **Content Scripts** para extracción de contenido web
- **Background Service Worker** para comunicación con API

## 🚀 Instalación y Desarrollo

### **Prerrequisitos**
- Node.js 18+ y npm
- Git

### **Setup del Proyecto**

```bash
# Clonar repositorio
git clone <repository-url>
cd thermo-recipe-genius

# Instalar dependencias del frontend
npm install

# Instalar dependencias del backend
cd backend
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tu OpenAI API key y otras configuraciones

# Generar Prisma client y base de datos
npx prisma generate
npx prisma db push

# Volver al directorio raíz
cd ..
```

### **Comandos de Desarrollo**

```bash
# Iniciar frontend (puerto 5173)
npm run dev

# Iniciar backend (puerto 3001)
cd backend && npm run dev

# O ejecutar ambos en paralelo
npm run dev:all
```

### **Comandos Útiles**

```bash
# Linting y type checking
npm run lint
npm run typecheck

# Build para producción
npm run build

# Base de datos
cd backend && npx prisma studio  # Interfaz visual DB
cd backend && npx prisma db seed  # Datos de prueba
```

## 📁 Estructura del Proyecto

```
thermo-recipe-genius/
├── src/                          # Frontend React
│   ├── components/               # Componentes reutilizables
│   │   ├── pdf/                 # Componentes específicos PDF
│   │   ├── docx/                # Componentes específicos DOCX
│   │   └── ui/                  # Componentes base shadcn/ui
│   ├── hooks/                   # Custom React hooks
│   ├── services/                # API clients
│   ├── types/                   # Definiciones TypeScript
│   ├── utils/                   # Funciones utilitarias
│   └── pages/                   # Páginas principales
├── backend/                     # Backend Node.js
│   ├── src/
│   │   ├── routes/              # API endpoints
│   │   ├── services/            # Lógica de negocio
│   │   ├── middleware/          # Middlewares Express
│   │   ├── types/               # Tipos compartidos
│   │   └── utils/               # Utilidades backend
│   ├── prisma/                  # Schema y migraciones DB
│   └── uploads/                 # Archivos temporales
├── extension/                   # Chrome Extension
│   ├── manifest.json            # Manifest V3 config
│   ├── background.js            # Service worker
│   ├── content.js               # Content script
│   ├── popup.html/js/css        # Extension popup
│   └── icons/                   # Extension icons
├── public/                      # Assets estáticos
└── docs/                        # Documentación
```

## 🔧 Configuración

### **Variables de Entorno**

```bash
# Backend (.env)
OPENAI_API_KEY=sk-...              # API key de OpenAI
JWT_SECRET=your-jwt-secret         # Secret para JWT
DATABASE_URL=file:./dev.db         # URL de base de datos
PORT=3001                          # Puerto del backend
UPLOAD_DIR=./uploads               # Directorio uploads

# Frontend (opcional)
VITE_API_URL=http://localhost:3001 # URL del backend
```

### **Base de Datos**

El proyecto usa **SQLite** por simplicidad en desarrollo. Para producción, puedes cambiar a PostgreSQL o MySQL modificando el `schema.prisma`.

```prisma
// Para PostgreSQL
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

## 📖 Uso

### **Importar Recetas**

1. **Chrome Extension** (Recomendado):
   - Instala la extensión desde el menú de usuario
   - Navega a cualquier sitio web con recetas (Cookidoo, Instagram, blogs, etc.)
   - Haz clic en el ícono de TasteBox en la barra de herramientas
   - La receta se importará automáticamente con todos los detalles

2. **Desde URL**: Pega una URL de Instagram o sitio web de recetas

3. **Desde PDF**: Sube un archivo PDF, selecciona páginas, extrae automáticamente

4. **Desde DOCX**: Sube un documento Word con recetas

5. **Manualmente**: Crea recetas desde cero

### **Recetas Thermomix/Cookidoo**

La importación de recetas Thermomix está optimizada para extraer:
- **Función**: Amasar, Batir, Picar, Mezclar, etc.
- **Tiempo**: Duración exacta de cada paso
- **Temperatura**: °C o modo Varoma
- **Velocidad**: Velocidades 1-10, Mariposa, Turbo
- **Secciones**: Plato principal, salsas, acompañamientos

### **Text-to-Speech**

1. Haz clic en el botón ▶️ en cualquier tarjeta de receta
2. Configura la voz en Settings > Configuración de Voz
3. Ajusta velocidad, tono, idioma según preferencias

### **Gestión**

- **Filtros**: Usa el panel lateral para filtrar por tags, dificultad, etc.
- **Favoritos**: Marca recetas como favoritas con ❤️
- **Búsqueda**: Busca por nombre, ingredientes o tags
- **Edición**: Edita cualquier receta con el botón ✏️

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit cambios (`git commit -am 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

## 📝 Changelog

### **v2.2.0** - Septiembre 2025
- ✅ **Chrome Extension**: Importación directa desde cualquier sitio web
- ✅ **Thermomix mejorado**: Detección de función (Amasar, Batir, Picar, etc.)
- ✅ **Cookidoo optimizado**: Extracción precisa de ingredientes, instrucciones y configuraciones
- ✅ **Recetas multiparte**: Soporte para secciones (plato + salsa + acompañamiento)
- ✅ **HTML cleanup**: Eliminación automática de tags HTML en instrucciones
- ✅ **Mejora en tags**: Limitados a 3-4 relevantes, sin duplicados
- ✅ **Servings mejorado**: Detección precisa de porciones en Cookidoo
- ✅ **Migration**: Nuevos campos `function` y `section` en base de datos

### **v2.1.0** - Enero 2025
- ✅ Sistema de cálculo nutricional automático completamente funcional
- ✅ Fix crítico: Validación Zod para campos `recipeType` nullable
- ✅ Modal de información nutricional con etiqueta FDA-style
- ✅ Integración transparente de datos nutricionales en recetas
- ✅ Manejo robusto de errores en actualizaciones automáticas

### **v2.0.0** - Noviembre 2024
- ✅ Sistema TTS completo con configuración personalizable
- ✅ Importación PDF multimodal con GPT-4o-mini
- ✅ Validación Zod robusta para null/undefined
- ✅ UI/UX mejorada con themed components
- ✅ Fixes en modales y manejo de errores

### **v1.0.0** - Octubre 2024
- ✅ Funcionalidad base de recetas
- ✅ Importación DOCX y URLs
- ✅ Sistema de autenticación
- ✅ Gestión de imágenes

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver `LICENSE` para más detalles.

## 🔗 Links

- **Documentación**: [CLAUDE.md](./CLAUDE.md)
- **Issues**: [GitHub Issues](https://github.com/your-repo/issues)
- **OpenAI API**: [Documentación](https://platform.openai.com/docs)

---

**Desarrollado con ❤️ usando React, Node.js y OpenAI**