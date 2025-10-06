# TasteBox Chrome Extension

Extensión Chrome para importar recetas desde cualquier sitio web directamente a tu colección TasteBox.

## 🌟 Características

- **Importación con 1 click**: Detecta automáticamente recetas en la página que estás visitando
- **Compatible con cualquier sitio**: Funciona en Cookidoo, Instagram, blogs de cocina y más
- **Detección inteligente**: Usa IA para extraer ingredientes, pasos y configuraciones Thermomix
- **Autenticación segura**: Inicia sesión una vez y la extensión recuerda tu sesión
- **Modo desarrollo**: Toggle para cambiar entre producción y desarrollo con puertos personalizables

## 📦 Instalación

### Usuarios Finales (Producción)

1. Descarga el archivo `tastebox-extension.zip` desde:
   ```
   https://tastebox.beweb.com.ar/downloads/tastebox-extension.zip
   ```

2. Descomprime el archivo en una carpeta de tu elección

3. Abre Chrome y ve a:
   ```
   chrome://extensions/
   ```

4. Activa el "Modo de desarrollador" (toggle en la esquina superior derecha)

5. Click en "Cargar extensión sin empaquetar"

6. Selecciona la carpeta que descomprimiste

7. ¡Listo! Verás el ícono de TasteBox en tu barra de herramientas

### Desarrolladores

1. Clona el repositorio

2. La carpeta `extension/` contiene todos los archivos de la extensión

3. Carga la extensión desde `extension/` en Chrome (mismo proceso que arriba)

4. Activa el toggle "Modo Desarrollo" en el popup de la extensión

5. Configura los puertos personalizados si es necesario:
   - Puerto Backend (default: 3005)
   - Puerto Frontend (default: 8080)

## 🔧 Configuración

### Producción (Default)
- API: `https://tastebox.beweb.com.ar:5000`
- Frontend: `https://tastebox.beweb.com.ar`

### Desarrollo
- API: `https://localhost:[puerto-configurado]` (default: 3005)
- Frontend: `http://localhost:[puerto-configurado]` (default: 8080)

## 🚀 Uso

1. **Inicia sesión**: Click en el ícono de la extensión y ingresa tus credenciales de TasteBox

2. **Navega a una receta**: Visita cualquier sitio web con recetas (ej: cookidoo.international, cookpad.com)

3. **Importa**: Si la extensión detecta una receta, verás un botón naranja flotante. Click para importar

4. **Verifica**: La receta se importará automáticamente a tu colección TasteBox

## 🛠️ Desarrollo

### Estructura de Archivos

```
extension/
├── manifest.json          # Configuración de la extensión
├── popup.html            # UI del popup
├── js/
│   ├── background.js     # Service worker (background)
│   ├── content.js        # Content script
│   ├── popup.js          # Lógica del popup
│   └── config.js         # Configuración de URLs y endpoints
├── css/
│   ├── popup.css         # Estilos del popup
│   └── content.css       # Estilos del botón flotante
└── icons/
    └── *.png             # Íconos de la extensión
```

### Empaquetar para Distribución

Desde la raíz del proyecto, ejecuta:

```bash
npm run package-extension
```

Esto generará `dist/tastebox-extension.zip` listo para distribuir.

## 📝 Permisos Requeridos

- `activeTab`: Para leer el contenido de la página actual
- `storage`: Para guardar token de autenticación y configuración
- `cookies`: Para manejo de sesión

## 🔐 Seguridad

- Los tokens de autenticación se almacenan localmente en `chrome.storage.local`
- Todas las comunicaciones con el servidor usan HTTPS
- No se almacenan contraseñas, solo tokens JWT

## 📄 Licencia

Propiedad de TasteBox. Todos los derechos reservados.
