import type { Prisma } from '@prisma/client'

/**
 * Devuelve la categoría de ingreso usada por ventas y abonos, creándola si no existe.
 *
 * La BD puede no tener las categorías del seed (happens en producción): sin esto,
 * `categoryId` quedaría vacío y violaría la FK `transactions_categoryId_fkey`, rompiendo
 * toda venta y todo abono.
 */
export async function resolveSalesIncomeCategory(tx: Prisma.TransactionClient): Promise<string> {
  const existing = await tx.category.findFirst({
    where: { type: 'INCOME', name: { contains: 'Venta', mode: 'insensitive' }, deletedAt: null },
    orderBy: { createdAt: 'asc' },
  })
  if (existing) return existing.id

  const created = await tx.category.create({
    data: { name: 'Ventas Tienda', type: 'INCOME', color: 'green', icon: 'store' },
  })
  return created.id
}
