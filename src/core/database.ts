import mongoose from 'mongoose';
import { logger } from './logger';
import { config } from './config';

export const connectDB = async (): Promise<void> => {
  if (!config.database.enabled) {
    logger.warn('Database is not enabled (no DB_URL provided)');
    return;
  }

  const connect = async (): Promise<void> => {
    try {
      const connection = await mongoose.connect(config.database.url, {
        serverSelectionTimeoutMS: 30000,
        socketTimeoutMS: 45000,
      });
      logger.info(`MongoDB connected: ${connection.connection.host}`);
    } catch (error) {
      logger.error('MongoDB connection error', error);
      setTimeout(connect, 1000);
    }
  };

  await connect();

  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected');
    setTimeout(connect, 1000);
  });

  mongoose.connection.on('reconnected', () => {
    logger.info('MongoDB reconnected');
  });

  mongoose.connection.on('error', (error) => {
    logger.error('MongoDB error', error);
  });
};

export const disconnectDB = async (): Promise<void> => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    logger.info('MongoDB disconnected');
  }
};
