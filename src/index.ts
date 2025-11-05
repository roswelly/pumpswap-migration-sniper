import { logger } from './core/logger';
import { ErrorHandler } from './core/errors';
import { connectDB } from './core/database';
import { config } from './core/config';
import { GeyserHandler } from './handlers/geyser-handler';

async function main(): Promise<void> {
  try {
    logger.info('Starting Raydium Migration Sniper...');
    logger.info('Configuration loaded', {
      cluster: config.cluster,
      rpcUrl: config.rpc.url,
      databaseEnabled: config.database.enabled,
    });

    if (config.database.enabled) {
      await connectDB();
    }

    const geyserHandler = new GeyserHandler();
    await geyserHandler.start();

    process.on('SIGINT', () => {
      logger.info('Received SIGINT, shutting down gracefully...');
      geyserHandler.stop();
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      logger.info('Received SIGTERM, shutting down gracefully...');
      geyserHandler.stop();
      process.exit(0);
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    });

    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      process.exit(1);
    });

    logger.info('Raydium Migration Sniper is running...');
  } catch (error) {
    const appError = ErrorHandler.handle(error, 'main');
    logger.error('Failed to start application', appError);
    process.exit(1);
  }
}

main().catch((error) => {
  logger.error('Fatal error in main', error);
  process.exit(1);
});
