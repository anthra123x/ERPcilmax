/**
 * finance-daily.service.ts
 * Resumen diario de transacciones.
 */
import { prisma } from '@/lib/prisma'

export type DailySummary = {
  date: string
  totalIncome: number
  totalExpenses: number
  balance: number
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  transactions: any[]
  expenseByCategory: { category: string; amount: number; color: string | null }[]
}

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

export async function getDailySummary(dateStr?: string): Promise<DailySummary> {
  const date = dateStr ? new Date(dateStr) : new Date()
  const start = new Date(date)
  start.setHours(0, 0, 0, 0)
  const end = new Date(date)
  end.setHours(23, 59, 59, 999)

  const transactions = await prisma.transaction.findMany({
    where: { date: { gte: start, lte: end } },
    include: { category: true },
    orderBy: { date: 'desc' },
  })

  const totalIncome = transactions.filter((t) => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0)
  const totalExpenses = transactions.filter((t) => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0)
  const expenseByCategory = aggregateByCategory(transactions.filter((t) => t.type === 'EXPENSE'))

  return {
    date: date.toISOString().split('T')[0],
    totalIncome,
    totalExpenses,
    balance: totalIncome - totalExpenses,
    transactions: transactions as unknown as DailySummary['transactions'],
    expenseByCategory,
  }
}
