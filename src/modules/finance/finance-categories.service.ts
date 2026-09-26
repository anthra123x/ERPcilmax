/**
 * finance-categories.service.ts
 * CRUD de categorías de finanzas y metas de ahorro.
 */
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { getOrCreateActivePeriod } from './finance-budget.service'

// ─── Categorías ──────────────────────────────────────────────────────────────

export async function getCategories(type?: string) {
  const where: Prisma.CategoryWhereInput = { deletedAt: null }
  if (type) where.type = type as 'INCOME' | 'EXPENSE' | 'SAVING_GOAL'
  return await prisma.category.findMany({ where, orderBy: { name: 'asc' } })
}

export async function getCategoryById(id: string) {
  return await prisma.category.findUnique({ where: { id } })
}

export async function createCategory(data: {
  name: string
  type: 'INCOME' | 'EXPENSE' | 'SAVING_GOAL'
  color?: string | null
  icon?: string | null
  budget?: number | null
}) {
  return await prisma.category.create({ data })
}

export async function updateCategory(id: string, data: Record<string, unknown>) {
  return await prisma.category.update({ where: { id }, data })
}

export async function deleteCategory(id: string) {
  return await prisma.category.update({ where: { id }, data: { deletedAt: new Date() } })
}

// ─── Transacciones ───────────────────────────────────────────────────────────

export type TransactionFilters = {
  type?: 'INCOME' | 'EXPENSE'
  categoryId?: string
  startDate?: string
  endDate?: string
  isRecurring?: boolean
  periodId?: string
  page?: number
  pageSize?: number
}

export async function getTransactions(filters: TransactionFilters = {}) {
  const where: Prisma.TransactionWhereInput = {}
  if (filters.type) where.type = filters.type
  if (filters.categoryId) where.categoryId = filters.categoryId
  if (filters.periodId) where.periodId = filters.periodId
  if (filters.isRecurring !== undefined) where.isRecurring = filters.isRecurring
  if (filters.startDate || filters.endDate) {
    where.date = {}
    if (filters.startDate) where.date.gte = new Date(filters.startDate)
    if (filters.endDate) where.date.lte = new Date(filters.endDate)
  }

  const page = filters.page || 1
  const pageSize = filters.pageSize || 20
  const skip = (page - 1) * pageSize

  const [items, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      include: { category: true, period: true },
      orderBy: { date: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.transaction.count({ where }),
  ])

  return { items, total, page, totalPages: Math.ceil(total / pageSize) }
}

export async function getTransactionById(id: string) {
  return await prisma.transaction.findUnique({ where: { id }, include: { category: true, period: true } })
}

export async function createTransaction(data: {
  type: 'INCOME' | 'EXPENSE'
  amount: number
  description: string
  date?: string | Date
  categoryId: string
  periodId?: string
  isRecurring?: boolean
  recurringDay?: number | null
  notes?: string | null
}) {
  const txDate = data.date ? new Date(data.date) : new Date()
  const dateStr = txDate.toISOString().split('T')[0]
  const periodId = data.periodId || (await getOrCreateActivePeriod(dateStr)).id
  return await prisma.transaction.create({
    data: {
      type: data.type,
      amount: data.amount,
      description: data.description,
      date: txDate,
      categoryId: data.categoryId,
      periodId,
      isRecurring: data.isRecurring ?? false,
      recurringDay: data.recurringDay ?? null,
      notes: data.notes ?? null,
    },
    include: { category: true, period: true },
  })
}

export async function updateTransaction(id: string, data: Record<string, unknown>) {
  return await prisma.transaction.update({
    where: { id },
    data,
    include: { category: true, period: true },
  })
}

export async function deleteTransaction(id: string) {
  return await prisma.transaction.delete({ where: { id } })
}

// ─── Metas de ahorro ────────────────────────────────────────────────────────

export async function getSavingGoals() {
  return await prisma.savingGoal.findMany({
    include: { category: true },
    orderBy: { createdAt: 'desc' },
  })
}

export async function createSavingGoal(data: {
  name: string
  targetAmount: number
  currentAmount?: number
  deadline?: string | null
  categoryId?: string | null
}) {
  return await prisma.savingGoal.create({
    data: {
      name: data.name,
      targetAmount: data.targetAmount,
      currentAmount: data.currentAmount ?? 0,
      deadline: data.deadline ? new Date(data.deadline) : null,
      categoryId: data.categoryId ?? null,
    },
    include: { category: true },
  })
}

export async function updateSavingGoal(id: string, data: Record<string, unknown>) {
  return await prisma.savingGoal.update({ where: { id }, data, include: { category: true } })
}

export async function deleteSavingGoal(id: string) {
  return await prisma.savingGoal.delete({ where: { id } })
}

// ─── Gastos recurrentes automáticos ─────────────────────────────────────────

export async function autoGenerateRecurringExpenses() {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
  const period = await getOrCreateActivePeriod()

  const recurringTemplates = await prisma.transaction.findMany({
    where: { isRecurring: true, recurringDay: { not: null } },
    include: { category: true },
  })

  for (const template of recurringTemplates) {
    const existingThisMonth = await prisma.transaction.findFirst({
      where: {
        type: template.type,
        categoryId: template.categoryId,
        description: template.description,
        date: { gte: startOfMonth, lte: endOfMonth },
        notes: 'Gasto recurrente - generado automáticamente',
      },
    })
    if (existingThisMonth) continue

    const scheduledDay = Math.min(template.recurringDay || 1, endOfMonth.getDate())
    const scheduledDate = new Date(now.getFullYear(), now.getMonth(), scheduledDay)
    if (scheduledDate > endOfMonth) continue

    await prisma.transaction.create({
      data: {
        type: 'EXPENSE',
        amount: template.amount,
        description: template.description,
        date: scheduledDate,
        categoryId: template.categoryId,
        periodId: period.id,
        notes: 'Gasto recurrente - generado automáticamente',
      },
    })
  }
}
