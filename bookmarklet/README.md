# 🍳 TasteBox Smart Bookmarklet v2.0

## 🚀 **NUEVO EN v2.0: ZERO CONFIGURACIÓN**

¡La nueva versión elimina completamente la configuración manual! Ya no necesitas copiar tokens ni configurar cookies.

## 📖 Descripción

Este bookmarklet te permite **capturar recetas de cualquier página web** y enviarlas directamente a TasteBox. Utiliza inteligencia artificial avanzada (GPT-5-mini) para extraer automáticamente ingredientes, instrucciones, tiempos de preparación y más.

## ✨ Características

- 🚀 **Zero Configuración**: Sin tokens manuales ni cookies
- 🔐 **Auto-Autenticación**: Detecta automáticamente si estás logueado
- 🌐 **Universal**: Funciona en cualquier página web con recetas
- 🤖 **IA Avanzada**: Extrae datos usando OpenAI GPT-5-mini optimizado
- ⚡ **Súper Rápido**: Procesamiento 80% más rápido que v1.0
- 📱 **Interfaz elegante**: Overlay limpio con preview de la receta
- 🎯 **Precisión**: Mantiene cantidades y instrucciones exactamente como aparecen
- 🔍 **Detección inteligente**: Encuentra automáticamente TasteBox corriendo

## 🚀 Instalación Ultra-Rápida

### Opción 1: Smart Installer (Recomendado)
Abre `install-smart.html` en tu navegador para la nueva experiencia de instalación sin configuración.

### Opción 2: Legacy Installer
Usa `install.html` para la versión anterior (requiere configuración manual).

## 📋 Uso Simplificado

### Prerrequisitos ✅
- TasteBox corriendo (detecta automáticamente localhost:3002, tu IP:3002, etc.)
- Estar logueado en TasteBox (si no, te redirige automáticamente)

### Capturar una receta 🎯
1. **Navega** a cualquier página web con recetas
2. **Haz clic** en "🍳 Import to TasteBox" en tu barra de marcadores
3. **Automático**: Si no estás logueado, se abre ventana de login
4. **Automático**: Se extrae y guarda la receta en tu colección
5. **¡Listo!** La receta está disponible en TasteBox

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