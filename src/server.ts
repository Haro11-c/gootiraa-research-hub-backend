import { createApp } from './app';
import { config } from './config';
import { connectDb, prisma } from './db/prisma';

const startServer = async () => {
  await connectDb();

  const app = createApp();

  const server = app.listen(config.port, () => {
    console.log(`🚀 Gootiraa Research Hub API listening on port ${config.port} (${config.env})`);
    console.log(`🔗 Health Check: http://localhost:${config.port}/api/v1/health`);
  });

  // Graceful shutdown
  const handleShutdown = async (signal: string) => {
    console.log(`\nReceived ${signal}. Gracefully shutting down...`);
    server.close(async () => {
      await prisma.$disconnect();
      console.log('Database disconnected. Process exited cleanly.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  process.on('SIGINT', () => handleShutdown('SIGINT'));
};

startServer();
