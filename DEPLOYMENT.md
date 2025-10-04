# 🚀 Deployment en VPS - TasteBox

Guía completa para hacer deployment de TasteBox en un VPS con CloudPanel y PM2.

## 📋 Prerrequisitos en el VPS

- Node.js 18+ instalado
- PostgreSQL instalado y corriendo
- PM2 instalado globalmente: `npm install -g pm2`
- Git configurado con acceso al repositorio
- CloudPanel (opcional, para gestión)

## 🔧 Setup Inicial (Primera vez)

### 1. Clonar el repositorio

```bash
cd /home/cloudpanel/htdocs
git clone https://github.com/nmarquev/tastebox.git
cd tastebox
```

### 2. Configurar variables de entorno

```bash
# Ejecutar script de setup
chmod +x setup-env.sh
./setup-env.sh

# Editar .env con valores reales
nano .env
```

**Configurar:**
- `DATABASE_URL`: Conexión a PostgreSQL
- `JWT_SECRET`: Generar con `openssl rand -base64 32`
- `OPENAI_API_KEY`: Tu API key de OpenAI
- `PORT`: Puerto del backend (default: 3000)

### 3. Crear base de datos

```bash
# Crear base de datos en PostgreSQL
psql -U postgres
CREATE DATABASE tastebox;
\q

# Ejecutar migraciones de Prisma
cd backend
npx prisma migrate deploy
npx prisma generate
cd ..
```

### 4. Primer deployment

```bash
chmod +x deploy.sh
./deploy.sh
```

## 🔄 Deployments Posteriores

Para actualizar la aplicación con nuevos cambios:

```bash
./deploy.sh
```

El script automáticamente:
1. 📦 Descarga últimos cambios desde Git
2. 🔧 Instala dependencias actualizadas
3. 🔨 Compila frontend
4. 🔨 Compila backend
5. 🔄 Reinicia servicio PM2
6. 🧹 Limpia archivos temporales

## 📊 Comandos útiles PM2

```bash
# Ver logs en tiempo real
pm2 logs tastebox

# Ver solo errores
pm2 logs tastebox --err

# Ver estado de la app
pm2 status

# Reiniciar manualmente
pm2 restart tastebox

# Detener app
pm2 stop tastebox

# Monitorear recursos
pm2 monit

# Ver info detallada
pm2 show tastebox
```

## 🔍 Troubleshooting

### Error: "Process tastebox not found"

El proceso PM2 no existe. El script `deploy.sh` lo creará automáticamente.

### Error de compilación TypeScript

Asegúrate de tener la última versión del repo:
```bash
git fetch origin
git reset --hard origin/main
./deploy.sh
```

### Base de datos no conecta

Verifica DATABASE_URL en `.env`:
```bash
cat .env | grep DATABASE_URL
```

### Puerto en uso

Cambia el puerto en `.env` y reinicia:
```bash
nano .env  # Cambiar PORT
pm2 restart tastebox --update-env
```

### Logs de errores

Ver logs completos:
```bash
pm2 logs tastebox --lines 100
```

O revisar archivos de log:
```bash
tail -f backend/logs/error.log
tail -f backend/logs/output.log
```

## 🔐 Seguridad

- ✅ Archivo `.env` **NO** está en el repositorio (está en .gitignore)
- ✅ Cambiar `JWT_SECRET` por uno seguro único
- ✅ Usar HTTPS en producción (configurar reverse proxy en CloudPanel)
- ✅ Configurar firewall para solo permitir puertos necesarios
- ✅ Mantener dependencias actualizadas: `npm audit`

## 🌐 Configuración de Dominio (CloudPanel)

1. Ir a CloudPanel → Sites → Add Site
2. Configurar dominio (ej: tastebox.tudominio.com)
3. Configurar Reverse Proxy:
   - Reverse Proxy URL: `http://localhost:3000`
   - Enable SSL/TLS
4. Obtener certificado SSL con Let's Encrypt

## 📈 Monitoreo

PM2 incluye monitoring básico:
```bash
pm2 monit
```

Para monitoreo avanzado, considera:
- PM2 Plus (pm2.io)
- New Relic
- DataDog

## 🔄 Rollback

Si algo falla, revertir al commit anterior:
```bash
git log --oneline  # Ver últimos commits
git reset --hard <commit-anterior>
./deploy.sh
```

## 📝 Notas Importantes

- El script usa `--production=false` durante build para tener devDependencies
- Después del build ejecuta `npm prune --production` para limpiar
- PM2 guarda logs en `backend/logs/`
- Límite de memoria configurado: 500MB (reinicia automáticamente si excede)
