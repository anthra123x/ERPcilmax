'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/modules/auth/auth.actions'
import { NotFoundError, ValidationError } from '@/lib/errors'
import { safeServerAction } from '@/lib/safe-actions'
import type { StockMovementType } from '@prisma/client'

export async function addStockMovement(
  productId: string,
  quantity: number,
  type: StockMovementType,
  unitCost?: number,
  reason?: string,
  reference?: string,
) {
  await requireAuth()

  return safeServerAction(async () => {
    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id: productId } })
      if (!product) throw new NotFoundError('Producto')

      const movementData = {
        productId,
        type,
        quantity,
        unitCost: unitCost ?? null,
        reason: reason ?? null,
        reference: reference ?? null,
      }

      // ADJUST: establece un stock absoluto (nunca negativo).
      if (type === 'ADJUST') {
        if (quantity < 0) throw new ValidationError('Stock insuficiente')
        const [movement] = await Promise.all([
          tx.stockMovement.create({ data: movementData }),
          tx.product.update({
            where: { id: productId },
            data: { stock: quantity },
          }),
        ])
        return movement
      }

      // Reducciones: decremento atómico con guarda (evita lost updates y stock
      // negativo). Entradas: incremento + actualización opcional de costo.
      const isReduction = type === 'OUT' || type === 'SALE' || type === 'RESERVATION'
      const [movement, updated] = await Promise.all([
        tx.stockMovement.create({ data: movementData }),
        isReduction
          ? tx.product.updateMany({
              where: { id: productId, deletedAt: null, stock: { gte: quantity } },
              data: { stock: { decrement: quantity } },
            })
          : tx.product.updateMany({
              where: { id: productId, deletedAt: null },
              data: {
                stock: { increment: quantity },
                ...(type === 'PURCHASE' && unitCost ? { costPrice: unitCost } : {}),
              },
            }),
      ])

      if (updated.count === 0) {
        throw new ValidationError(`Stock insuficiente para "${product.name}"`)
      }

      return movement
    })

    revalidatePath('/inventory')
    revalidatePath(`/inventory/${productId}`)
    return { success: 'Movimiento registrado', movement: result }
  }, 'No se pudo registrar el movimiento')
}