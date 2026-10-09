import dotenv from 'dotenv';
dotenv.config();

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'file:./dev.db';
}

import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

export const connectDb = async () => {
  try {
    // Auto-verify schema sync (runs prisma db push if tables are missing on cold start)
    try {
      await prisma.$connect();
      await prisma.user.count();
      console.log('✅ Connected to database and verified schema tables.');
    } catch {
      console.log('⚠️ Database schema not yet initialized. Running prisma db push...');
      execSync('npx prisma db push --skip-generate --accept-data-loss', {
        env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL || 'file:./dev.db' },
        stdio: 'inherit',
      });
      await prisma.$connect();
      console.log('✅ Database schema synchronized successfully.');
    }
  } catch (err) {
    console.error('❌ Failed to connect to database:', err);
    process.exit(1);
  }
};
