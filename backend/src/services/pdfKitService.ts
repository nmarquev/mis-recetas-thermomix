import PDFDocument from 'pdfkit';
import { Recipe } from '../types/recipe';
import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';

export class PdfKitService {
  static async downloadImage(url: string): Promise<Buffer | null> {
    return new Promise((resolve) => {
      try {
        const protocol = url.startsWith('https') ? https : http;
        const request = protocol.get(url, (response) => {
          if (response.statusCode === 200) {
            const chunks: Buffer[] = [];
            response.on('data', (chunk) => chunks.push(chunk));
            response.on('end', () => resolve(Buffer.concat(chunks)));
          } else {
            console.log(`❌ Error descargando imagen: ${response.statusCode}`);
            resolve(null);
          }
        });

        request.on('error', (error) => {
          console.log(`❌ Error descargando imagen: ${error.message}`);
          resolve(null);
        });

        request.setTimeout(5000, () => {
          console.log('❌ Timeout descargando imagen');
          request.destroy();
          resolve(null);
        });
      } catch (error) {
        console.log(`❌ Error descargando imagen: ${error}`);
        resolve(null);
      }
    });
  }

  static async generateRecipePdf(recipe: Recipe): Promise<Buffer> {
    return new Promise(async (resolve, reject) => {
      try {
        console.log('🎯 Generando PDF con PDFKit para:', recipe.title);

        // Configurar documento con encoding UTF-8
        const doc = new PDFDocument({
          margin: 30,
          info: {
            Title: recipe.title,
            Author: 'TasteBox',
            Subject: 'Receta de cocina',
            Producer: 'TasteBox Recipe Generator'
          }
        });

        const buffers: Buffer[] = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(buffers);
          console.log('✅ PDF generado con PDFKit, tamaño:', pdfBuffer.length, 'bytes');
          resolve(pdfBuffer);
        });

        doc.on('error', (error) => {
          console.error('❌ Error en PDFKit:', error);
          reject(error);
        });

        // Descargar imagen si existe
        let imageBuffer: Buffer | null = null;
        if (recipe.images && recipe.images.length > 0) {
          console.log('📸 Descargando imagen de la receta...');
          imageBuffer = await this.downloadImage(recipe.images[0].url);
        }

        // Descargar logo de TasteBox
        let logoBuffer: Buffer | null = null;
        try {
          logoBuffer = fs.readFileSync(path.join(process.cwd(), 'tastebox_white.png'));
          console.log('✅ Logo de TasteBox cargado');
        } catch (error) {
          console.log('⚠️ No se pudo cargar el logo de TasteBox:', error.message);
        }

        // HEADER LIMPIO Y SIMPLE (como el modal)
        let yPos = 40;

        // Título principal (grande y elegante)
        doc.fillColor('#1a1a1a')
           .fontSize(28)
           .font('Helvetica-Bold')
           .text(recipe.title, 40, yPos, { width: doc.page.width - 80 });

        yPos += 50;

        // IMAGEN DE LA RECETA (centrada y grande como el modal)
        if (imageBuffer) {
          try {
            const imageWidth = doc.page.width - 80; // Ancho completo menos márgenes
            const imageHeight = 200; // Altura fija elegante
            const imageX = 40;
            const imageY = yPos;

            // Imagen centrada y elegante
            doc.image(imageBuffer, imageX, imageY, {
              width: imageWidth,
              height: imageHeight,
              fit: [imageWidth, imageHeight]
            });

            // Badge de dificultad sobre la imagen (esquina superior derecha)
            const badgeX = imageX + imageWidth - 80;
            const badgeY = imageY + 15;

            // Fondo del badge con transparencia
            doc.rect(badgeX, badgeY, 70, 25)
               .fill('#ff6b35')
               .opacity(0.9);

            // Texto del badge
            doc.fillColor('white')
               .fontSize(12)
               .font('Helvetica-Bold')
               .text(recipe.difficulty, badgeX + 5, badgeY + 8, {
                 width: 60,
                 align: 'center'
               });

            doc.opacity(1); // Resetear opacidad

            yPos += imageHeight + 20;
            console.log('✅ Imagen añadida al PDF');
          } catch (imgError) {
            console.log('⚠️ Error al añadir imagen:', imgError);
          }
        }

        // DESCRIPCIÓN (debajo de la imagen)
        if (recipe.description) {
          doc.fillColor('#4a5568')
             .fontSize(14)
             .font('Helvetica')
             .text(recipe.description, 40, yPos, {
               width: doc.page.width - 80,
               lineGap: 4,
               align: 'justify'
             });

          const descriptionHeight = doc.heightOfString(recipe.description, {
            width: doc.page.width - 80
          });
          yPos += descriptionHeight + 30;
        } else {
          yPos += 20;
        }

        // INFORMACIÓN META (compacta en una línea)
        doc.rect(30, yPos, doc.page.width - 60, 35)
           .fill('#f8f9fa');

        doc.strokeColor('#ff6b35')
           .lineWidth(1)
           .rect(30, yPos, doc.page.width - 60, 35)
           .stroke();

        const metaData = [
          { icon: 'clock', label: 'Preparacion', value: `${recipe.prepTime}min` },
          { icon: 'fire', label: 'Coccion', value: recipe.cookTime ? `${recipe.cookTime}min` : 'N/A' },
          { icon: 'people', label: 'Porciones', value: `${recipe.servings}` },
          { icon: 'star', label: 'Dificultad', value: recipe.difficulty }
        ];

        const itemWidth = (doc.page.width - 80) / 4;
        metaData.forEach((item, i) => {
          const x = 40 + (i * itemWidth);
          const iconX = x + 5;
          const iconY = yPos + 8;

          // Dibujar iconos geométricos
          doc.strokeColor('#ff6b35').lineWidth(1.5);

          if (item.icon === 'clock') {
            // Icono de reloj
            doc.circle(iconX + 8, iconY + 3, 6).stroke();
            doc.moveTo(iconX + 8, iconY + 3)
               .lineTo(iconX + 8, iconY - 1)
               .stroke();
            doc.moveTo(iconX + 8, iconY + 3)
               .lineTo(iconX + 11, iconY + 1)
               .stroke();
          } else if (item.icon === 'fire') {
            // Icono de fuego
            doc.moveTo(iconX + 8, iconY + 8)
               .lineTo(iconX + 10, iconY + 2)
               .lineTo(iconX + 12, iconY + 5)
               .lineTo(iconX + 14, iconY - 1)
               .lineTo(iconX + 11, iconY - 2)
               .lineTo(iconX + 8, iconY + 1)
               .lineTo(iconX + 6, iconY + 5)
               .lineTo(iconX + 8, iconY + 8)
               .stroke();
          } else if (item.icon === 'people') {
            // Icono de personas
            doc.circle(iconX + 6, iconY, 2).stroke();
            doc.circle(iconX + 12, iconY, 2).stroke();
            doc.rect(iconX + 4, iconY + 3, 4, 4).stroke();
            doc.rect(iconX + 10, iconY + 3, 4, 4).stroke();
          } else if (item.icon === 'star') {
            // Icono de estrella
            doc.moveTo(iconX + 8, iconY - 1)
               .lineTo(iconX + 9, iconY + 2)
               .lineTo(iconX + 12, iconY + 2)
               .lineTo(iconX + 10, iconY + 4)
               .lineTo(iconX + 11, iconY + 7)
               .lineTo(iconX + 8, iconY + 5)
               .lineTo(iconX + 5, iconY + 7)
               .lineTo(iconX + 6, iconY + 4)
               .lineTo(iconX + 4, iconY + 2)
               .lineTo(iconX + 7, iconY + 2)
               .lineTo(iconX + 8, iconY - 1)
               .stroke();
          }

          doc.fillColor('#666')
             .fontSize(8)
             .font('Helvetica-Bold')
             .text(item.label, x + 20, yPos + 6);

          doc.fillColor('#333')
             .fontSize(12)
             .font('Helvetica-Bold')
             .text(item.value, x + 20, yPos + 18);
        });

        yPos += 50;

        // INGREDIENTES Y INSTRUCCIONES EN COLUMNAS
        const leftColumnWidth = (doc.page.width - 80) * 0.4; // 40% para ingredientes
        const rightColumnWidth = (doc.page.width - 80) * 0.55; // 55% para instrucciones
        const columnGap = 20;

        // INGREDIENTES (columna izquierda)
        let leftY = yPos;
        doc.fillColor('#2c3e50')
           .fontSize(14)
           .font('Helvetica-Bold')
           .text('Ingredientes', 40, leftY);

        leftY += 25;

        doc.fillColor('#333')
           .fontSize(9)
           .font('Helvetica');

        recipe.ingredients.forEach((ingredient, index) => {
          if (leftY > doc.page.height - 100) return; // Evitar overflow

          // Fondo alternado
          if (index % 2 === 0) {
            doc.rect(35, leftY - 2, leftColumnWidth + 10, 15).fill('#f9f9f9');
          }

          // Bullet
          doc.fillColor('#ff6b35')
             .fontSize(6)
             .text('●', 40, leftY + 2);

          // Texto del ingrediente (más compacto)
          const text = `${ingredient.amount || ''} ${ingredient.unit || ''} ${ingredient.name}`.trim();
          doc.fillColor('#333')
             .fontSize(9)
             .font('Helvetica')
             .text(text, 50, leftY, { width: leftColumnWidth - 15 });

          leftY += 15;
        });

        // INSTRUCCIONES (columna derecha)
        let rightY = yPos;
        const rightX = 40 + leftColumnWidth + columnGap;

        doc.fillColor('#2c3e50')
           .fontSize(14)
           .font('Helvetica-Bold')
           .text('Instrucciones', rightX, rightY);

        rightY += 25;

        recipe.instructions.forEach((instruction, index) => {
          if (rightY > doc.page.height - 100) return; // Evitar overflow

          // Número del paso (más pequeño)
          doc.circle(rightX + 8, rightY + 8, 8).fill('#ff6b35');
          doc.fillColor('white')
             .fontSize(10)
             .font('Helvetica-Bold')
             .text(`${instruction.step}`, rightX + (instruction.step < 10 ? 6 : 4), rightY + 5);

          // Descripción del paso
          doc.fillColor('#333')
             .fontSize(9)
             .font('Helvetica')
             .text(instruction.description, rightX + 20, rightY + 2, {
               width: rightColumnWidth - 25,
               lineGap: 1
             });

          const textHeight = doc.heightOfString(instruction.description, { width: rightColumnWidth - 25 });
          rightY += Math.max(textHeight + 8, 20);

          // Configuración Thermomix (si existe, más compacta)
          if (instruction.thermomixSettings) {
            const settings = instruction.thermomixSettings;
            const thermomixText = [];
            if (settings.time) thermomixText.push(`Tiempo: ${settings.time}`);
            if (settings.temperature) thermomixText.push(`Temp: ${settings.temperature}`);
            if (settings.speed) thermomixText.push(`Vel: ${settings.speed}`);

            if (thermomixText.length > 0) {
              doc.rect(rightX + 20, rightY, rightColumnWidth - 25, 12).fill('#e3f2fd');
              doc.fillColor('#1976d2')
                 .fontSize(7)
                 .font('Helvetica-Bold')
                 .text(`Thermomix: ${thermomixText.join(' | ')}`, rightX + 22, rightY + 3);
              rightY += 15;
            }
          }

          rightY += 5;
        });

        // FOOTER con tags y fuente (al final de la página)
        const footerY = doc.page.height - 80;

        // Tags (si existen)
        if (recipe.tags && recipe.tags.length > 0) {
          doc.fillColor('#666')
             .fontSize(10)
             .font('Helvetica-Bold')
             .text('Etiquetas: ', 40, footerY);

          let tagX = 100;
          recipe.tags.slice(0, 6).forEach((tag, index) => { // Máximo 6 tags
            const tagWidth = doc.widthOfString(tag, { fontSize: 8 }) + 8;

            if (tagX + tagWidth < doc.page.width - 40) {
              doc.rect(tagX, footerY - 2, tagWidth, 14).fill('#ff6b35');
              doc.fillColor('white')
                 .fontSize(8)
                 .font('Helvetica-Bold')
                 .text(tag, tagX + 4, footerY + 1);

              tagX += tagWidth + 5;
            }
          });
        }

        // Fuente (si existe)
        if (recipe.sourceUrl) {
          doc.fillColor('#666')
             .fontSize(8)
             .font('Helvetica')
             .text('Fuente: ', 40, footerY + 20);

          doc.fillColor('#0066cc')
             .text(recipe.sourceUrl.substring(0, 70) + (recipe.sourceUrl.length > 70 ? '...' : ''), 80, footerY + 20);
        }

        // FOOTER con logo de TasteBox
        const finalFooterY = doc.page.height - 40;

        // Logo de TasteBox en el footer
        if (logoBuffer) {
          try {
            const logoWidth = 80;
            const logoHeight = 20;
            const logoX = (doc.page.width - logoWidth) / 2;

            doc.image(logoBuffer, logoX, finalFooterY - 25, {
              width: logoWidth,
              height: logoHeight,
              fit: [logoWidth, logoHeight]
            });

            console.log('✅ Logo TasteBox añadido al footer');
          } catch (logoError) {
            console.log('⚠️ Error añadiendo logo al footer:', logoError);
            // Fallback al texto
            doc.fillColor('#999')
               .fontSize(10)
               .font('Helvetica-Bold')
               .text('TasteBox', 0, finalFooterY - 20, {
                 width: doc.page.width,
                 align: 'center'
               });
          }
        } else {
          // Fallback al texto si no hay logo
          doc.fillColor('#999')
             .fontSize(10)
             .font('Helvetica-Bold')
             .text('TasteBox', 0, finalFooterY - 20, {
               width: doc.page.width,
               align: 'center'
             });
        }

        // Texto del footer
        const finalFooter = `Generado por TasteBox - ${new Date().toLocaleDateString('es-ES')}`;
        doc.fillColor('#999')
           .fontSize(8)
           .font('Helvetica')
           .text(finalFooter, 0, finalFooterY, {
             width: doc.page.width,
             align: 'center'
           });

        doc.end();

      } catch (error) {
        console.error('❌ Error creando PDF con PDFKit:', error);
        reject(error);
      }
    });
  }
}