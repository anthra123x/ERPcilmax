/**
 * finance-reports.service.ts
 * Reportes financieros: resumen mensual personal y reporte del negocio (ventas + gastos).
 */
import { prisma } from '@/lib/prisma'
import type { PaymentMethod } from '@prisma/client'
import { getDailySummary, type DailySummary } from './finance-daily.service'
import { getPeriodSummary, type PeriodSummary } from './finance-budget.service'
import { getSavingGoals } from './finance-categories.service'

// ─── Resumen mensual personal ────────────────────────────────────────────────

export type FinanceSummary = {
  totalIncome: number
  totalExpenses: number
  balance: number
  dailySummary: DailySummary | null
  periodSummary: PeriodSummary | null
  incomeByCategory: { category: string; amount: number; color: string | null }[]
  expenseByCategory: { category: string; amount: number; color: string | null }[]
  monthlyData: { month: string; income: number; expenses: number }[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  recentTransactions: any[]
  savingGoals: Awaited<ReturnType<typeof getSavingGoals>>
}

export async function getFinanceSummary(dateStr?: string): Promise<FinanceSummary> {
  const now = dateStr ? new Date(dateStr + 'T12:00:00') : new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
  const startOfYear = new Date(now.getFullYear(), 0, 1)
  const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59)

  const [dailySummary, periodSummary, monthlyAgg, recentTransactions, savingGoals] = await Promise.all([
    getDailySummary(dateStr),
    getPeriodSummary(dateStr).catch(() => null),
    prisma.transaction.groupBy({
      by: ['categoryId', 'type'],
      where: { date: { gte: startOfMonth, lte: endOfMonth } },
      _sum: { amount: true },
    }),
    prisma.transaction.findMany({
      take: 5,
      include: { category: true },
      orderBy: { date: 'desc' },
    }),
    getSavingGoals(),
  ])

  const txIncome = monthlyAgg.filter((g) => g.type === 'INCOME').reduce((sum, g) => sum + (g._sum.amount || 0), 0)
  const totalExpenses = monthlyAgg.filter((g) => g.type === 'EXPENSE').reduce((sum, g) => sum + (g._sum.amount || 0), 0)
  const totalIncome = txIncome

  const categoryIds = monthlyAgg.map((g) => g.categoryId)
  const categories =
    categoryIds.length > 0 ? await prisma.category.findMany({ where: { id: { in: categoryIds } } }) : []
  const categoryMap = new Map(categories.map((c) => [c.id, c]))

  const incomeByCategory = monthlyAgg
    .filter((g) => g.type === 'INCOME')
    .map((g) => ({
      category: categoryMap.get(g.categoryId)?.name || 'Sin categoría',
      amount: g._sum.amount || 0,
      color: categoryMap.get(g.categoryId)?.color || null,
    }))

  const expenseByCategory = monthlyAgg
    .filter((g) => g.type === 'EXPENSE')
    .map((g) => ({
      category: categoryMap.get(g.categoryId)?.name || 'Sin categoría',
      amount: g._sum.amount || 0,
      color: categoryMap.get(g.categoryId)?.color || null,
    }))

  const monthlyTransactions = await prisma.transaction.findMany({
    where: { date: { gte: startOfYear, lte: endOfYear } },
    select: { type: true, amount: true, date: true },
    orderBy: { date: 'asc' },
  })

  const monthlyMap = new Map<string, { income: number; expenses: number }>()
  for (let m = 0; m < 12; m++) {
    const key = `${now.getFullYear()}-${String(m + 1).padStart(2, '0')}`
    monthlyMap.set(key, { income: 0, expenses: 0 })
  }
  for (const tx of monthlyTransactions) {
    const key = `${tx.date.getFullYear()}-${String(tx.date.getMonth() + 1).padStart(2, '0')}`
    const entry = monthlyMap.get(key)
    if (entry) {
      if (tx.type === 'INCOME') entry.income += tx.amount
      else entry.expenses += tx.amount
    }
  }
  const monthlyData = Array.from(monthlyMap.entries()).map(([month, data]) => ({ month, ...data }))

  return {
    totalIncome,
    totalExpenses,
    balance: totalIncome - totalExpenses,
    dailySummary,
    periodSummary,
    incomeByCategory,
    expenseByCategory,
    monthlyData,
    recentTransactions,
    savingGoals,
  }
}

// ─── Reporte financiero del negocio ─────────────────────────────────────────

export type FinancePeriodKind = 'day' | 'week' | 'month'

export function getFinancePeriodRange(kind: FinancePeriodKind, date?: Date): { startDate: Date; endDate: Date } {
  const ref = date ? new Date(date) : new Date()
  ref.setHours(0, 0, 0, 0)

  if (kind === 'day') {
    const end = new Date(ref)
    end.setHours(23, 59, 59, 999)
    return { startDate: ref, endDate: end }
  }

  if (kind === 'week') {
    const day = ref.getDay()
    const diffToMonday = day === 0 ? -6 : 1 - day
    const monday = new Date(ref)
    monday.setDate(monday.getDate() + diffToMonday)
    monday.setHours(0, 0, 0, 0)
    const sunday = new Date(monday)
    sunday.setDate(sunday.getDate() + 6)
    sunday.setHours(23, 59, 59, 999)
    return { startDate: monday, endDate: sunday }
  }

  const start = new Date(ref.getFullYear(), ref.getMonth(), 1)
  start.setHours(0, 0, 0, 0)
  const end = new Date(ref.getFullYear(), ref.getMonth() + 1, 0, 23, 59, 59, 999)
  return { startDate: start, endDate: end }
}

export type BusinessFinanceReport = {
  kind: FinancePeriodKind
  startDate: Date
  endDate: Date
  sales: {
    count: number
    total: number
    cogs: number
    grossProfit: number
    grossMargin: number
  }
  expenses: {
    total: number
    count: number
    byCategory: { id: string; category: string; amount: number; color: string | null }[]
  }
  summary: {
    netProfit: number
    balance: number
    cashIn: number
    cashOut: number
  }
  byDay: { date: string; sales: number; cogs: number; grossProfit: number; expenses: number; netProfit: number }[]
  paymentMethods: { method: PaymentMethod; total: number; count: number }[]
  credit: {
    sold: number
    collected: number
    pending: number
    overdue: number
    overdueCount: number
    count: number
  }
}

export async function getBusinessFinanceReport(
  kind: FinancePeriodKind,
  dateStr?: string,
): Promise<BusinessFinanceReport> {
  const ref = dateStr ? new Date(dateStr + 'T12:00:00') : new Date()
  const { startDate, endDate } = getFinancePeriodRange(kind, ref)

  const [sales, saleItems, expenses, paymentsInPeriod] = await Promise.all([
    prisma.sale.findMany({
      where: { status: 'COMPLETED', saleDate: { gte: startDate, lte: endDate } },
      select: { id: true, total: true, paymentMethod: true, saleDate: true, dueDate: true },
    }),
    prisma.saleItem.findMany({
      where: { sale: { status: 'COMPLETED', saleDate: { gte: startDate, lte: endDate } } },
      select: { quantity: true, total: true, saleId: true, product: { select: { costPrice: true } } },
    }),
    prisma.expense.findMany({
      where: { expenseDate: { gte: startDate, lte: endDate } },
      select: {
        id: true,
        amount: true,
        expenseDate: true,
        category: { select: { id: true, name: true, color: true } },
      },
    }),
    prisma.payment.findMany({
      where: { paymentDate: { gte: startDate, lte: endDate } },
      select: { id: true, amount: true, saleId: true, paymentDate: true },
    }),
  ])

  const salesTotal = sales.reduce((s, x) => s + x.total, 0)
  const cogs = saleItems.reduce((s, x) => s + x.quantity * x.product.costPrice, 0)
  const grossProfit = salesTotal - cogs
  const grossMargin = salesTotal > 0 ? (grossProfit / salesTotal) * 100 : 0
  const expensesTotal = expenses.reduce((s, x) => s + x.amount, 0)

  // Gastos por categoría
  const byCategory = new Map<string, { id: string; category: string; amount: number; color: string | null }>()
  for (const ex of expenses) {
    const key = ex.category.id
    const existing = byCategory.get(key)
    if (existing) existing.amount += ex.amount
    else byCategory.set(key, { id: key, category: ex.category.name, amount: ex.amount, color: ex.category.color })
  }
  const expenseByCategory = Array.from(byCategory.values()).sort((a, b) => b.amount - a.amount)

  // Desglose diario
  const dayMap = new Map<string, { sales: number; cogs: number; expenses: number }>()
  const daysInRange = Math.round((endDate.getTime() - startDate.getTime()) / 86400000) + 1
  for (let i = 0; i < daysInRange; i++) {
    const d = new Date(startDate)
    d.setDate(d.getDate() + i)
    dayMap.set(d.toISOString().split('T')[0], { sales: 0, cogs: 0, expenses: 0 })
  }

  const saleCogsBySale = new Map<string, number>()
  for (const item of saleItems) {
    const itemCogs = item.quantity * item.product.costPrice
    saleCogsBySale.set(item.saleId, (saleCogsBySale.get(item.saleId) || 0) + itemCogs)
  }
  for (const s of sales) {
    const key = s.saleDate.toISOString().split('T')[0]
    const entry = dayMap.get(key)
    if (entry) {
      entry.sales += s.total
      entry.cogs += saleCogsBySale.get(s.id) ?? 0
    }
  }
  for (const ex of expenses) {
    const key = ex.expenseDate.toISOString().split('T')[0]
    const entry = dayMap.get(key)
    if (entry) entry.expenses += ex.amount
  }

  const byDay = Array.from(dayMap.entries())
    .map(([date, d]) => {
      const grossP = d.sales - d.cogs
      return { date, sales: d.sales, cogs: d.cogs, grossProfit: grossP, expenses: d.expenses, netProfit: grossP - d.expenses }
    })
    .filter((d) => d.sales !== 0 || d.expenses !== 0)

  // Métodos de pago
  const paymentMethodMap = new Map<PaymentMethod, { method: PaymentMethod; total: number; count: number }>()
  for (const s of sales) {
    const existing = paymentMethodMap.get(s.paymentMethod)
    if (existing) { existing.total += s.total; existing.count += 1 }
    else paymentMethodMap.set(s.paymentMethod, { method: s.paymentMethod, total: s.total, count: 1 })
  }
  const paymentMethods = Array.from(paymentMethodMap.values()).sort((a, b) => b.total - a.total)

  // Flujo de caja y cartera de crédito
  const cashSalesTotal = sales.filter((s) => s.paymentMethod !== 'CREDITO').reduce((s, x) => s + x.total, 0)
  const cashIn = cashSalesTotal + paymentsInPeriod.reduce((s, x) => s + x.amount, 0)

  const creditSales = sales.filter((s) => s.paymentMethod === 'CREDITO')
  const creditIds = creditSales.map((s) => s.id)
  const creditPaymentsAll =
    creditIds.length > 0
      ? await prisma.payment.findMany({ where: { saleId: { in: creditIds } }, select: { saleId: true, amount: true } })
      : []

  const paymentBySale = new Map<string, number>()
  for (const p of creditPaymentsAll) {
    paymentBySale.set(p.saleId, (paymentBySale.get(p.saleId) || 0) + p.amount)
  }

  const creditSold = creditSales.reduce((s, x) => s + x.total, 0)
  const creditCollected = creditSales.reduce((s, x) => s + (paymentBySale.get(x.id) || 0), 0)
  const creditPending = creditSales.reduce((s, x) => s + Math.max(0, x.total - (paymentBySale.get(x.id) || 0)), 0)

  const now = new Date()
  let creditOverdue = 0
  let creditOverdueCount = 0
  for (const s of creditSales) {
    const rest = Math.max(0, s.total - (paymentBySale.get(s.id) || 0))
    if (s.dueDate && rest > 0 && s.dueDate.getTime() < now.getTime()) {
      creditOverdue += rest
      creditOverdueCount++
    }
  }

  return {
    kind,
    startDate,
    endDate,
    sales: { count: sales.length, total: salesTotal, cogs, grossProfit, grossMargin },
    expenses: { total: expensesTotal, count: expenses.length, byCategory: expenseByCategory },
    summary: { netProfit: grossProfit - expensesTotal, balance: cashIn - expensesTotal, cashIn, cashOut: expensesTotal },
    byDay,
    paymentMethods,
    credit: { sold: creditSold, collected: creditCollected, pending: creditPending, overdue: creditOverdue, overdueCount: creditOverdueCount, count: creditSales.length },
  }
}
