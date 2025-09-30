# TasteBox Recipe Importer - Chrome Extension

Extensión de Chrome para importar recetas desde cualquier sitio web a tu colección de TasteBox.

## 📋 Características

- 🔍 **Detección automática de recetas** en páginas web
- 📥 **Importación con un click** directamente desde el navegador
- 🔐 **Autenticación integrada** con tu cuenta TasteBox
- 🎯 **Botón flotante** en páginas con recetas detectadas
- ⚙️ **Modo desarrollo/producción** configurable
- 🌐 **Sin limitaciones CORS** - funciona con cualquier sitio web

## 🚀 Instalación (Modo Desarrollo)

### 1. Preparar la extensión

Los archivos de la extensión ya están listos en la carpeta `extension/`.

### 2. Añadir íconos (Opcional)

Por ahora, la extensión usa íconos placeholder. Para añadir íconos personalizados:

1. Crea íconos en los siguientes tamaños: 16x16, 32x32, 48x48, 128x128
2. Guárdalos en `extension/icons/` con los nombres:
   - `icon16.png`
   - `icon32.png`
   - `icon48.png`
   - `icon128.png`

Puedes usar el logo de TasteBox desde `public/tastebox.png` como base.

### 3. Cargar en Chrome

1. Abre Chrome y ve a: `chrome://extensions/`

2. Activa el **"Modo de desarrollador"** (toggle en la esquina superior derecha)

3. Haz click en **"Cargar extensión sin empaquetar"**

4. Selecciona la carpeta `extension/` del proyecto

5. ¡Listo! Verás el ícono de TasteBox en la barra de extensiones

## 🔧 Configuración

### Modo Desarrollo vs Producción

Por defecto, la extensión está en **modo desarrollo** y se conecta a:
- Backend: `http://localhost:3005`
- Frontend: `http://localhost:8080`

Para cambiar entre modos:

1. Haz click en el ícono de la extensión
2. Inicia sesión con tu cuenta
3. Activa/desactiva el toggle **"Modo Desarrollo"**

#### Configurar URLs de producción

Edita `extension/js/config.js`:

```javascript
production: {
  apiUrl: 'https://api.tastebox.com',      // Tu URL de API
  frontendUrl: 'https://app.tastebox.com'  // Tu URL de frontend
}
```

## 📖 Uso

### Importar una receta

1. **Navega** a cualquier sitio web con recetas (ej: cookpad.com, instagram.com)

2. **Detecta automáticamente**: Si la página contiene una receta, verás un **botón flotante** en la esquina inferior derecha

3. **Importa con un click**:
   - Opción 1: Click en el botón flotante
   - Opción 2: Click en el ícono de la extensión → "Importar Receta"

4. **¡Listo!** La receta se guarda en tu colección de TasteBox

### Iniciar sesión

1. Haz click en el ícono de la extensión en Chrome
2. Ingresa tu email y contraseña de TasteBox
3. Click en "Iniciar Sesión"

## 🏗️ Estructura del Proyecto

```
extension/
├── manifest.json          # Configuración de la extensión
├── popup.html             # UI del popup
├── README.md             # Esta documentación
├── css/
│   ├── popup.css         # Estilos del popup
│   └── content.css       # Estilos del botón flotante
├── js/
│   ├── config.js         # Configuración de URLs
│   ├── background.js     # Service worker (API calls, auth)
│   ├── content.js        # Script en páginas (detección, UI)
│   └── popup.js          # Lógica del popup
└── icons/
    ├── icon16.png
    ├── icon32.png
    ├── icon48.png
    └── icon128.png
```

## 🔍 Cómo funciona

### 1. Content Script (`content.js`)
- Se inyecta en todas las páginas web
- Detecta si la página contiene una receta usando:
  - Schema.org markup (`[itemtype*="Recipe"]`)
  - JSON-LD structured data
  - Keywords comunes (ingredients, instructions)
- Muestra botón flotante si detecta receta
- Captura HTML de la página para análisis

### 2. Background Service Worker (`background.js`)
- Maneja autenticación con el backend
- Almacena token de autenticación
- Realiza llamadas a la API
- Gestiona el estado de la extensión

### 3. Popup (`popup.js`)
- Interfaz de usuario principal
- Login/logout
- Vista del estado de detección
- Botón manual de importación
- Configuración de entorno

## 🐛 Debugging

### Ver logs de la extensión

1. Ve a `chrome://extensions/`
2. Busca "TasteBox Recipe Importer"
3. Click en "Inspeccionar vistas: service worker"
4. Abre la consola para ver logs del background script

### Ver logs del content script

1. Abre la página web donde está la receta
2. Abre DevTools (F12)
3. Ve a la pestaña Console
4. Verás logs como "TasteBox content script loaded"

### Problemas comunes

**❌ El botón flotante no aparece**
- Verifica que estés autenticado
- Recarga la página después de instalar la extensión
- La página debe contener indicadores de receta

**❌ Error de autenticación**
- Verifica que el backend esté corriendo en `localhost:3005`
- Revisa el modo desarrollo/producción en la configuración
- Intenta cerrar sesión y volver a iniciar

**❌ Error al importar**
- Verifica la conexión con el backend
- Revisa la consola del background script para más detalles
- Verifica que el endpoint `/api/import-html` esté funcionando

## 🚀 Publicación en Chrome Web Store

Para publicar la extensión en la Chrome Web Store:

1. **Preparar**:
   - Cambiar `isDevelopment: false` en `config.js`
   - Configurar URLs de producción
   - Añadir íconos profesionales
   - Crear screenshots de la extensión

2. **Empaquetar**:
   ```bash
   # Desde la carpeta extension/
   zip -r tastebox-extension.zip .
   ```

3. **Publicar**:
   - Ve a [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
   - Paga la tarifa única de $5
   - Sube el ZIP
   - Completa la información (descripción, screenshots, etc.)
   - Envía para revisión

4. **Tiempo de revisión**: Usualmente 1-3 días

## 🔒 Permisos requeridos

La extensión requiere los siguientes permisos:

- `activeTab`: Para leer contenido de la pestaña actual al importar
- `storage`: Para guardar token de autenticación y configuración
- `cookies`: Para mantener la sesión con el backend
- `host_permissions`: Para hacer requests al backend (localhost + producción)

## 📝 Notas de desarrollo

- La extensión usa **Manifest V3** (última versión requerida por Chrome)
- No requiere dependencias externas (vanilla JavaScript)
- Compatible con Chrome 88+
- Funciona offline (excepto para importar recetas)

## 🤝 Contribuir

Para mejorar la extensión:

1. Edita los archivos en `extension/`
2. Recarga la extensión en `chrome://extensions/` (botón refresh)
3. Prueba los cambios
4. No es necesario reinstalar, solo recargar

## 📞 Soporte

Si tienes problemas:

1. Revisa la sección de Debugging
2. Verifica que el backend esté corriendo
3. Revisa los logs en la consola del service worker
4. Intenta recargar la extensión

---

**Versión**: 1.0.0
**Última actualización**: 2025-09-30