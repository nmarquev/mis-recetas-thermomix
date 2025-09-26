# 🍳 Thermomix Recipe Genius - Universal Recipe Bookmarklet

## 📖 Descripción

Este bookmarklet te permite **capturar recetas de cualquier página web** (incluyendo Cookidoo con autenticación) y enviarlas directamente a tu aplicación Recipe Genius. Utiliza inteligencia artificial para extraer automáticamente ingredientes, instrucciones, tiempos de preparación y más.

## ✨ Características

- 🌐 **Universal**: Funciona en cualquier página web con recetas
- 🔐 **Soporte para autenticación**: Accede a contenido privado como Cookidoo
- 🤖 **IA Inteligente**: Extrae datos usando OpenAI GPT-4
- ⚡ **Rápido**: Extracción directa del DOM, sin requests HTTP adicionales
- 📱 **Interfaz elegante**: Overlay con preview de la receta extraída
- 🎯 **Precisión**: Mantiene cantidades y instrucciones exactamente como aparecen

## 🚀 Instalación Rápida

### Paso 1: Abrir la página de instalación
Abre el archivo `install.html` en tu navegador para ver las instrucciones visuales e instalar el bookmarklet fácilmente.

### Paso 2: Instalar el bookmarklet
1. Asegúrate de que tu barra de marcadores esté visible en tu navegador
2. **Arrastra** el botón "🍳 Recipe Genius Importer" desde la página `install.html` a tu barra de marcadores
3. O haz clic derecho en el botón → "Agregar a marcadores"

## 📋 Uso

### Prerrequisitos
- ✅ App Recipe Genius ejecutándose en `http://localhost:8081`
- ✅ Backend ejecutándose en `http://localhost:3003`
- ✅ Sesión iniciada en la app Recipe Genius (para obtener token de autenticación)

### Capturar una receta
1. **Navega** a cualquier página web con recetas (ej: Cookidoo, blogs, RecetasThermomix.net)
2. **Haz clic** en el bookmarklet "🍳 Recipe Genius Importer" en tu barra de marcadores
3. **Espera** a que se analice la página y se extraiga la receta
4. **Revisa** el preview de la receta en el overlay
5. **Haz clic** en "Open Recipe Genius App" para ver la receta en tu aplicación

## 🛠️ Arquitectura Técnica

### Flujo de Datos
```
Página Web → Bookmarklet → Captura HTML → API Backend → OpenAI LLM → Base de Datos
```

### API Endpoints
- **POST** `/api/import-html` - Importar receta desde HTML
- **GET** `/api/import-html/health` - Health check del servicio

### Archivos del Proyecto
```
bookmarklet/
├── install.html              # Página de instalación con instrucciones
├── recipe-importer.js         # Código fuente completo del bookmarklet
├── bookmarklet-minified.js    # Versión minificada para producción
└── README.md                  # Esta documentación
```

## 🔧 Configuración Avanzada

### Cambiar URLs de la API
Si tu backend ejecuta en un puerto diferente, edita las constantes en el bookmarklet:

```javascript
const API_BASE = 'http://localhost:3003';  // Cambia aquí
```

### Tokens de Autenticación
El bookmarklet busca tokens de autenticación en estos campos de localStorage:
- `authToken`
- `token`
- `jwt`
- `auth_token`

### Headers de Autenticación
```javascript
'Authorization': `Bearer ${authToken}`
```

## 🌐 Sitios Web Compatibles

### ✅ Funcionan Perfectamente
- **Cookidoo** (con autenticación)
- **RecetasThermomix.net**
- **Blogs de cocina** (WordPress, etc.)
- **Páginas de recetas estáticas**
- **YouTube** (descripciones de videos con recetas)

### ⚠️ Limitaciones
- Sitios web con **contenido dinámico cargado por JavaScript** pueden requerir esperar a que la página cargue completamente
- Sitios web con **medidas anti-bot muy agresivas** podrían bloquear requests

## 🐛 Resolución de Problemas

### Error: "Authentication token not found"
- **Causa**: No has iniciado sesión en Recipe Genius
- **Solución**: Inicia sesión en `http://localhost:8081` primero

### Error: "Network error: Could not connect to Recipe Genius app"
- **Causa**: El backend no está ejecutándose
- **Solución**: Inicia el backend con `npm run dev` en el directorio backend

### Error: "Failed to extract recipe from this page"
- **Causa**: La página no contiene recetas reconocibles o el LLM no pudo procesarlas
- **Solución**: Verifica que la página tenga ingredientes e instrucciones claramente visibles

### El bookmarklet no hace nada
- **Causa**: JavaScript está deshabilitado o el bookmarklet no se instaló correctamente
- **Solución**: Reinstala el bookmarklet desde `install.html`

## 📈 Próximas Mejoras

- [ ] Soporte para más tipos de contenido (videos, PDFs)
- [ ] Detección automática de recetas múltiples en una página
- [ ] Cache local para uso offline
- [ ] Sincronización con múltiples instancias de Recipe Genius
- [ ] Extensión de navegador completa

## 🤝 Contribuir

Para mejorar el bookmarklet:

1. Edita `recipe-importer.js` (código fuente)
2. Minifica el código para crear la versión de producción
3. Actualiza `install.html` con la nueva versión
4. Prueba en diferentes sitios web

## 📜 Licencia

Parte del proyecto Thermomix Recipe Genius. Uso interno.

---

**¡Disfruta capturando recetas de toda la web con tu Thermomix Recipe Genius! 🍳✨**