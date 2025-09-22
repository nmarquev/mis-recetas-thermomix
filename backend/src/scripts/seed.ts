import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create demo users
  const hashedPassword = await bcrypt.hash('demo123', 12);

  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@thermomix.com' },
    update: {},
    create: {
      email: 'demo@thermomix.com',
      name: 'Usuario Demo',
      password: hashedPassword
    }
  });

  const chefUser = await prisma.user.upsert({
    where: { email: 'chef@cocina.com' },
    update: {},
    create: {
      email: 'chef@cocina.com',
      name: 'Chef María',
      password: hashedPassword
    }
  });

  console.log('👥 Demo users created');

  // Create some demo tags
  const tags = ['Pasta', 'Italiana', 'Vegetariana', 'Familiar', 'Pan', 'Integral', 'Saludable', 'Horno', 'Sopa', 'Verduras', 'Vegana'];

  for (const tagName of tags) {
    await prisma.tag.upsert({
      where: { name: tagName },
      update: {},
      create: { name: tagName }
    });
  }

  console.log('🏷️ Tags created');

  // Create demo recipe
  await prisma.recipe.upsert({
    where: { id: 'demo-recipe-1' },
    update: {},
    create: {
      id: 'demo-recipe-1',
      userId: demoUser.id,
      title: 'Pasta con Salsa de Tomate Casera',
      description: 'Una deliciosa pasta con salsa de tomate fresco preparada completamente en Thermomix. Perfecta para toda la familia.',
      prepTime: 35,
      servings: 4,
      difficulty: 'Fácil',
      recipeType: 'Pasta',
      ingredients: {
        create: [
          { name: '400g de pasta', amount: '400', unit: 'g', order: 1 },
          { name: '800g de tomates maduros', amount: '800', unit: 'g', order: 2 },
          { name: '1 cebolla mediana', amount: '1', unit: 'unidad', order: 3 },
          { name: '2 dientes de ajo', amount: '2', unit: 'dientes', order: 4 },
          { name: 'Aceite de oliva virgen extra', amount: '50', unit: 'ml', order: 5 },
          { name: 'Sal y pimienta al gusto', amount: 'al gusto', order: 6 },
          { name: 'Albahaca fresca', amount: 'al gusto', order: 7 }
        ]
      },
      instructions: {
        create: [
          { step: 1, description: 'Cortar la cebolla y el ajo. Colocar en el vaso y triturar 5 seg/vel 5.', speed: '5', time: '5 seg' },
          { step: 2, description: 'Añadir aceite y rehogar 3 min/varoma/vel 1.', speed: '1', time: '3 min', temperature: 'varoma' },
          { step: 3, description: 'Añadir los tomates cortados en cuartos y cocinar 15 min/100°/vel 1.', speed: '1', time: '15 min', temperature: '100°' },
          { step: 4, description: 'Triturar la salsa 10 seg/vel 5. Sazonar al gusto.', speed: '5', time: '10 seg' },
          { step: 5, description: 'Servir sobre la pasta cocida y decorar con albahaca fresca.' }
        ]
      },
      tags: {
        create: [
          { tag: { connect: { name: 'Pasta' } } },
          { tag: { connect: { name: 'Italiana' } } },
          { tag: { connect: { name: 'Vegetariana' } } },
          { tag: { connect: { name: 'Familiar' } } }
        ]
      }
    }
  });

  console.log('🍝 Demo recipe created');
  console.log('✅ Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });