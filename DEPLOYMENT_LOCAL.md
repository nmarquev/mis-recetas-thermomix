# 🚀 Deployment Local con PM2

Este documento explica cómo usar los scripts de deployment local para testing y desarrollo.

## 📋 Prerequisitos

- Node.js instalado
- PM2 instalado globalmente: `npm install -g pm2`

## 🛠️ Scripts Disponibles

### Windows (PowerShell)
```powershell
.\deploy_local.ps1
```

### Linux/Mac/Git Bash (Bash)
```bash
chmod +x deploy_local.sh
./deploy_local.sh
```

## 📦 ¿Qué hace el script?

El script automáticamente:

1. ✅ Detiene todas las aplicaciones PM2 existentes
2. ✅ Limpia procesos Node zombies en puertos 3005, 8080, 5555
3. ✅ Compila el backend TypeScript
4. ✅ Compila el frontend
5. ✅ Inicia backend con PM2 en https://localhost:3005
6. ✅ Inicia frontend con PM2 en http://localhost:8080
7. ✅ (Opcional) Inicia Prisma Studio en http://localhost:5555

## 🌐 URLs de Acceso

Después del deployment:

- **Frontend**: http://localhost:8080
- **Backend API**: https://localhost:3005
- **Prisma Studio**: http://localhost:5555 (si lo iniciaste)

## 📝 Comandos PM2 Útiles

### Ver logs en tiempo real
```bash
pm2 logs                     # Todos los logs
pm2 logs tastebox-backend    # Solo backend
pm2 logs tastebox-frontend   # Solo frontend
```

### Ver estado de aplicaciones
```bash
pm2 list                     # Lista todas las apps
pm2 status                   # Estado general
pm2 monit                    # Monitor en tiempo real
```

### Detener aplicaciones
```bash
pm2 delete all               # Detener todas
pm2 delete tastebox-backend  # Solo backend
pm2 delete tastebox-frontend # Solo frontend
pm2 delete prisma-studio     # Solo Prisma Studio
```

### Reiniciar aplicaciones
```bash
pm2 restart tastebox-backend    # Reiniciar backend
pm2 restart tastebox-frontend   # Reiniciar frontend
pm2 restart all                 # Reiniciar todas
```

### Guardar configuración PM2
```bash
pm2 save                     # Guardar lista de apps
pm2 startup                  # Iniciar PM2 al arrancar sistema
```

## 🔄 Workflow de Desarrollo

### 1. Primera vez
```bash
# Ejecutar script de deployment
.\deploy_local.ps1           # Windows
# o
./deploy_local.sh            # Linux/Mac
```

### 2. Después de hacer cambios

**Opción A: Redesplegar todo (recomendado)**
```bash
.\deploy_local.ps1           # Compila y reinicia todo
```

**Opción B: Solo reiniciar (sin compilar)**
```bash
pm2 restart all              # Reinicia sin compilar
```

**Opción C: Solo backend o frontend**
```bash
cd backend && npm run build && pm2 restart tastebox-backend
# o
npm run build && pm2 restart tastebox-frontend
```

## 🐛 Troubleshooting

### Puerto ocupado
```bash
# Windows PowerShell
Get-NetTCPConnection -LocalPort 3005 | Select-Object OwningProcess | Stop-Process -Force

# Linux/Mac
lsof -ti:3005 | xargs kill -9
```

### PM2 no reconocido
```bash
npm install -g pm2
```

### Errores de compilación
```bash
# Backend
cd backend
npm install
npm run build

# Frontend
npm install
npm run build
```

### Limpiar todo y empezar de nuevo
```bash
pm2 delete all
pm2 kill
# Luego ejecuta el script de deployment de nuevo
```

## 📊 Ventajas de PM2 vs `npm run dev`

| Característica | PM2 | npm run dev |
|---|---|---|
| Gestión de procesos | ✅ Avanzada | ❌ Básica |
| Auto-restart en crash | ✅ Sí | ❌ No |
| Logs persistentes | ✅ Sí | ❌ No |
| Monitor en tiempo real | ✅ Sí | ❌ No |
| Clustering | ✅ Sí | ❌ No |
| Gestión de múltiples apps | ✅ Fácil | ❌ Manual |
| No bloquea terminal | ✅ Sí | ❌ No |

## 🎯 Casos de Uso

### Testing de cambios en producción local
```bash
.\deploy_local.ps1
# Prueba la app en http://localhost:8080
# Si funciona, haz commit y push
```

### Desarrollo con hot reload
```bash
# Usa npm run dev para desarrollo normal
cd backend && npm run dev  # Terminal 1
npm run dev                # Terminal 2

# Usa PM2 solo cuando necesites testear el build completo
```

### Debug de problemas de compilación
```bash
# El script muestra errores de compilación antes de iniciar
.\deploy_local.ps1
# Si falla, verás exactamente dónde está el error
```

## 📚 Más Información

- [PM2 Documentation](https://pm2.keymetrics.io/docs/usage/quick-start/)
- [PM2 Process Management](https://pm2.keymetrics.io/docs/usage/process-management/)
- [PM2 Log Management](https://pm2.keymetrics.io/docs/usage/log-management/)
