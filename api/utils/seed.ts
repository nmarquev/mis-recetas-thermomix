import bcrypt from 'bcryptjs';
import { redisClient } from './redis';

const demoUsers = [
  {
    email: 'demo@thermomix.com',
    name: 'Usuario Demo',
    password: 'demo123'
  },
  {
    email: 'chef@cocina.com',
    name: 'Chef Demo',
    password: 'demo123'
  }
];

export async function seedUsers() {
  try {
    console.log('Seeding demo users...');

    for (const userData of demoUsers) {
      // Verificar si el usuario ya existe
      const existingUser = await redisClient.get(`user:${userData.email}`);
      if (existingUser) {
        console.log(`User ${userData.email} already exists, skipping...`);
        continue;
      }

      // Hash de la contraseña
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(userData.password, saltRounds);

      // Crear ID único
      const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const user = {
        id: userId,
        email: userData.email,
        name: userData.name,
        password: hashedPassword,
        createdAt: new Date().toISOString()
      };

      // Guardar en Redis
      await redisClient.set(`user:${userData.email}`, user);
      await redisClient.set(`userid:${userId}`, user);

      console.log(`✅ Created user: ${userData.email}`);
    }

    console.log('Demo users seeded successfully!');
  } catch (error) {
    console.error('Error seeding users:', error);
    throw error;
  }
}

// Para uso directo
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await seedUsers();
    res.json({ message: 'Demo users seeded successfully' });
  } catch (error) {
    console.error('Seed error:', error);
    res.status(500).json({ error: 'Failed to seed users' });
  }
}