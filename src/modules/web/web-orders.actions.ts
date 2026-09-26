'use server'

/**
 * web-orders.actions.ts
 * Gestión de pedidos web: listado, confirmación, conversión a venta POS, cancelación.
 */
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/modules/auth/auth.actions'
import { parseError } from '@/lib/errors'
import { createSale } from '@/modules/sales/sales.actions'
import { cancelExpiredWebOrders as cancelExpiredWebOrdersService } from './web.service'
import { revalidateWebOrderPaths, revalidateSalePaths } from '@/lib/revalidation'
import type { Prisma } from '@prisma/client'

export async function getAdminWebOrders(status: string = 'ALL', page = 1, take = 20, search = '') {
  await requireAuth()

  const allowed = ['PENDING', 'CONFIRMED', 'CONVERTED', 'CANCELLED']
  const statusWhere: Prisma.WebOrderWhereInput = allowed.includes(status)
    ? { status: status as 'PENDING' | 'CONFIRMED' | 'CONVERTED' | 'CANCELLED' }
    : {}
  const searchTerm = search.trim()
  const searchWhere: Prisma.WebOrderWhereInput = searchTerm
    ? {
        OR: [
          { reference: { contains: searchTerm } },
          { customerName: { contains: searchTerm, mode: 'insensitive' } },
          { customerPhone: { contains: searchTerm } },
        ],
      }
    : {}
  const where: Prisma.WebOrderWhereInput = { ...statusWhere, ...searchWhere }

  const [orders, total] = await Promise.all([
    prisma.webOrder.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * take,
      take,
      include: {
        items: { select: { id: true, productName: true, quantity: true, total: true } },
        convertedSale: { select: { id: true, invoiceNumber: true } },
      },
    }),
    prisma.webOrder.count({ where }),
  ])

  return { orders, total, page, totalPages: Math.ceil(total / take) }
}

export async function getAdminWebOrderById(id: string) {
  await requireAuth()

  return await prisma.webOrder.findUnique({
    where: { id },
    include: {
      items: {
        orderBy: { id: 'asc' },
        include: { product: { select: { id: true, name: true, slug: true, imageUrl: true } } },
      },
      convertedSale: {
        select: {
          id: true,
          invoiceNumber: true,
          total: true,
          saleDate: true,
          items: { select: { id: true, productId: true, quantity: true, unitPrice: true, total: true } },
        },
      },
    },
  })
}

/**
 * Convierte un pedido web en venta POS (CASH). Reusa `createSale` para que el
 * flujo sea idéntico al de ventas manuales: valida stock, descuenta inventario,
 * crea factura y transacción contable. El cliente se busca por teléfono o se crea.
 */
export async function convertWebOrderToSale(id: string) {
  await requireAuth()

  const order = await prisma.webOrder.findUnique({ where: { id }, include: { items: true } })
  if (!order) return { error: 'Pedido no encontrado' }
  if (order.status === 'CONVERTED' || order.status === 'CANCELLED') {
    return { error: 'El pedido ya no está pendiente' }
  }

  const items = order.items.map((item) => {
    if (!item.productId) {
      throw new Error(`"${item.productName}" ya no tiene referencia de producto en inventario`)
    }
    return { productId: item.productId, quantity: item.quantity }
  })

  try {
    let clientId: string | null = null
    if (order.customerPhone) {
      const existing = await prisma.client.findFirst({
        where: { phone: order.customerPhone, deletedAt: null },
        select: { id: true },
      })
      if (existing) {
        clientId = existing.id
      } else {
        const created = await prisma.client.create({
          data: { name: order.customerName, phone: order.customerPhone, email: order.customerEmail ?? null },
        })
        clientId = created.id
      }
    }

    // Si el pedido estaba CONFIRMED, el stock ya fue descontado y no debe
    // volver a descontarse al crear la venta (solo se valida disponibilidad).
    const result = await createSale({
      clientId,
      items,
      discount: 0,
      paymentMethod: 'CASH',
      stockReserved: order.status === 'CONFIRMED',
    })

    if (!result.success) return { error: result.error }

    await prisma.webOrder.update({
      where: { id },
      data: { status: 'CONVERTED', convertedSaleId: result.sale.id },
    })

    revalidateWebOrderPaths()
    revalidatePath('/web/orders/' + id)
    revalidateSalePaths()
    return { success: `Pedido convertido a la venta ${result.sale.invoiceNumber}`, saleId: result.sale.id }
  } catch (error) {
    return { error: parseError(error, 'No se pudo convertir el pedido').message }
  }
}

/**
 * CONFIRMA un pedido web: descuenta el stock (reserva real) y registra
 * movimientos RESERVATION por item. Solo procede desde PENDING.
 */
export async function confirmWebOrder(id: string) {
  await requireAuth()

  const order = await prisma.webOrder.findUnique({ where: { id }, include: { items: true } })
  if (!order) return { error: 'Pedido no encontrado' }
  if (order.status !== 'PENDING') return { error: 'El pedido ya no está pendiente' }

  const ref = order.reference ?? order.id

  try {
    await prisma.$transaction(async (tx) => {
      for (const item of order.items) {
        if (!item.productId) {
          throw new Error(`"${item.productName}" ya no tiene referencia de producto en inventario`)
        }

        const reserved = await tx.product.updateMany({
          where: { id: item.productId, deletedAt: null, stock: { gte: item.quantity } },
          data: { stock: { decrement: item.quantity } },
        })
        if (reserved.count === 0) {
          const product = await tx.product.findUnique({
            where: { id: item.productId },
            select: { name: true, stock: true },
          })
          throw new Error(
            product
              ? `Stock insuficiente para "${product.name}": disponible ${product.stock}, solicitado ${item.quantity}`
              : `El producto "${item.productName}" ya no está disponible en inventario`,
          )
        }

        await tx.stockMovement.create({
          data: { productId: item.productId, type: 'RESERVATION', quantity: item.quantity, reference: ref },
        })
      }

      await tx.webOrder.update({ where: { id }, data: { status: 'CONFIRMED', confirmedAt: new Date() } })
    })
  } catch (error) {
    return { error: parseError(error, 'No se pudo confirmar el pedido').message }
  }

  revalidateWebOrderPaths()
  revalidatePath(`/web/orders/${id}`)
  return { success: `Pedido ${ref} confirmado. Stock reservado.` }
}

export async function cancelWebOrder(id: string) {
  await requireAuth()

  const order = await prisma.webOrder.findUnique({ where: { id }, include: { items: true } })
  if (!order) return { error: 'Pedido no encontrado' }
  if (order.status !== 'PENDING' && order.status !== 'CONFIRMED') {
    return { error: 'El pedido ya no puede cancelarse' }
  }

  const ref = order.reference ?? order.id

  try {
    await prisma.$transaction(async (tx) => {
      if (order.status === 'CONFIRMED') {
        for (const item of order.items) {
          if (!item.productId) continue
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          })
          await tx.stockMovement.create({
            data: { productId: item.productId, type: 'RELEASE', quantity: item.quantity, reference: ref },
          })
        }
      }
      await tx.webOrder.update({ where: { id }, data: { status: 'CANCELLED' } })
    })
  } catch (error) {
    return { error: parseError(error, 'No se pudo cancelar el pedido').message }
  }

  revalidateWebOrderPaths()
  revalidatePath(`/web/orders/${id}`)
  return { success: 'Pedido cancelado' }
}

/** Expira pedidos PENDING vencidos — expuesto en panel admin. */
export async function cancelExpiredWebOrders() {
  await requireAuth()

  const res = await cancelExpiredWebOrdersService()

  if (res.count > 0) {
    revalidatePath('/web/orders')
    revalidatePath('/web')
  }
  return res
}
