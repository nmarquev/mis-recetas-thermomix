#!/usr/bin/env node

/**
 * Script para empaquetar la extensión Chrome de TasteBox
 * Genera un archivo ZIP listo para distribución
 */

import { createWriteStream, existsSync, mkdirSync, readdirSync, statSync } from 'fs';
import { join, dirname, relative } from 'path';
import { fileURLToPath } from 'url';
import archiver from 'archiver';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuración
const CONFIG = {
  sourceDir: join(__dirname, '..', 'extension'),
  outputDir: join(__dirname, '..', 'dist'),
  outputFile: 'tastebox-extension.zip',
  excludePatterns: [
    '.git',
    '.gitignore',
    'node_modules',
    '.DS_Store',
    'Thumbs.db',
    '*.log',
    '*.tmp',
    '.env',
    'README.md'
  ]
};

// Función para verificar si un archivo debe ser excluido
function shouldExclude(filePath) {
  const fileName = filePath.split(/[\\/]/).pop();
  return CONFIG.excludePatterns.some(pattern => {
    if (pattern.includes('*')) {
      const regex = new RegExp(pattern.replace('*', '.*'));
      return regex.test(fileName);
    }
    return fileName === pattern || filePath.includes(pattern);
  });
}

// Función principal
async function packageExtension() {
  console.log('📦 Empaquetando Extensión TasteBox...\n');

  // Crear directorio de salida si no existe
  if (!existsSync(CONFIG.outputDir)) {
    mkdirSync(CONFIG.outputDir, { recursive: true });
    console.log(`✅ Directorio creado: ${CONFIG.outputDir}`);
  }

  const outputPath = join(CONFIG.outputDir, CONFIG.outputFile);
  const output = createWriteStream(outputPath);
  const archive = archiver('zip', {
    zlib: { level: 9 } // Máxima compresión
  });

  // Event handlers
  output.on('close', () => {
    const sizeInMB = (archive.pointer() / 1024 / 1024).toFixed(2);
    console.log(`\n✅ Extensión empaquetada exitosamente!`);
    console.log(`📁 Archivo: ${outputPath}`);
    console.log(`📊 Tamaño: ${sizeInMB} MB`);
    console.log(`📋 Total bytes: ${archive.pointer()}`);
    console.log(`\n🚀 Listo para distribuir en: https://tastebox.beweb.com.ar/downloads/tastebox-extension.zip`);
  });

  archive.on('warning', (err) => {
    if (err.code === 'ENOENT') {
      console.warn('⚠️  Warning:', err.message);
    } else {
      throw err;
    }
  });

  archive.on('error', (err) => {
    throw err;
  });

  // Pipe archive data to the file
  archive.pipe(output);

  // Agregar archivos de la extensión
  console.log('📂 Agregando archivos...\n');

  function addDirectory(dir, baseDir = '') {
    const files = readdirSync(dir);

    files.forEach(file => {
      const filePath = join(dir, file);
      const relativePath = relative(CONFIG.sourceDir, filePath);

      // Saltar archivos excluidos
      if (shouldExclude(relativePath)) {
        console.log(`⏭️  Saltando: ${relativePath}`);
        return;
      }

      const stat = statSync(filePath);

      if (stat.isDirectory()) {
        addDirectory(filePath, baseDir);
      } else {
        const archivePath = join(baseDir, relativePath);
        archive.file(filePath, { name: archivePath });
        console.log(`✓ ${relativePath}`);
      }
    });
  }

  addDirectory(CONFIG.sourceDir);

  // Finalizar el archivo
  await archive.finalize();
}

// Ejecutar
packageExtension().catch(err => {
  console.error('❌ Error empaquetando extensión:', err);
  process.exit(1);
});
