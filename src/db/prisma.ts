import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

export const connectDb = async () => {
  try {
    await prisma.$connect();
    console.log('✅ Connected to database successfully.');

    // Auto-verify schema sync (runs prisma db push if tables are missing on cold start)
    try {
      await prisma.user.count();
    } catch {
      console.log('⚠️ Database schema not yet synced. Running prisma db push...');
      execSync('npx prisma db push --skip-generate --accept-data-loss', { stdio: 'inherit' });
      console.log('✅ Database schema synchronized successfully.');
    }
  } catch (err) {
    console.error('❌ Failed to connect to database:', err);
    process.exit(1);
  }
};
