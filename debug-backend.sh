#!/bin/bash

echo "🔍 Diagnosticando backend en servidor..."
echo ""

echo "1️⃣ Estado de PM2:"
pm2 status
echo ""

echo "2️⃣ Procesos Node.js corriendo:"
ps aux | grep node | grep -v grep
echo ""

echo "3️⃣ Puerto 5000 escuchando:"
netstat -tuln | grep 5000 || ss -tuln | grep 5000
echo ""

echo "4️⃣ Variables de entorno (.env):"
if [ -f .env ]; then
    echo "PORT=$(grep PORT .env)"
    echo "NODE_ENV=$(grep NODE_ENV .env)"
    echo "SSL_ENABLED=$(grep SSL_ENABLED .env)"
else
    echo "❌ Archivo .env NO encontrado"
fi
echo ""

echo "5️⃣ Últimos logs de PM2:"
pm2 logs tastebox --lines 20 --nostream
echo ""

echo "6️⃣ Probando backend directamente:"
curl -v http://127.0.0.1:5000/api/health 2>&1 | head -20
echo ""

echo "7️⃣ Verificar si backend/dist existe:"
ls -la backend/dist/index.js
