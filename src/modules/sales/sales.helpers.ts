import type { Prisma } from '@prisma/client'

export type UnitPriceResolution = { ok: true; unitPrice: number } | { ok: false; error: string }

/**
 * Resuelve y valida el precio unitario de un ítem de venta:
 * - `unitPrice` ausente o negativo → se usa `salePrice` del producto.
 * - Regla de negocio #2 (obligatoria): `unitPrice >= costPrice` — nunca se
 *   vende bajo el costo.
 * - Sanity: `unitPrice <= salePrice * 2` — evita errores de tipeo o precios
 *   absurdos (solo aplica cuando el cliente envía un precio custom; el precio
 *   del catálogo ya pasó por las validaciones del producto).
 *
 * Decisión documentada: se aplican AMBAS reglas (costo como regla dura y ×2
 * como límite superior sanity). El límite ×2 es deliberadamente amplio para no
 * bloquear promocionales legítimos, pero atrapa errores groseros.
 */
export function resolveSaleUnitPrice(
  requestedUnitPrice: number | undefined,
  product: { costPrice: number; salePrice: number },
): UnitPriceResolution {
  const unitPrice = requestedUnitPrice !== undefined && requestedUnitPrice >= 0 ? requestedUnitPrice : product.salePrice

  if (unitPrice < product.costPrice) {
    return {
      ok: false,
      error: `No se puede vender bajo el costo: precio ${unitPrice} < costo ${product.costPrice}`,
    }
  }

  if (unitPrice > product.salePrice * 2) {
    return {
      ok: false,
      error: `El precio unitario (${unitPrice}) supera el doble del precio de venta (${product.salePrice})`,
    }
  }

  return { ok: true, unitPrice }
}

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
