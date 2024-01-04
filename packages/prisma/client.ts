import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

if (!process.env.DATABASE_URL) {
  logger.error('DATABASE_URL environment variable is not set or empty');
  process.exit(1);
}

export default prisma;
