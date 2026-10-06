import app from './app.js';
import { config } from './config/env.js';
import { connectDatabase } from './config/db.js';
import { seedSuperAdmin } from './services/seedSuperAdmin.js';

const startServer = async () => {
  // Attempt database connection & idempotent Super Admin seeding
  await connectDatabase();
  await seedSuperAdmin();

  const server = app.listen(config.port, () => {
    console.log(`[Server] Placement Management System API running in ${config.nodeEnv} mode on port ${config.port}`);
    console.log(`[Server] Health check endpoint: http://localhost:${config.port}/api/health`);
  });

  // Graceful shutdown handlers
  const handleShutdown = (signal) => {
    console.log(`[Server] ${signal} signal received: closing HTTP server...`);
    server.close(() => {
      console.log('[Server] HTTP server closed.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  process.on('SIGINT', () => handleShutdown('SIGINT'));
};

startServer().catch((error) => {
  console.error('[Server Startup Failure]', error);
  process.exit(1);
});
