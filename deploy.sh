#!/bin/bash

#############################################
# TasteBox - Script de Deployment VPS
# Para usar con CloudPanel y PM2
#############################################

set -e  # Salir si hay error

echo "🚀 Iniciando deployment de TasteBox..."

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # Sin color

# Configuración
APP_NAME="tastebox"
REPO_URL="https://github.com/nmarquev/tastebox.git"
BRANCH="main"

echo -e "${YELLOW}📦 Paso 1: Descargando últimos cambios desde Git...${NC}"
git fetch origin
git reset --hard origin/$BRANCH
git pull origin $BRANCH

echo -e "${YELLOW}🔧 Paso 2: Instalando dependencias...${NC}"
npm install --production=false

echo -e "${YELLOW}🔨 Paso 3: Compilando frontend...${NC}"
npm run build

echo -e "${YELLOW}🔨 Paso 4: Compilando backend...${NC}"
cd backend
npm install --production=false
npm run build

echo -e "${YELLOW}🔄 Paso 5: Reiniciando servicio PM2...${NC}"
cd ..

# Verificar si el proceso PM2 existe, si no crearlo
if pm2 list | grep -q "$APP_NAME"; then
    echo "Reiniciando proceso PM2 existente..."
    pm2 restart $APP_NAME
else
    echo "Creando nuevo proceso PM2..."
    pm2 start backend/dist/index.js --name $APP_NAME
fi

pm2 save

echo -e "${YELLOW}🧹 Paso 6: Limpieza...${NC}"
# Limpiar node_modules de desarrollo
npm prune --production

echo -e "${GREEN}✅ ¡Deployment completado exitosamente!${NC}"
echo -e "${GREEN}📊 Estado de PM2:${NC}"
pm2 status

echo -e "\n${YELLOW}📝 Comandos útiles:${NC}"
echo "  pm2 logs $APP_NAME       - Ver logs"
echo "  pm2 restart $APP_NAME    - Reiniciar app"
echo "  pm2 stop $APP_NAME       - Detener app"
echo "  pm2 monit                - Monitorear recursos"
