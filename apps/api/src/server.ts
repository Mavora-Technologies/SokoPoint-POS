import { createApp } from './app';
import { env } from './config/env';

const app = createApp();
const PORT = env.PORT ? parseInt(env.PORT, 10) : 5000;

// Only spin up the manual listener if we are running locally.
// Vercel Serverless Functions just need the 'export default app' below.
if (process.env.NODE_ENV !== 'production') {
  const startServer = async () => {
    try {
      app.listen(PORT, () => {
        console.log(`Vora-POS API server running on port ${PORT} in ${env.NODE_ENV || 'development'} mode`);
      });
    } catch (error) {
      console.error('Failed to start server:', error);
      process.exit(1);
    }
  };

  startServer();
}

export default app;