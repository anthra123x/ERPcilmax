import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    // Las transacciones de venta encadenan muchas queries contra el pooler de
    // Neon; el default de 5s se queda corto y provoca rollbacks. 15s da margen.
    transactionOptions: { timeout: 15000 },
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
