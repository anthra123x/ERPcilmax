'use server'

import { prisma } from '@/lib/prisma'
import { RegisterPaymentSchema } from '@/lib/validations'
import { requireAuth } from '@/modules/auth/auth.actions'
import { parseError } from '@/lib/errors'
import { parseDateInput, getCreditStatus } from '@/lib/labels'
import { resolveSalesIncomeCategory } from './sales.helpers'
import { revalidateSalePaths } from '@/lib/revalidation'

export async function registerPayment(input: {
  saleId: string
  amount: number
  paymentMethod: 'CASH' | 'CARD' | 'TRANSFER'
  paymentDate?: string | null
  notes?: string | null
}) {
  const user = await requireAuth()

  const validatedFields = RegisterPaymentSchema.safeParse({
    saleId: input.saleId,
    amount: input.amount,
    paymentMethod: input.paymentMethod,
    paymentDate: input.paymentDate || null,
    notes: input.notes || null,
  })

  if (!validatedFields.success) {
    return {
      error: validatedFields.error.issues.map((e) => e.message).join(', '),
    }
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const { saleId, amount, paymentMethod } = validatedFields.data

      const sale = await tx.sale.findUnique({
        where: { id: saleId },
        select: { id: true, invoiceNumber: true, total: true, paymentMethod: true, status: true },
      })

      if (!sale) throw new Error('Venta no encontrada')
      if (sale.status !== 'COMPLETED') throw new Error('La venta no admite abonos')
      if (sale.paymentMethod !== 'CREDITO') throw new Error('La venta no admite abonos')

      const paid = await tx.payment.aggregate({
        where: { saleId },
        _sum: { amount: true },
      })
      const saldo = sale.total - (paid._sum.amount || 0)

      if (amount > saldo + 0.005) {
        throw new Error(`El abono supera el saldo pendiente (${saldo.toFixed(2)})`)
      }

      const paymentDate = validatedFields.data.paymentDate
        ? parseDateInput(validatedFields.data.paymentDate)
        : new Date()

      const payment = await tx.payment.create({
        data: {
          saleId,
          amount,
          paymentMethod,
          paymentDate: paymentDate ?? new Date(),
          notes: validatedFields.data.notes || null,
          userId: user.id,
        },
      })

      const incomeCategory = await resolveSalesIncomeCategory(tx)

      await tx.transaction.create({
        data: {
          type: 'INCOME',
          amount,
          description: `Abono Venta ${sale.invoiceNumber}`,
          categoryId: incomeCategory,
          saleId: sale.id,
          paymentId: payment.id,
          date: paymentDate ?? new Date(),
        },
      })

      return payment
    })

    revalidateSalePaths()
    return { success: 'Abono registrado exitosamente', payment: result }
  } catch (error) {
    return { error: parseError(error).message }
  }
}

export async function deletePayment(paymentId: string) {
  await requireAuth()

  try {
    await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({
        where: { id: paymentId },
        select: { id: true, saleId: true },
      })
      if (!payment) throw new Error('Abono no encontrado')

      await tx.transaction.deleteMany({
        where: { paymentId },
      })
      await tx.payment.delete({
        where: { id: paymentId },
      })
    })

    revalidateSalePaths()
    return { success: 'Abono eliminado exitosamente' }
  } catch (error) {
    return { error: parseError(error).message }
  }
}

const creditWhere = {
  paymentMethod: 'CREDITO' as const,
  status: 'COMPLETED' as const,
}

export async function getCreditSales(
  search?: string,
  estado?: 'PAID' | 'OVERDUE' | 'PENDING' | 'ALL',
  page = 1,
  take = 20,
) {
  await requireAuth()

  const baseWhere = {
    ...creditWhere,
    ...(search && {
      OR: [
        { invoiceNumber: { contains: search, mode: 'insensitive' as const } },
        { client: { name: { contains: search, mode: 'insensitive' as const } } },
        { client: { phone: { contains: search, mode: 'insensitive' as const } } },
      ],
    }),
  }

  // Cuando hay filtro de estado crediticio necesitamos computar el status de
  // TODAS las ventas a crédito que cumplen el where base, filtrar, y luego
  // paginar sobre el resultado filtrado (no al revés).
  if (estado && estado !== 'ALL') {
    // 1. Traer solo los campos necesarios para computar el status.
    const allCredit = await prisma.sale.findMany({
      where: baseWhere,
      orderBy: { saleDate: 'desc' },
      select: {
        id: true,
        total: true,
        dueDate: true,
        paymentMethod: true,
        status: true,
        payments: { select: { amount: true } },
      },
    })

    // 2. Filtrar por estado crediticio computado.
    const filtered = allCredit.filter((s) => getCreditStatus(s) === estado)
    const filteredIds = filtered.slice((page - 1) * take, page * take).map((s) => s.id)

    // 3. Traer los datos completos solo de la página actual.
    const sales = filteredIds.length > 0
      ? await prisma.sale.findMany({
          where: { id: { in: filteredIds } },
          orderBy: { saleDate: 'desc' },
          include: {
            client: { select: { id: true, name: true, phone: true } },
            payments: { select: { amount: true } },
          },
        })
      : []

    const rows = sales.map((s) => ({ ...s, creditStatus: getCreditStatus(s) }))

    return {
      credits: rows,
      total: filtered.length,
      page,
      totalPages: Math.ceil(filtered.length / take) || 1,
      totalFiltered: filtered.length,
    }
  }

  // Sin filtro de estado: paginación estándar.
  const [sales, total] = await Promise.all([
    prisma.sale.findMany({
      where: baseWhere,
      orderBy: { saleDate: 'desc' },
      skip: (page - 1) * take,
      take,
      include: {
        client: { select: { id: true, name: true, phone: true } },
        payments: { select: { amount: true } },
      },
    }),
    prisma.sale.count({ where: baseWhere }),
  ])

  const rows = sales.map((s) => ({
    ...s,
    creditStatus: getCreditStatus(s),
  }))

  return {
    credits: rows,
    total,
    page,
    totalPages: Math.ceil(total / take) || 1,
    totalFiltered: total,
  }
}

export async function getCreditSummary() {
  await requireAuth()

  const sales = await prisma.sale.findMany({
    where: creditWhere,
    include: { payments: { select: { amount: true } } },
  })

  const sold = sales.reduce((sum, s) => sum + s.total, 0)
  const collected = sales.reduce((sum, s) => sum + s.payments.reduce((p, x) => p + x.amount, 0), 0)
  const pending = sales.reduce(
    (sum, s) => sum + (s.total - s.payments.reduce((p, x) => p + x.amount, 0)),
    0,
  )

  let overdueAmount = 0
  let overdueCount = 0
  for (const s of sales) {
    const status = getCreditStatus(s)
    if (status === 'OVERDUE') {
      overdueCount++
      overdueAmount += s.total - s.payments.reduce((p, x) => p + x.amount, 0)
    }
  }

  return {
    sold,
    collected,
    pending,
    overdueCount,
    overdueAmount,
    count: sales.length,
  }
}