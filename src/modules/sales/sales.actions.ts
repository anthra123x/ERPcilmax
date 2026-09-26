'use server'

import { prisma } from '@/lib/prisma'
import { CreateSaleSchema } from '@/lib/validations'
import { requireAuth } from '@/modules/auth/auth.actions'
import { NotFoundError, ValidationError } from '@/lib/errors'
import { safeServerAction, type ServerActionResult } from '@/lib/safe-actions'
import { parseDateInput } from '@/lib/labels'
import { resolveSaleUnitPrice, resolveSalesIncomeCategory } from './sales.helpers'
import { revalidateSalePaths } from '@/lib/revalidation'
import type { Prisma } from '@prisma/client'

export type SaleWithItems = Prisma.SaleGetPayload<{ include: { items: true } }>

export async function createSale(
  data: {
  clientId?: string | null
  items: Array<{ productId: string; quantity: number; unitPrice?: number }>
  discount?: number
  paymentMethod: 'CASH' | 'CARD' | 'TRANSFER' | 'CREDITO'
  initialPayment?: number
  initialPaymentMethod?: 'CASH' | 'CARD' | 'TRANSFER'
  dueDate?: string | null
  installments?: Array<{ amount: number; dueDate: string }>
  /**
   * Cuando un pedido web confirmado ya reservó stock (descontó Product.stock y
   * registró movimientos RESERVATION), la conversión a venta NO debe
   * descontar de nuevo ni crear movimientos SALE.
   */
  stockReserved?: boolean
}): Promise<ServerActionResult<{ success: string; sale: SaleWithItems }>> {
  const user = await requireAuth()

  const validatedFields = CreateSaleSchema.safeParse({
    clientId: data.clientId || null,
    items: data.items,
    discount: data.discount || 0,
    paymentMethod: data.paymentMethod,
    initialPayment: data.initialPayment || 0,
    initialPaymentMethod: data.initialPaymentMethod || 'CASH',
    dueDate: data.dueDate || null,
    installments: data.installments || [],
  })

  if (!validatedFields.success) {
    return {
      error: validatedFields.error.issues.map((e) => e.message).join(', '),
    }
  }

  return safeServerAction(async () => {
    const result = await prisma.$transaction(async (tx) => {
      const {
        items,
        clientId,
        discount,
        paymentMethod,
        initialPayment,
        initialPaymentMethod,
        dueDate,
        installments,
      } = validatedFields.data

      // Validate stock for all items
      const productIds = items.map((i) => i.productId)
      const products = await tx.product.findMany({
        where: { id: { in: productIds }, deletedAt: null },
      })

      const productMap = new Map(products.map((p) => [p.id, p]))

      for (const item of items) {
        const product = productMap.get(item.productId)
        if (!product) throw new NotFoundError('Producto')
        if (product.stock < item.quantity) {
          throw new ValidationError(
            `Stock insuficiente para "${product.name}": disponible ${product.stock}, solicitado ${item.quantity}`,
          )
        }
      }

      // Get next invoice number. El row lock serializa la numeración entre
      // transacciones concurrentes (evita facturas duplicadas por lost update).
      let settings = await tx.systemSettings.findFirst()
      if (!settings) {
        settings = await tx.systemSettings.create({ data: {} })
      }

      await tx.$queryRaw<Array<{ id: string }>>`SELECT id FROM system_settings WHERE id = ${settings.id} FOR UPDATE`

      // Re-lee el contador fresco tras adquirir el lock.
      settings = await tx.systemSettings.findUniqueOrThrow({ where: { id: settings.id } })

      const invoiceNumber = `${settings.invoicePrefix}${settings.nextInvoiceNumber}`

      // Calculate totals
      let subtotal = 0
      const saleItemsData = items.map((item) => {
        const product = productMap.get(item.productId)!
        const priceResolution = resolveSaleUnitPrice(item.unitPrice, product)
        if (!priceResolution.ok) throw new ValidationError(priceResolution.error)
        const unitPrice = priceResolution.unitPrice
        const total = unitPrice * item.quantity
        subtotal += total
        return {
          productId: item.productId,
          quantity: item.quantity,
          unitPrice,
          total,
        }
      })

      // Un descuento mayor al subtotal dejaría un total negativo.
      if ((discount || 0) > subtotal) {
        throw new ValidationError('El descuento no puede superar el subtotal de la venta')
      }

      const total = subtotal - (discount || 0)

      // Validaciones para ventas a crédito
      if (paymentMethod === 'CREDITO') {
        if (initialPayment > total) {
          throw new ValidationError('El abono inicial no puede superar el total de la venta')
        }
        const rest = total - initialPayment
        const installmentsSum = installments.reduce((s, i) => s + i.amount, 0)
        if (installmentsSum > rest + 0.005) {
          throw new ValidationError(
            `Las cuotas (${installmentsSum.toFixed(2)}) superan el saldo restante de la venta (${rest.toFixed(2)})`,
          )
        }
      }

      // Create sale
      const sale = await tx.sale.create({
        data: {
          invoiceNumber,
          clientId: clientId || null,
          subtotal,
          discount: discount || 0,
          total,
          paymentMethod,
          dueDate: paymentMethod === 'CREDITO' ? parseDateInput(dueDate || '') : null,
          userId: user.id,
          items: {
            create: saleItemsData,
          },
        },
        include: { items: true },
      })

      // Create invoice snapshot
      await tx.invoice.create({
        data: {
          saleId: sale.id,
          invoiceNumber,
          companyName: settings.companyName,
          companyNit: settings.companyNit,
          companyAddress: settings.companyAddress,
          companyCity: settings.companyCity,
          companyPhone: settings.companyPhone,
          companyEmail: settings.companyEmail,
          currency: settings.currency,
          invoiceFooter: settings.invoiceFooter,
        },
      })

      // Update stock and create stock movements
      // Si el stock ya fue reservado (pedido web CONFIRMED), solo se valida arriba.
      if (!data.stockReserved) {
        for (const item of items) {
          const product = productMap.get(item.productId)!

          // Decremento atómico con guarda de stock: si otra transacción
          // consumió stock entre la validación y este update, count === 0 y
          // la venta falla (rollback) en vez de quedar con stock negativo.
          const reserved = await tx.product.updateMany({
            where: { id: item.productId, deletedAt: null, stock: { gte: item.quantity } },
            data: { stock: { decrement: item.quantity } },
          })
          if (reserved.count === 0) {
            const current = await tx.product.findUnique({
              where: { id: item.productId },
              select: { stock: true },
            })
            throw new ValidationError(
              `Stock insuficiente para "${product.name}": disponible ${current?.stock ?? product.stock}, solicitado ${item.quantity}`,
            )
          }

          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              type: 'SALE',
              quantity: item.quantity,
              reference: invoiceNumber,
            },
          })
        }
      }

      // Categoría de ingreso para transacciones de venta
      const incomeCategory = await resolveSalesIncomeCategory(tx)

      // Ingreso contable: contado → total de la venta; crédito → solo abono inicial
      if (paymentMethod === 'CREDITO') {
        if (initialPayment > 0) {
          const payment = await tx.payment.create({
            data: {
              saleId: sale.id,
              amount: initialPayment,
              paymentMethod: initialPaymentMethod,
              notes: 'Abono inicial',
              userId: user.id,
            },
          })
          await tx.transaction.create({
            data: {
              type: 'INCOME',
              amount: initialPayment,
              description: `Abono inicial Venta ${invoiceNumber}`,
              categoryId: incomeCategory,
              saleId: sale.id,
              paymentId: payment.id,
            },
          })
        }

        for (const inst of installments) {
          const due = parseDateInput(inst.dueDate)
          if (!due) throw new ValidationError(`Fecha de vencimiento inválida para la cuota de ${inst.amount}`)
          await tx.creditInstallment.create({
            data: {
              saleId: sale.id,
              amount: inst.amount,
              dueDate: due,
            },
          })
        }
      } else {
        await tx.transaction.create({
          data: {
            type: 'INCOME',
            amount: total,
            description: `Venta ${invoiceNumber}`,
            categoryId: incomeCategory,
            saleId: sale.id,
          },
        })
      }

      // Increment invoice number (usando el valor fresco leído tras el lock)
      await tx.systemSettings.update({
        where: { id: settings.id },
        data: { nextInvoiceNumber: settings.nextInvoiceNumber + 1 },
      })

      return sale
    })

    revalidateSalePaths()
    return { success: 'Venta registrada exitosamente', sale: result }
  }, 'No se pudo registrar la venta')
}

export async function deleteSale(saleId: string) {
  await requireAuth()

  return safeServerAction(async () => {
    await prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findUnique({
        where: { id: saleId },
        include: { items: true },
      })

      if (!sale) throw new NotFoundError('Venta')

      // Restore stock
      for (const item of sale.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        })

        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            type: 'OUT',
            quantity: item.quantity,
            reference: `Eliminación ${sale.invoiceNumber}`,
          },
        })
      }

      // Delete linked income transaction so it no longer counts in finance/dashboard
      // (covers the full-invoice transaction for cash sales AND any abono transactions via paymentId)
      await tx.transaction.deleteMany({
        where: { OR: [{ saleId: saleId }, { payment: { saleId: saleId } }] },
      })
      await tx.payment.deleteMany({
        where: { saleId: saleId },
      })

      // Delete the sale (SaleItems and Invoice cascade via onDelete: Cascade)
      await tx.sale.delete({
        where: { id: saleId },
      })
    })

    revalidateSalePaths()
    return { success: 'Venta eliminada exitosamente' }
  }, 'No se pudo eliminar la venta')
}

export async function getSales(search?: string, page = 1, take = 20) {
  await requireAuth()

  const where = {
    ...(search && {
      OR: [
        { invoiceNumber: { contains: search, mode: 'insensitive' as const } },
        { client: { name: { contains: search, mode: 'insensitive' as const } } },
        { client: { phone: { contains: search, mode: 'insensitive' as const } } },
      ],
    }),
  }

  const [sales, total] = await Promise.all([
    prisma.sale.findMany({
      where,
      orderBy: { saleDate: 'desc' },
      skip: (page - 1) * take,
      take,
      include: {
        client: { select: { id: true, name: true, phone: true } },
        items: {
          include: { product: { select: { id: true, name: true } } },
        },
        payments: { select: { amount: true } },
      },
    }),
    prisma.sale.count({ where }),
  ])

  return {
    sales,
    total,
    page,
    totalPages: Math.ceil(total / take),
  }
}

export async function getSaleById(id: string) {
  await requireAuth()
  return await prisma.sale.findUnique({
    where: { id },
    include: {
      client: true,
      items: {
        include: { product: true },
      },
      invoice: true,
      payments: {
        orderBy: { paymentDate: 'desc' },
        include: { user: { select: { id: true, name: true, email: true } } },
      },
      installments: {
        orderBy: { dueDate: 'asc' },
      },
      user: { select: { id: true, name: true, email: true } },
    },
  })
}

export async function getNextInvoiceNumber() {
  await requireAuth()
  const settings = await prisma.systemSettings.findFirst()
  if (!settings) return 'CIL-1'
  return `${settings.invoicePrefix}${settings.nextInvoiceNumber}`
}