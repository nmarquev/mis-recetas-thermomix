import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const sharp = require('../backend/node_modules/sharp');

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

const sizes = [16, 32, 48, 128];

async function generateIcons() {
  console.log('🎨 Generando íconos de extensión...\n');

  // Generate orange icons (authenticated state)
  console.log('📦 Generando íconos naranjas (autenticado)...');
  const orangeFavicon = join(rootDir, 'favicon_tastebox.png');

  for (const size of sizes) {
    const outputPath = join(rootDir, 'extension', 'icons', `icon${size}.png`);
    await sharp(orangeFavicon)
      .resize(size, size, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toFile(outputPath);

    const stats = fs.statSync(outputPath);
    console.log(`  ✓ icon${size}.png (${Math.round(stats.size / 1024 * 10) / 10} KB)`);
  }

  // Generate gray icons (not authenticated state)
  console.log('\n📦 Generando íconos grises (no autenticado)...');
  const grayFavicon = join(rootDir, 'favicon_tastebox_gray.png');

  for (const size of sizes) {
    const outputPath = join(rootDir, 'extension', 'icons', `icon${size}-gray.png`);
    await sharp(grayFavicon)
      .resize(size, size, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toFile(outputPath);

    const stats = fs.statSync(outputPath);
    console.log(`  ✓ icon${size}-gray.png (${Math.round(stats.size / 1024 * 10) / 10} KB)`);
  }

  console.log('\n✅ Íconos generados exitosamente!');
}

generateIcons().catch(console.error);
