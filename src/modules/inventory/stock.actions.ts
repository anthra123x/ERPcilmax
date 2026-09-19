'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/modules/auth/auth.actions'
import { parseError } from '@/lib/errors'
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

  try {
    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id: productId } })
      if (!product) throw new Error('Producto no encontrado')

      const stockChange =
        type === 'OUT' || type === 'SALE' || type === 'RESERVATION'
          ? -quantity
          : type === 'PURCHASE' || type === 'IN' || type === 'RELEASE'
            ? quantity
            : quantity // ADJUST sets absolute

      const newStock = type === 'ADJUST' ? quantity : product.stock + stockChange
      if (newStock < 0) throw new Error('Stock insuficiente')

      const [movement] = await Promise.all([
        tx.stockMovement.create({
          data: {
            productId,
            type,
            quantity,
            unitCost: unitCost ?? null,
            reason: reason ?? null,
            reference: reference ?? null,
          },
        }),
        tx.product.update({
          where: { id: productId },
          data: {
            stock: newStock,
            ...(type === 'PURCHASE' && unitCost ? { costPrice: unitCost } : {}),
          },
        }),
      ])

      return movement
    })

    revalidatePath('/inventory')
    revalidatePath(`/inventory/${productId}`)
    return { success: 'Movimiento registrado', movement: result }
  } catch (error) {
    return { error: parseError(error).message }
  }
}

export async function purchaseEntry(productId: string, quantity: number, unitCost: number, reason?: string) {
  return addStockMovement(productId, quantity, 'PURCHASE', unitCost, reason ?? 'Entrada de compra')
}

export async function adjustStock(productId: string, newStock: number, reason?: string) {
  return addStockMovement(productId, newStock, 'ADJUST', undefined, reason ?? 'Ajuste de inventario')
}

export async function getStockMovements(productId: string, page = 1, take = 20) {
  await requireAuth()

  const [movements, total] = await Promise.all([
    prisma.stockMovement.findMany({
      where: { productId },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * take,
      take,
      include: { product: { select: { id: true, name: true } } },
    }),
    prisma.stockMovement.count({ where: { productId } }),
  ])

  return {
    movements,
    total,
    page,
    totalPages: Math.ceil(total / take),
  }
}
