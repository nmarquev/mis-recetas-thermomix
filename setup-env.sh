#!/bin/bash

#############################################
# TasteBox - Setup de Variables de Entorno
# Ejecutar UNA VEZ antes del primer deployment
#############################################

echo "🔧 Configurando variables de entorno para TasteBox..."

# Crear archivo .env si no existe
if [ ! -f .env ]; then
    echo "📝 Creando archivo .env..."
    cat > .env << 'EOF'
# Base de datos
DATABASE_URL="postgresql://usuario:password@localhost:5432/tastebox"

# JWT Secret (cambiar por uno seguro)
JWT_SECRET="cambiar-por-secret-seguro-generado"

# OpenAI API
OPENAI_API_KEY="tu-api-key-de-openai"

# Puertos
PORT=3000
VITE_API_URL=http://localhost:3000

# Entorno
NODE_ENV=production
EOF
    echo "✅ Archivo .env creado"
    echo "⚠️  IMPORTANTE: Edita .env y configura tus valores reales"
else
    echo "✅ El archivo .env ya existe"
fi

# Crear archivo .env en backend si no existe
if [ ! -f backend/.env ]; then
    echo "📝 Creando backend/.env..."
    ln -s ../.env backend/.env
    echo "✅ Link simbólico creado: backend/.env -> ../.env"
else
    echo "✅ backend/.env ya existe"
fi

echo ""
echo "📋 Próximos pasos:"
echo "1. Editar .env con tus valores reales:"
echo "   nano .env"
echo ""
echo "2. Generar un JWT_SECRET seguro:"
echo "   openssl rand -base64 32"
echo ""
echo "3. Configurar DATABASE_URL con tus credenciales de PostgreSQL"
echo ""
echo "4. Agregar tu OPENAI_API_KEY"
echo ""
echo "5. Ejecutar el primer deployment:"
echo "   ./deploy.sh"
