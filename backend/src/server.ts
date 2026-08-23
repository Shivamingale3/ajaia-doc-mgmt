import { app } from './app.js';
import { env } from './config/env.config.js';
import { db } from './infra/db.js';
import { logger } from './utils/logger.js';

async function startServer(): Promise<void> {
  let dbConnected = false;

  try {
    // Connect infrastructure
    await db.$connect();
    dbConnected = true;
    logger.info('Database connection established successfully.');

    // Start HTTP server
    const server = app.listen(env.APP_PORT, () => {
      logger.info(`Server is running on port ${env.APP_PORT}`);
    });

    let isShuttingDown = false;

    const shutdown = async (signal: string): Promise<void> => {
      if (isShuttingDown) return;

      isShuttingDown = true;

      logger.info(`${signal} received. Shutting down gracefully...`);

      try {
        await new Promise<void>((resolve, reject) => {
          server.close((error) => {
            if (error) {
              reject(error);
              return;
            }

            resolve();
          });
        });

        logger.info('HTTP server closed.');

        if (dbConnected) {
          await db.$disconnect();
          logger.info('Database connection closed.');
        }

        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown:', error);
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => {
      void shutdown('SIGTERM');
    });

    process.on('SIGINT', () => {
      void shutdown('SIGINT');
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    if (dbConnected) {
      await db.$disconnect();
    }

    process.exit(1);
  }
}

void startServer();
