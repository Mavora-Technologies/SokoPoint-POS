import { createApp } from './app';
import { env } from './config/env';
import { prisma } from './db/client';

const app = createApp();
const PORT = parseInt(env.PORT, 10);

const startServer = async () => {
  try {
    // Test the Prisma SQLite database connection
    await prisma.$connect();
    console.log('Connected to database via Prisma successfully.');

    app.listen(PORT, () => {
      console.log(`Vora-POS API server running on port ${PORT} in ${env.NODE_ENV} mode`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();