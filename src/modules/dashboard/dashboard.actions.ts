'use server'

import { prisma } from '@/lib/prisma'
import { getClientStats } from '@/modules/clients/clients.actions'
import { requireAuth } from '@/modules/auth/auth.actions'

export async function getDashboardStats() {
  await requireAuth()
  const [
    salesToday,
    incomeToday,
    pendingCredit,
    lowStockProducts,
    clientStats,
    recentSales,
    salesByMonth,
    topProducts,
    salesByPayment,
    totalProducts,
  ] = await Promise.all([
    getSalesToday(),
    getIncomeToday(),
    getPendingCreditTotal(),
    getLowStockProducts(),
    getClientStats(),
    getRecentSales(),
    getSalesByMonth(12),
    getTopProducts(30),
    getSalesByPayment(),
    prisma.product.count({ where: { deletedAt: null } }),
  ])

  return {
    salesToday,
    incomeToday,
    pendingCredit,
    lowStockProducts,
    clientStats,
    recentSales,
    salesByMonth,
    topProducts,
    salesByPayment,
    totalProducts,
  }
}

async function getSalesToday() {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const end = new Date()
  end.setHours(23, 59, 59, 999)

  const [count, sales] = await Promise.all([
    prisma.sale.count({
      where: { status: 'COMPLETED', saleDate: { gte: start, lte: end } },
    }),
    prisma.sale.findMany({
      where: { status: 'COMPLETED', saleDate: { gte: start, lte: end } },
      select: { total: true },
    }),
  ])

  const total = sales.reduce((sum, s) => sum + s.total, 0)

  return { count, total }
}

async function getIncomeToday() {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const end = new Date()
  end.setHours(23, 59, 59, 999)

  const [sales, payments] = await Promise.all([
    prisma.sale.findMany({
      where: {
        status: 'COMPLETED',
        saleDate: { gte: start, lte: end },
        paymentMethod: { not: 'CREDITO' },
      },
      select: { total: true },
    }),
    prisma.payment.aggregate({
      where: { paymentDate: { gte: start, lte: end } },
      _sum: { amount: true },
    }),
  ])

  return sales.reduce((sum, s) => sum + s.total, 0) + (payments._sum.amount || 0)
}

async function getPendingCreditTotal() {
  const sales = await prisma.sale.findMany({
    where: { paymentMethod: 'CREDITO', status: 'COMPLETED' },
    select: { total: true, payments: { select: { amount: true } } },
  })

  return sales.reduce(
    (sum, s) => sum + (s.total - s.payments.reduce((p, x) => p + x.amount, 0)),
    0,
  )
}

async function getLowStockProducts() {
  // Prisma no soporta comparar columna vs columna en `where`, así que usamos
  // raw query para filtrar `stock <= lowStockThreshold` directamente en SQL.
  // Esto evita traer TODOS los productos a Node para filtrar en JS.
  const products = await prisma.$queryRaw<
    Array<{ id: string; name: string; stock: number; lowStockThreshold: number }>
  >`
    SELECT id, name, stock, "lowStockThreshold"
    FROM products
    WHERE "deletedAt" IS NULL
      AND stock <= "lowStockThreshold"
    ORDER BY stock ASC
    LIMIT 10
  `

  return products
}

async function getRecentSales() {
  return await prisma.sale.findMany({
    take: 5,
    orderBy: { saleDate: 'desc' },
    where: { status: 'COMPLETED' },
    select: {
      id: true,
      invoiceNumber: true,
      total: true,
      paymentMethod: true,
      saleDate: true,
      client: {
        select: { id: true, name: true },
      },
    },
  })
}

export async function getSalesByMonth(months: number = 12) {
  const startDate = new Date()
  startDate.setMonth(startDate.getMonth() - months)

  const sales = await prisma.sale.findMany({
    where: {
      status: 'COMPLETED',
      saleDate: { gte: startDate },
    },
    select: {
      saleDate: true,
      total: true,
    },
    orderBy: { saleDate: 'asc' },
  })

  const byMonth = sales.reduce(
    (acc, sale) => {
      const date = new Date(sale.saleDate)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

      if (!acc[monthKey]) {
        acc[monthKey] = { month: monthKey, total: 0, count: 0 }
      }

      acc[monthKey].total += sale.total
      acc[monthKey].count += 1

      return acc
    },
    {} as Record<string, { month: string; total: number; count: number }>,
  )

  return Object.values(byMonth)
}

export async function getTopProducts(days: number = 30) {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  const topItems = await prisma.saleItem.groupBy({
    by: ['productId'],
    where: {
      sale: {
        status: 'COMPLETED',
        saleDate: { gte: startDate },
      },
    },
    _sum: { quantity: true, total: true },
    _count: { id: true },
    orderBy: { _sum: { quantity: 'desc' } },
    take: 10,
  })

  const productIds = topItems.map((item) => item.productId)
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, deletedAt: null },
    select: { id: true, name: true },
  })

  return topItems.map((item) => ({
    ...item,
    product: products.find((p) => p.id === item.productId),
  }))
}

export async function getSalesByPayment() {
  const sales = await prisma.sale.groupBy({
    by: ['paymentMethod'],
    where: { status: 'COMPLETED' },
    _count: { id: true },
    _sum: { total: true },
    orderBy: { _sum: { total: 'desc' } },
  })

  return sales
}
