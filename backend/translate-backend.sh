#!/bin/bash

# Script para traducir mensajes del backend al español

# Función para traducir un archivo
translate_file() {
  local file="$1"
  echo "Traduciendo: $file"

  # Console.log messages
  sed -i "s/console\.log('Starting /console.log('Iniciando /g" "$file"
  sed -i "s/console\.log('Failed to /console.log('Error al /g" "$file"
  sed -i "s/console\.log('Error /console.log('Error /g" "$file"
  sed -i "s/console\.log('Success/console.log('Éxito/g" "$file"
  sed -i "s/console\.log('Invalid /console.log('Inválido /g" "$file"
  sed -i "s/console\.log('Missing /console.log('Falta /g" "$file"
  sed -i "s/console\.log('Found /console.log('Encontrado /g" "$file"
  sed -i "s/console\.log('Fetching /console.log('Obteniendo /g" "$file"
  sed -i "s/console\.log('Processing /console.log('Procesando /g" "$file"
  sed -i "s/console\.log('Extracting /console.log('Extrayendo /g" "$file"
  sed -i "s/console\.log('Converting /console.log('Convirtiendo /g" "$file"
  sed -i "s/console\.log('Cleaning /console.log('Limpiando /g" "$file"
  sed -i "s/console\.log('Uploading /console.log('Subiendo /g" "$file"
  sed -i "s/console\.log('Downloading /console.log('Descargando /g" "$file"
  sed -i "s/console\.log('Saving /console.log('Guardando /g" "$file"
  sed -i "s/console\.log('Loading /console.log('Cargando /g" "$file"
  sed -i "s/console\.log('Generating /console.log('Generando /g" "$file"
  sed -i "s/console\.log('Creating /console.log('Creando /g" "$file"
  sed -i "s/console\.log('Deleting /console.log('Eliminando /g" "$file"
  sed -i "s/console\.log('Updating /console.log('Actualizando /g" "$file"

  # Console.error messages
  sed -i "s/console\.error('Error /console.error('Error /g" "$file"
  sed -i "s/console\.error('Failed /console.error('Falló /g" "$file"

  # Throw new Error messages
  sed -i "s/throw new Error('Failed to /throw new Error('Error al /g" "$file"
  sed -i "s/throw new Error('Invalid /throw new Error('Inválido /g" "$file"
  sed -i "s/throw new Error('Missing /throw new Error('Falta /g" "$file"
  sed -i "s/throw new Error('No /throw new Error('No hay /g" "$file"
  sed -i "s/throw new Error('Could not /throw new Error('No se pudo /g" "$file"
  sed -i "s/throw new Error('Cannot /throw new Error('No se puede /g" "$file"
  sed -i "s/throw new Error('Unauthorized/throw new Error('No autorizado/g" "$file"
  sed -i "s/throw new Error('Not found/throw new Error('No encontrado/g" "$file"

  # Response messages
  sed -i "s/error: 'Invalid /error: 'Inválido /g" "$file"
  sed -i "s/error: 'Missing /error: 'Falta /g" "$file"
  sed -i "s/error: 'Failed to /error: 'Error al /g" "$file"
  sed -i "s/error: 'No /error: 'No hay /g" "$file"
  sed -i "s/error: 'Unauthorized/error: 'No autorizado/g" "$file"
  sed -i "s/error: 'Not found/error: 'No encontrado/g" "$file"

  # Common comments
  sed -i "s/\/\/ Process /\/\/ Procesar /g" "$file"
  sed -i "s/\/\/ Extract /\/\/ Extraer /g" "$file"
  sed -i "s/\/\/ Convert /\/\/ Convertir /g" "$file"
  sed -i "s/\/\/ Validate /\/\/ Validar /g" "$file"
  sed -i "s/\/\/ Clean /\/\/ Limpiar /g" "$file"
  sed -i "s/\/\/ Store /\/\/ Almacenar /g" "$file"
  sed -i "s/\/\/ Fetch /\/\/ Obtener /g" "$file"
  sed -i "s/\/\/ Generate /\/\/ Generar /g" "$file"
  sed -i "s/\/\/ Create /\/\/ Crear /g" "$file"
  sed -i "s/\/\/ Delete /\/\/ Eliminar /g" "$file"
  sed -i "s/\/\/ Update /\/\/ Actualizar /g" "$file"
  sed -i "s/\/\/ Save /\/\/ Guardar /g" "$file"
  sed -i "s/\/\/ Load /\/\/ Cargar /g" "$file"
}

# Traducir todos los archivos de servicios
for file in src/services/*.ts; do
  translate_file "$file"
done

# Traducir todos los archivos de rutas
for file in src/routes/*.ts; do
  translate_file "$file"
done

# Traducir middleware
for file in src/middleware/*.ts; do
  translate_file "$file"
done

echo "Traducción completada"
