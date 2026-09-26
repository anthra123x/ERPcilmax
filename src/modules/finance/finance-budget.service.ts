/**
 * finance-budget.service.ts
 * Gestión de periodos de presupuesto semanal: creación, cierre y resumen.
 */
import { prisma } from '@/lib/prisma'

// ─── Helpers de rango ───────────────────────────────────────────────────────

export function getWeekPeriod(dateStr?: string) {
  const date = dateStr ? new Date(dateStr + 'T12:00:00') : new Date()
  const day = date.getDay()
  const diffToMonday = day === 0 ? -6 : 1 - day
  const monday = new Date(date)
  monday.setHours(0, 0, 0, 0)
  monday.setDate(monday.getDate() + diffToMonday)
  const sunday = new Date(monday)
  sunday.setDate(sunday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)
  return { startDate: monday, endDate: sunday }
}

function formatAmount(amount: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(amount)
}

// ─── Periodo activo ──────────────────────────────────────────────────────────

export async function getOrCreateActivePeriod(dateStr?: string) {
  const { startDate, endDate } = getWeekPeriod(dateStr)

  const activePeriod = await prisma.budgetPeriod.findFirst({
    where: { status: 'ACTIVE' },
    select: { id: true, startDate: true },
  })

  if (activePeriod) {
    const activeStart = activePeriod.startDate.toISOString().split('T')[0]
    const expectedStart = startDate.toISOString().split('T')[0]
    if (activeStart === expectedStart) {
      const existing = await prisma.budgetPeriod.findUnique({
        where: { id: activePeriod.id },
        include: { transactions: { include: { category: true }, orderBy: { date: 'desc' } } },
      })
      if (existing) return existing
    }
  }

  await prisma.budgetPeriod.updateMany({
    where: { status: 'ACTIVE' },
    data: { status: 'CLOSED' },
  })

  return await prisma.budgetPeriod.create({
    data: { startDate, endDate },
    include: { transactions: { include: { category: true }, orderBy: { date: 'desc' } } },
  })
}

export async function getPeriodById(periodId: string) {
  return await prisma.budgetPeriod.findUnique({
    where: { id: periodId },
    include: { transactions: { include: { category: true }, orderBy: { date: 'desc' } } },
  })
}

export async function getClosedPeriods(limit = 10) {
  return await prisma.budgetPeriod.findMany({
    where: { status: 'CLOSED' },
    orderBy: { endDate: 'desc' },
    take: limit,
    include: { transactions: { take: 3, include: { category: true }, orderBy: { date: 'desc' } } },
  })
}

async function getActivePeriodById(periodId: string) {
  return await prisma.budgetPeriod.findUniqueOrThrow({
    where: { id: periodId },
    include: { transactions: { include: { category: true }, orderBy: { date: 'desc' } } },
  })
}

export async function getPeriodTotals(periodId: string) {
  const [incomeAgg, expenseAgg, agg] = await Promise.all([
    prisma.transaction.aggregate({ where: { periodId, type: 'INCOME' }, _sum: { amount: true } }),
    prisma.transaction.aggregate({ where: { periodId, type: 'EXPENSE' }, _sum: { amount: true } }),
    prisma.transaction.aggregate({ where: { periodId }, _sum: { amount: true } }),
  ])
  return {
    totalIncome: incomeAgg._sum.amount || 0,
    totalExpenses: expenseAgg._sum.amount || 0,
    total: agg._sum.amount || 0,
  }
}

// ─── Resumen de periodo ──────────────────────────────────────────────────────

function aggregateByCategory(
  transactions: Array<{ amount: number; category: { name: string; color: string | null } }>,
): { category: string; amount: number; color: string | null }[] {
  const map = new Map<string, { amount: number; color: string | null }>()
  for (const tx of transactions) {
    const name = tx.category?.name || 'Sin categoría'
    const existing = map.get(name)
    if (existing) existing.amount += tx.amount
    else map.set(name, { amount: tx.amount, color: tx.category?.color || null })
  }
  return Array.from(map.entries())
    .map(([category, data]) => ({ category, ...data }))
    .sort((a, b) => b.amount - a.amount)
}

export type PeriodSummary = {
  period: NonNullable<Awaited<ReturnType<typeof getOrCreateActivePeriod>>>
  totalIncome: number
  totalExpenses: number
  balance: number
  netAfterSavings: number
  dailyBreakdown: { date: string; income: number; expenses: number; balance: number }[]
  expenseByCategory: { category: string; amount: number; color: string | null }[]
  incomeByCategory: { category: string; amount: number; color: string | null }[]
}

export async function getPeriodSummary(dateStr?: string, periodId?: string): Promise<PeriodSummary> {
  const period = periodId ? await getActivePeriodById(periodId) : (await getOrCreateActivePeriod(dateStr))!
  const transactions = period.transactions

  const totalIncome = transactions.filter((t) => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0)
  const totalExpenses = transactions.filter((t) => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0)
  const balance = totalIncome - totalExpenses

  const dailyMap = new Map<string, { income: number; expenses: number }>()
  for (let d = new Date(period.startDate); d <= period.endDate; d.setDate(d.getDate() + 1)) {
    const key = d.toISOString().split('T')[0]
    dailyMap.set(key, { income: 0, expenses: 0 })
  }
  for (const tx of transactions) {
    const key = tx.date.toISOString().split('T')[0]
    const entry = dailyMap.get(key)
    if (entry) {
      if (tx.type === 'INCOME') entry.income += tx.amount
      else entry.expenses += tx.amount
    }
  }
  const dailyBreakdown = Array.from(dailyMap.entries()).map(([date, data]) => ({
    date,
    ...data,
    balance: data.income - data.expenses,
  }))

  return {
    period,
    totalIncome,
    totalExpenses,
    balance,
    netAfterSavings: balance - period.savingsAllocated,
    dailyBreakdown,
    expenseByCategory: aggregateByCategory(transactions.filter((t) => t.type === 'EXPENSE')),
    incomeByCategory: aggregateByCategory(transactions.filter((t) => t.type === 'INCOME')),
  }
}

// ─── Cierre de periodo ───────────────────────────────────────────────────────

export async function closeCurrentPeriod(savingsTarget?: number) {
  const period = await getOrCreateActivePeriod()
  const { totalIncome, totalExpenses } = await getPeriodTotals(period.id)
  const balance = totalIncome - totalExpenses

  const savingsAmount =
    savingsTarget !== undefined ? Math.min(savingsTarget, Math.max(balance, 0)) : balance > 0 ? balance : 0

  let goalReached = false
  let goalName = ''
  let activeGoalId: string | undefined

  if (savingsAmount > 0) {
    const savingCategory = await prisma.category.findFirst({
      where: { name: 'Ahorro', type: 'SAVING_GOAL', deletedAt: null },
    })
    if (savingCategory) {
      await prisma.transaction.create({
        data: {
          type: 'INCOME',
          amount: savingsAmount,
          description: `Ahorro semanal - ${period.startDate.toLocaleDateString('es-CO', { day: 'numeric', month: 'long' })}`,
          date: period.endDate,
          categoryId: savingCategory.id,
          periodId: period.id,
          notes: 'Ahorro generado al cerrar la semana',
        },
      })

      const activeGoal = await prisma.savingGoal.findFirst({ orderBy: { createdAt: 'desc' } })
      if (activeGoal) {
        activeGoalId = activeGoal.id
        const newAmount = activeGoal.currentAmount + savingsAmount
        await prisma.savingGoal.update({
          where: { id: activeGoal.id },
          data: { currentAmount: newAmount },
        })
        if (newAmount >= activeGoal.targetAmount && activeGoal.currentAmount < activeGoal.targetAmount) {
          goalReached = true
          goalName = activeGoal.name
        }
      }
    }
  }

  const nextDay = new Date(period.endDate.getTime() + 86400000)
  const { startDate, endDate } = getWeekPeriod(nextDay.toISOString().split('T')[0])

  await prisma.budgetPeriod.update({
    where: { id: period.id },
    data: { status: 'CLOSED', savingsAllocated: savingsAmount },
  })

  const newPeriod = await prisma.budgetPeriod.create({
    data: { startDate, endDate },
    include: { transactions: { include: { category: true }, orderBy: { date: 'desc' } } },
  })

  const users = await prisma.user.findMany({ select: { id: true } })
  if (users.length > 0) {
    const weekLabel = period.startDate.toLocaleDateString('es-CO', { day: 'numeric', month: 'long' })
    const message =
      savingsAmount > 0
        ? `Balance: ${formatAmount(balance)} · Ahorrado: ${formatAmount(savingsAmount)}`
        : `Balance: ${formatAmount(balance)} · No se asignó ahorro`

    await prisma.notification.createMany({
      data: users.map((u) => ({
        userId: u.id,
        type: 'SYSTEM' as const,
        title: `Semana del ${weekLabel} cerrada`,
        message,
        entityType: 'budget_period',
        entityId: period.id,
      })),
    })

    if (goalReached) {
      await prisma.notification.createMany({
        data: users.map((u) => ({
          userId: u.id,
          type: 'SYSTEM' as const,
          title: `Meta de ahorro "${goalName}" cumplida`,
          message: `Has alcanzado tu meta de ahorro. Sigue así.`,
          entityType: 'saving_goal',
          entityId: activeGoalId,
        })),
      })
    }
  }

  return { closedPeriod: period, newPeriod, savingsAmount }
}
