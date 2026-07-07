import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prismaNew: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prismaNew ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prismaNew = prisma;
