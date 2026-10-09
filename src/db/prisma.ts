import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

export const connectDb = async () => {
  try {
    await prisma.$connect();
    console.log('✅ Connected to database successfully.');
  } catch (err) {
    console.error('❌ Failed to connect to database:', err);
    process.exit(1);
  }
};
