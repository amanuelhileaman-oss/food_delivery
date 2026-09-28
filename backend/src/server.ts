import app from './app';
import { env } from './config/env';
import prisma from './config/db';

const startServer = async () => {
  try {
    // Explicitly connect to the database on boot
    await prisma.$connect();
    console.log('Database connected successfully.');

    const server = app.listen(env.port, () => {
      console.log(`Server is running on port ${env.port} in ${env.nodeEnv} mode`);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (err: Error) => {
      console.error(`Error: ${err.message}`);
      console.log('Shutting down the server due to Unhandled Promise Rejection');
      server.close(() => {
        process.exit(1);
      });
    });
  } catch (error) {
    console.error('Failed to connect to the database:', error);
    process.exit(1);
  }
};

startServer();
