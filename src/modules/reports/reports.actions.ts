'use server'

import { prisma } from '@/lib/prisma'
import type { SaleStatus } from '@prisma/client'
import { requireAuth } from '@/modules/auth/auth.actions'

export async function getSalesReport(filters?: {
  startDate?: Date
  endDate?: Date
  status?: SaleStatus
  clientId?: string
}) {
  await requireAuth()
  const where = {
    ...(filters?.startDate &&
      filters?.endDate && {
        saleDate: {
          gte: filters.startDate,
          lte: filters.endDate,
        },
      }),
    ...(filters?.status && { status: filters.status }),
    ...(filters?.clientId && { clientId: filters.clientId }),
  }

  const sales = await prisma.sale.findMany({
    where,
    select: {
      id: true,
      invoiceNumber: true,
      subtotal: true,
      discount: true,
      total: true,
      paymentMethod: true,
      status: true,
      saleDate: true,
      client: {
        select: { id: true, name: true, phone: true },
      },
      items: {
        select: { id: true, quantity: true, unitPrice: true, total: true },
      },
    },
    orderBy: { saleDate: 'desc' },
  })

  const totalSales = sales.length
  const totalRevenue = sales.filter((s) => s.status === 'COMPLETED').reduce((sum, s) => sum + s.total, 0)
  const subtotalSum = sales.filter((s) => s.status === 'COMPLETED').reduce((sum, s) => sum + s.subtotal, 0)
  const discountSum = sales.filter((s) => s.status === 'COMPLETED').reduce((sum, s) => sum + s.discount, 0)
  const totalItems = sales.reduce((sum, s) => sum + s.items.reduce((i, it) => i + it.quantity, 0), 0)
  const averageSale = totalSales > 0 ? totalRevenue / totalSales : 0

  const statusStats = sales.reduce(
    (acc, sale) => {
      if (!acc[sale.status]) {
        acc[sale.status] = { count: 0, revenue: 0 }
      }
      acc[sale.status].count += 1
      if (sale.status === 'COMPLETED') acc[sale.status].revenue += sale.total
      return acc
    },
    {} as Record<string, { count: number; revenue: number }>,
  )

  const paymentStats = sales.reduce(
    (acc, sale) => {
      if (!acc[sale.paymentMethod]) {
        acc[sale.paymentMethod] = { count: 0, revenue: 0 }
      }
      acc[sale.paymentMethod].count += 1
      if (sale.status === 'COMPLETED') acc[sale.paymentMethod].revenue += sale.total
      return acc
    },
    {} as Record<string, { count: number; revenue: number }>,
  )

  return {
    sales,
    summary: {
      totalSales,
      totalRevenue,
      subtotalSum,
      discountSum,
      totalItems,
      averageSale,
      statusStats,
      paymentStats,
    },
  }
}

export async function getChannelReport(filters?: { startDate?: Date; endDate?: Date }) {
  await requireAuth()
  const dateFilter =
    filters?.startDate && filters?.endDate
      ? {
          saleDate: {
            gte: filters.startDate,
            lte: filters.endDate,
          },
        }
      : undefined

  const sales = await prisma.sale.findMany({
    where: dateFilter,
    select: {
      id: true,
      invoiceNumber: true,
      total: true,
      status: true,
      saleDate: true,
      paymentMethod: true,
      client: { select: { id: true, name: true } },
      webOrders: { select: { id: true } },
    },
    orderBy: { saleDate: 'desc' },
  })

  const revenue = (rows: typeof sales) =>
    rows.filter((s) => s.status === 'COMPLETED').reduce((sum, s) => sum + s.total, 0)

  const webSales = sales.filter((s) => s.webOrders.length > 0)
  const posSales = sales.filter((s) => s.webOrders.length === 0)
  const webRevenue = revenue(webSales)
  const posRevenue = revenue(posSales)

  return {
    sales: sales.map((s) => ({ ...s, channel: s.webOrders.length > 0 ? 'WEB' : 'POS' })),
    summary: {
      totalSales: sales.length,
      webSales: webSales.length,
      posSales: posSales.length,
      webRevenue,
      posRevenue,
      webPercentage: sales.length > 0 ? Math.round((webSales.length / sales.length) * 100) : 0,
    },
  }
}

export async function getInventoryReport(filters?: { categoryId?: string; lowStockOnly?: boolean }) {
  await requireAuth()

  const products = await prisma.product.findMany({
    where: {
      deletedAt: null,
      ...(filters?.categoryId && { categoryId: filters.categoryId }),
    },
    select: {
      id: true,
      name: true,
      description: true,
      costPrice: true,
      salePrice: true,
      stock: true,
      lowStockThreshold: true,
      category: { select: { id: true, name: true } },
      supplier: { select: { id: true, name: true } },
    },
    orderBy: { name: 'asc' },
  })

  const filtered = filters?.lowStockOnly ? products.filter((p) => p.stock <= p.lowStockThreshold) : products

  const totalProducts = filtered.length
  const inventoryValue = filtered.reduce((sum, p) => sum + p.costPrice * p.stock, 0)
  const saleValue = filtered.reduce((sum, p) => sum + p.salePrice * p.stock, 0)
  const lowStockCount = filtered.filter((p) => p.stock <= p.lowStockThreshold).length
  const totalUnits = filtered.reduce((sum, p) => sum + p.stock, 0)

  return {
    products: filtered,
    summary: {
      totalProducts,
      inventoryValue,
      saleValue,
      lowStockCount,
      totalUnits,
    },
  }
}

export async function getClientsReport(filters?: { startDate?: Date; endDate?: Date; hasSales?: boolean }) {
  await requireAuth()
  const dateFilter =
    filters?.startDate && filters?.endDate
      ? {
          saleDate: {
            gte: filters.startDate,
            lte: filters.endDate,
          },
        }
      : undefined

  const clients = await prisma.client.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      address: true,
      createdAt: true,
      _count: {
        select: { sales: true },
      },
      sales: {
        where: { ...(dateFilter || {}), status: 'COMPLETED' },
        select: {
          id: true,
          total: true,
          saleDate: true,
        },
      },
    },
    orderBy: { name: 'asc' },
  })

  let filteredClients = clients
  if (filters?.hasSales) {
    filteredClients = filteredClients.filter((client) => client.sales.length > 0)
  }

  const clientStats = filteredClients.map((client) => {
    const totalSpent = client.sales.reduce((sum, s) => sum + s.total, 0)
    return {
      ...client,
      totalSpent,
      totalTransactions: client.sales.length,
    }
  })

  clientStats.sort((a, b) => b.totalSpent - a.totalSpent)

  const totalClients = clientStats.length
  const totalSpent = clientStats.reduce((sum, c) => sum + c.totalSpent, 0)
  const averageSpent = totalClients > 0 ? totalSpent / totalClients : 0
  const newClients =
    filters?.startDate && filters?.endDate
      ? clientStats.filter((c) => c.createdAt >= filters.startDate! && c.createdAt <= filters.endDate!).length
      : 0

  return {
    clients: clientStats,
    summary: {
      totalClients,
      totalSpent,
      averageSpent,
      newClients,
    },
  }
}

interface ReportFilters {
  startDate?: Date
  endDate?: Date
  status?: string
  categoryId?: string
}

export async function generateReportData(reportType: string, filters: ReportFilters) {
  await requireAuth()
  switch (reportType) {
    case 'sales':
      return await getSalesReport({
        startDate: filters.startDate,
        endDate: filters.endDate,
        status: filters.status as SaleStatus | undefined,
      })
    case 'inventory':
      return await getInventoryReport({
        categoryId: filters.categoryId,
      })
    case 'clients':
      return await getClientsReport({
        startDate: filters.startDate,
        endDate: filters.endDate,
      })
    case 'channel':
      return await getChannelReport({
        startDate: filters.startDate,
        endDate: filters.endDate,
      })
    default:
      throw new Error('Tipo de reporte no válido')
  }
}
