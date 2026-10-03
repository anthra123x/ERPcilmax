import { prisma } from '@/lib/prisma'
import { formatCurrency } from '@/lib/format'
import { getPaymentMethodLabel, getWebOrderStatusLabel } from '@/lib/labels'
import {
  collectBusinessData,
  businessSnapshotToText,
  dateDaysAgo,
  dateStartOfDay,
  dateStartOfMonth,
} from './ai.context'
import { AiProviderError } from './ai.types'
import type { AssistantToolName, AssistantToolResult } from './ai.types'

export interface AssistantToolDefinition {
  name: AssistantToolName
  description: string
  args: Record<string, string>
}

export const ASSISTANT_TOOLS: AssistantToolDefinition[] = [
  { name: 'get_business_snapshot', description: 'Vista general actualizada del negocio.', args: {} },
  {
    name: 'get_sales_summary',
    description: 'Estadísticas de ventas para un período.',
    args: { period: 'today | 7d | 30d | this_month | this_year' },
  },
  { name: 'get_inventory_status', description: 'Inventario: totales, stock bajo, agotados y valor.', args: {} },
  {
    name: 'get_web_orders_status',
    description: 'Pedidos de la tienda online por estado y pendientes más antiguos.',
    args: {},
  },
  { name: 'get_recent_sales', description: 'Últimas ventas registradas.', args: { limit: 'número (por defecto 5)' } },
  { name: 'get_client_summary', description: 'Clientes: totales, nuevos del mes y mayores compradores.', args: {} },
  { name: 'get_pending_credit', description: 'Créditos pendientes de cobro.', args: {} },
  { name: 'get_contact_messages', description: 'Mensajes de contacto recientes.', args: { unreadOnly: 'boolean' } },
  { name: 'get_finance_summary', description: 'Ingresos vs gastos del mes actual.', args: {} },
  {
    name: 'generate_executive_report',
    description:
      'Genera un informe ejecutivo integral y consolidado del negocio (ventas, margen estimado, tienda web, valorización de inventario y cartera de crédito).',
    args: {},
  },
  {
    name: 'generate_sales_report',
    description:
      'Genera un reporte detallado de ventas por período con métodos de pago, ticket promedio y rentabilidad.',
    args: { period: 'today | 7d | 30d | this_month | this_year' },
  },
  {
    name: 'generate_inventory_report',
    description:
      'Genera un reporte de inventario completo con valorización al costo y venta, margen proyectado, productos agotados y lista de compras para reposición.',
    args: {},
  },
  {
    name: 'generate_client_report',
    description: 'Genera un reporte de clientes con los mayores compradores y listado de saldos pendientes de crédito.',
    args: {},
  },
  {
    name: 'generate_channel_report',
    description: 'Genera un reporte comparativo de canales de venta (Mostrador físico vs Tienda Online Web).',
    args: {},
  },
  {
    name: 'search_products',
    description:
      'Busca productos en el catálogo por nombre, código de barras o categoría con existencias, costos y precios.',
    args: { query: 'texto a buscar' },
  },
  {
    name: 'adjust_product_stock',
    description:
      'Ajusta el inventario de un producto en el sistema (ingreso, egreso o ajuste físico) registrando el movimiento de stock.',
    args: {
      productId: 'id o nombre del producto',
      quantityChange: 'número entero positivo o negativo',
      reason: 'motivo',
    },
  },
  {
    name: 'search_clients',
    description: 'Busca clientes por nombre o teléfono, mostrando información de contacto, facturas y saldo pendiente.',
    args: { query: 'nombre o teléfono' },
  },
  {
    name: 'manage_web_order',
    description:
      'Consulta o actualiza el estado de un pedido de la tienda online (confirmar o cancelar con reserva/liberación de stock).',
    args: { referenceOrId: 'código ORD-XXXX o ID', newStatus: 'CONFIRMED | CANCELLED (opcional)' },
  },
]

const SALES_PERIODS: Record<string, { since: Date; label: string }> = {
  today: { since: dateStartOfDay(), label: 'hoy' },
  '7d': { since: dateDaysAgo(7), label: 'los últimos 7 días' },
  '30d': { since: dateDaysAgo(30), label: 'los últimos 30 días' },
  this_month: { since: dateStartOfMonth(), label: 'este mes' },
  this_year: { since: new Date(new Date().getFullYear(), 0, 1), label: 'este año' },
}

function summarize(toolName: string, message: string): string {
  return `[${toolName}] ${message}`
}

async function snapshotTool(): Promise<AssistantToolResult> {
  const snapshot = await collectBusinessData()
  const data = { ...snapshot } as unknown as Record<string, unknown>
  return {
    name: 'get_business_snapshot',
    data,
    summary: summarize(
      'get_business_snapshot',
      `Ventas hoy ${snapshot.salesToday.count} (${formatCurrency(snapshot.salesToday.total)}) · inventario ${snapshot.inventory.products} productos · pedidos pendientes ${snapshot.webOrders.PENDING}`,
    ),
    executedAt: new Date().toISOString(),
  }
}

async function salesSummaryTool(args: Record<string, unknown>): Promise<AssistantToolResult> {
  const period = typeof args.period === 'string' ? args.period : 'today'
  const config = SALES_PERIODS[period] ?? SALES_PERIODS.today

  const sales = await prisma.sale.findMany({
    where: { status: 'COMPLETED', saleDate: { gte: config.since } },
    select: { id: true, total: true, paymentMethod: true },
  })

  const total = sales.reduce((sum, s) => sum + s.total, 0)
  const count = sales.length
  const avg = count > 0 ? total / count : 0

  const byPayment: Record<string, { count: number; total: number }> = {}
  for (const sale of sales) {
    const key = sale.paymentMethod
    byPayment[key] = byPayment[key] ?? { count: 0, total: 0 }
    byPayment[key].count += 1
    byPayment[key].total += sale.total
  }
  const paymentBreakdown = Object.entries(byPayment).map(([method, value]) => ({
    method,
    label: getPaymentMethodLabel(method),
    count: value.count,
    total: value.total,
  }))

  const data = {
    period,
    periodLabel: config.label,
    count,
    total,
    averageTicket: avg,
    byPayment: paymentBreakdown,
    asOf: config.since.toISOString(),
  }

  return {
    name: 'get_sales_summary',
    data,
    summary: summarize('get_sales_summary', `${count} ventas ${config.label} por ${formatCurrency(total)}`),
    executedAt: new Date().toISOString(),
  }
}

async function inventoryStatusTool(): Promise<AssistantToolResult> {
  const products = await prisma.product.findMany({
    where: { deletedAt: null },
    select: {
      name: true,
      stock: true,
      lowStockThreshold: true,
      costPrice: true,
      salePrice: true,
      category: { select: { name: true } },
    },
  })

  const lowStock = products.filter((p) => p.stock <= p.lowStockThreshold).sort((a, b) => a.stock - b.stock)

  const data = {
    products: products.length,
    units: products.reduce((sum, p) => sum + p.stock, 0),
    lowStockCount: lowStock.length,
    outOfStockCount: lowStock.filter((p) => p.stock <= 0).length,
    stockValueCost: products.reduce((sum, p) => sum + p.costPrice * p.stock, 0),
    stockValueRetail: products.reduce((sum, p) => sum + p.salePrice * p.stock, 0),
    lowStock: lowStock.slice(0, 15).map((p) => ({
      name: p.name,
      stock: p.stock,
      threshold: p.lowStockThreshold,
      category: p.category?.name ?? null,
    })),
  }

  return {
    name: 'get_inventory_status',
    data,
    summary: summarize(
      'get_inventory_status',
      `${lowStock.length} productos con stock bajo (${data.outOfStockCount} agotados) de ${products.length} activos`,
    ),
    executedAt: new Date().toISOString(),
  }
}

async function webOrdersStatusTool(): Promise<AssistantToolResult> {
  const [byStatus, oldestPending, recent] = await Promise.all([
    prisma.webOrder.groupBy({
      by: ['status'],
      _count: { id: true },
    }),
    prisma.webOrder.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
      take: 5,
      select: {
        id: true,
        reference: true,
        customerName: true,
        customerPhone: true,
        total: true,
        currency: true,
        createdAt: true,
      },
    }),
    prisma.webOrder.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        reference: true,
        customerName: true,
        status: true,
        total: true,
        currency: true,
        createdAt: true,
      },
    }),
  ])

  const counts: Record<string, number> = {}
  for (const row of byStatus) {
    counts[row.status] = row._count.id
  }

  const settings = await prisma.systemSettings.findFirst({
    select: { webPendingExpiryHours: true, currency: true },
  })
  const expiryHours = settings?.webPendingExpiryHours ?? 24
  const currency = settings?.currency ?? 'COP'

  const formatAmount = (v: number, c: string) => formatCurrency(v, c || 'COP')

  const data = {
    counts,
    total: Object.values(counts).reduce((sum, n) => sum + n, 0),
    expiryHours,
    oldestPending: oldestPending.map((o) => ({
      reference: o.reference,
      customer: o.customerName,
      phone: o.customerPhone,
      total: formatAmount(o.total, o.currency || currency),
      created: o.createdAt.toISOString(),
    })),
    recent: recent.map((o) => ({
      reference: o.reference,
      customer: o.customerName,
      status: o.status,
      statusLabel: getWebOrderStatusLabel(o.status),
      total: formatAmount(o.total, o.currency || currency),
      created: o.createdAt.toISOString(),
    })),
  }

  return {
    name: 'get_web_orders_status',
    data,
    summary: summarize(
      'get_web_orders_status',
      `Pedidos: ${counts.PENDING ?? 0} pendientes, ${counts.CONFIRMED ?? 0} confirmados, ${counts.CONVERTED ?? 0} convertidos, ${counts.CANCELLED ?? 0} cancelados`,
    ),
    executedAt: new Date().toISOString(),
  }
}

async function recentSalesTool(args: Record<string, unknown>): Promise<AssistantToolResult> {
  const parsedLimit = Number(args.limit)
  const limit = Number.isFinite(parsedLimit) && parsedLimit > 0 && parsedLimit <= 20 ? Math.floor(parsedLimit) : 5

  const sales = await prisma.sale.findMany({
    where: { status: 'COMPLETED' },
    orderBy: { saleDate: 'desc' },
    take: limit,
    select: {
      id: true,
      invoiceNumber: true,
      total: true,
      paymentMethod: true,
      saleDate: true,
      client: { select: { name: true } },
    },
  })

  const data = {
    limit,
    sales: sales.map((s) => ({
      invoice: s.invoiceNumber,
      client: s.client?.name ?? 'Cliente mostrador',
      total: s.total,
      totalFormatted: formatCurrency(s.total),
      payment: getPaymentMethodLabel(s.paymentMethod),
      date: s.saleDate.toISOString(),
    })),
  }

  return {
    name: 'get_recent_sales',
    data,
    summary: summarize('get_recent_sales', `${sales.length} últimas ventas`),
    executedAt: new Date().toISOString(),
  }
}

async function clientSummaryTool(): Promise<AssistantToolResult> {
  const monthStart = dateStartOfMonth()

  const [total, newThisMonth, topRows] = await Promise.all([
    prisma.client.count({ where: { deletedAt: null } }),
    prisma.client.count({ where: { deletedAt: null, createdAt: { gte: monthStart } } }),
    prisma.sale.groupBy({
      by: ['clientId'],
      where: { status: 'COMPLETED', clientId: { not: null } },
      _sum: { total: true },
      orderBy: { _sum: { total: 'desc' } },
      take: 5,
    }),
  ])

  const clientIds = topRows.map((r) => r.clientId).filter((id): id is string => !!id)
  const clients = clientIds.length
    ? await prisma.client.findMany({ where: { id: { in: clientIds } }, select: { id: true, name: true } })
    : []
  const nameById = new Map(clients.map((c) => [c.id, c.name]))

  const topClients = topRows
    .filter((r) => r.clientId && r._sum.total)
    .map((r) => ({
      clientId: r.clientId as string,
      name: nameById.get(r.clientId as string) ?? 'Cliente',
      total: r._sum.total ?? 0,
    }))

  const data = {
    total,
    newThisMonth,
    topClients,
  }

  return {
    name: 'get_client_summary',
    data,
    summary: summarize('get_client_summary', `${total} clientes (${newThisMonth} nuevos este mes)`),
    executedAt: new Date().toISOString(),
  }
}

async function pendingCreditTool(): Promise<AssistantToolResult> {
  const sales = await prisma.sale.findMany({
    where: { paymentMethod: 'CREDITO', status: 'COMPLETED' },
    select: { total: true, payments: { select: { amount: true } } },
  })

  const entries = sales.map((s) => {
    const paid = s.payments.reduce((sum, p) => sum + p.amount, 0)
    return { total: s.total, paid, outstanding: s.total - paid }
  })
  const outstandingTotal = entries.reduce((sum, e) => sum + e.outstanding, 0)

  const data = {
    salesCount: sales.length,
    totalOutstanding: outstandingTotal,
    totalOwed: entries.reduce((sum, e) => sum + e.total, 0),
  }

  return {
    name: 'get_pending_credit',
    data,
    summary: summarize(
      'get_pending_credit',
      `${formatCurrency(outstandingTotal)} pendientes en ${sales.length} ventas a crédito`,
    ),
    executedAt: new Date().toISOString(),
  }
}

async function contactMessagesTool(args: Record<string, unknown>): Promise<AssistantToolResult> {
  const unreadOnly = args.unreadOnly === true || args.unreadOnly === 'true'

  const messages = await prisma.contactMessage.findMany({
    where: unreadOnly ? { read: false } : {},
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: { name: true, phone: true, email: true, message: true, read: true, createdAt: true },
  })

  const data = {
    unreadOnly,
    total: messages.length,
    messages: messages.map((m) => ({
      name: m.name,
      phone: m.phone,
      email: m.email,
      message: m.message,
      read: m.read,
      createdAt: m.createdAt.toISOString(),
    })),
  }

  return {
    name: 'get_contact_messages',
    data,
    summary: summarize('get_contact_messages', `${messages.length} mensajes${unreadOnly ? ' sin leer' : ''}`),
    executedAt: new Date().toISOString(),
  }
}

async function financeSummaryTool(): Promise<AssistantToolResult> {
  const monthStart = dateStartOfMonth()

  const [sales, expenses] = await Promise.all([
    prisma.sale.findMany({
      where: { status: 'COMPLETED', saleDate: { gte: monthStart } },
      select: { total: true },
    }),
    prisma.expense.aggregate({
      where: { expenseDate: { gte: monthStart } },
      _sum: { amount: true },
    }),
  ])

  const income = sales.reduce((sum, s) => sum + s.total, 0)
  const outgoings = expenses._sum.amount ?? 0

  const data = {
    month: monthStart.toISOString(),
    income,
    expenses: outgoings,
    balance: income - outgoings,
  }

  return {
    name: 'get_finance_summary',
    data,
    summary: summarize(
      'get_finance_summary',
      `Ingresos ${formatCurrency(income)} · gastos ${formatCurrency(outgoings)} · saldo ${formatCurrency(income - outgoings)}`,
    ),
    executedAt: new Date().toISOString(),
  }
}

async function executiveReportTool(): Promise<AssistantToolResult> {
  const now = new Date()
  const startOfDay = dateStartOfDay()
  const startOfMonth = dateStartOfMonth()

  const [
    salesToday,
    todayItems,
    salesMonth,
    monthExpenses,
    inventoryProducts,
    webOrdersPending,
    webOrdersMonth,
    creditSales,
  ] = await Promise.all([
    prisma.sale.aggregate({
      where: { status: 'COMPLETED', saleDate: { gte: startOfDay } },
      _count: { id: true },
      _sum: { total: true },
    }),
    prisma.saleItem.findMany({
      where: { sale: { status: 'COMPLETED', saleDate: { gte: startOfDay } } },
      select: { quantity: true, total: true, product: { select: { costPrice: true } } },
    }),
    prisma.sale.aggregate({
      where: { status: 'COMPLETED', saleDate: { gte: startOfMonth } },
      _count: { id: true },
      _sum: { total: true },
    }),
    prisma.expense.aggregate({
      where: { expenseDate: { gte: startOfMonth } },
      _sum: { amount: true },
    }),
    prisma.product.findMany({
      where: { deletedAt: null },
      select: { stock: true, costPrice: true, salePrice: true, lowStockThreshold: true },
    }),
    prisma.webOrder.count({ where: { status: 'PENDING' } }),
    prisma.webOrder.count({ where: { createdAt: { gte: startOfMonth } } }),
    prisma.sale.findMany({
      where: { paymentMethod: 'CREDITO', status: 'COMPLETED' },
      select: { total: true, clientId: true, payments: { select: { amount: true } } },
    }),
  ])

  let profitToday = 0
  for (const it of todayItems) {
    profitToday += it.total - (it.product?.costPrice ?? 0) * it.quantity
  }

  const stockValueCost = inventoryProducts.reduce((sum, p) => sum + p.costPrice * p.stock, 0)
  const stockValueRetail = inventoryProducts.reduce((sum, p) => sum + p.salePrice * p.stock, 0)
  const lowStockCount = inventoryProducts.filter((p) => p.stock <= p.lowStockThreshold).length
  const outOfStockCount = inventoryProducts.filter((p) => p.stock <= 0).length

  let pendingCreditTotal = 0
  const debtors = new Set<string>()
  for (const s of creditSales) {
    const paid = s.payments.reduce((sum, p) => sum + p.amount, 0)
    const remaining = s.total - paid
    if (remaining > 0) {
      pendingCreditTotal += remaining
      if (s.clientId) debtors.add(s.clientId)
    }
  }

  const incomeMonth = salesMonth._sum.total ?? 0
  const expensesMonth = monthExpenses._sum.amount ?? 0

  const data = {
    generatedAt: now.toISOString(),
    salesToday: {
      count: salesToday._count.id ?? 0,
      total: salesToday._sum.total ?? 0,
      profitEstimated: Math.max(0, profitToday),
    },
    salesMonth: {
      count: salesMonth._count.id ?? 0,
      total: incomeMonth,
      expenses: expensesMonth,
      netBalance: incomeMonth - expensesMonth,
    },
    webOrders: {
      pending: webOrdersPending,
      ordersThisMonth: webOrdersMonth,
    },
    inventory: {
      totalProducts: inventoryProducts.length,
      totalUnits: inventoryProducts.reduce((sum, p) => sum + p.stock, 0),
      stockValueCost,
      stockValueRetail,
      potentialProfit: Math.max(0, stockValueRetail - stockValueCost),
      lowStockCount,
      outOfStockCount,
    },
    credit: {
      pendingCreditTotal,
      debtorClientsCount: debtors.size,
    },
  }

  return {
    name: 'generate_executive_report',
    data,
    summary: summarize(
      'generate_executive_report',
      `Reporte ejecutivo generado: Ventas hoy ${formatCurrency(data.salesToday.total)} · Mes ${formatCurrency(incomeMonth)} · Inventario valorizado ${formatCurrency(stockValueRetail)}`,
    ),
    executedAt: now.toISOString(),
  }
}

async function salesReportTool(args: Record<string, unknown>): Promise<AssistantToolResult> {
  const period = typeof args.period === 'string' ? args.period : 'this_month'
  const config = SALES_PERIODS[period] ?? SALES_PERIODS.this_month

  const sales = await prisma.sale.findMany({
    where: { status: 'COMPLETED', saleDate: { gte: config.since } },
    select: {
      id: true,
      invoiceNumber: true,
      total: true,
      subtotal: true,
      discount: true,
      paymentMethod: true,
      saleDate: true,
      client: { select: { name: true } },
    },
    orderBy: { saleDate: 'desc' },
  })

  const total = sales.reduce((sum, s) => sum + s.total, 0)
  const count = sales.length
  const avg = count > 0 ? total / count : 0
  const totalDiscounts = sales.reduce((sum, s) => sum + s.discount, 0)

  const byPayment: Record<string, { count: number; total: number }> = {}
  for (const sale of sales) {
    const key = sale.paymentMethod
    byPayment[key] = byPayment[key] ?? { count: 0, total: 0 }
    byPayment[key].count += 1
    byPayment[key].total += sale.total
  }

  const paymentBreakdown = Object.entries(byPayment).map(([method, value]) => ({
    method,
    label: getPaymentMethodLabel(method),
    count: value.count,
    total: value.total,
    percentage: total > 0 ? Math.round((value.total / total) * 100) : 0,
  }))

  const data = {
    period,
    periodLabel: config.label,
    count,
    total,
    averageTicket: avg,
    totalDiscounts,
    byPayment: paymentBreakdown,
    recentSample: sales.slice(0, 10).map((s) => ({
      invoice: s.invoiceNumber,
      client: s.client?.name ?? 'Cliente mostrador',
      total: s.total,
      payment: getPaymentMethodLabel(s.paymentMethod),
      date: s.saleDate.toISOString(),
    })),
  }

  return {
    name: 'generate_sales_report',
    data,
    summary: summarize(
      'generate_sales_report',
      `Reporte de ventas (${config.label}): ${count} ventas por ${formatCurrency(total)} (ticket prom ${formatCurrency(avg)})`,
    ),
    executedAt: new Date().toISOString(),
  }
}

async function inventoryReportTool(): Promise<AssistantToolResult> {
  const products = await prisma.product.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      name: true,
      barcode: true,
      stock: true,
      lowStockThreshold: true,
      costPrice: true,
      salePrice: true,
      category: { select: { name: true } },
    },
    orderBy: { stock: 'asc' },
  })

  const totalProducts = products.length
  const totalUnits = products.reduce((sum, p) => sum + p.stock, 0)
  const stockValueCost = products.reduce((sum, p) => sum + p.costPrice * p.stock, 0)
  const stockValueRetail = products.reduce((sum, p) => sum + p.salePrice * p.stock, 0)
  const potentialProfit = Math.max(0, stockValueRetail - stockValueCost)

  const lowStock = products.filter((p) => p.stock <= p.lowStockThreshold)
  const outOfStock = products.filter((p) => p.stock <= 0)

  const replenishmentSuggested = lowStock.map((p) => ({
    name: p.name,
    currentStock: p.stock,
    threshold: p.lowStockThreshold,
    suggestedOrder: Math.max(p.lowStockThreshold * 2 - p.stock, 5),
    costPrice: p.costPrice,
    category: p.category?.name ?? 'Sin categoría',
  }))

  const data = {
    totalProducts,
    totalUnits,
    stockValueCost,
    stockValueRetail,
    potentialProfit,
    lowStockCount: lowStock.length,
    outOfStockCount: outOfStock.length,
    replenishmentSuggested: replenishmentSuggested.slice(0, 15),
  }

  return {
    name: 'generate_inventory_report',
    data,
    summary: summarize(
      'generate_inventory_report',
      `Reporte de inventario: ${totalProducts} productos, ${totalUnits} unidades. Valor costo ${formatCurrency(stockValueCost)}, venta ${formatCurrency(stockValueRetail)}. ${lowStock.length} con stock bajo.`,
    ),
    executedAt: new Date().toISOString(),
  }
}

async function clientReportTool(): Promise<AssistantToolResult> {
  const [totalClients, monthClients, clientSales, creditSales] = await Promise.all([
    prisma.client.count({ where: { deletedAt: null } }),
    prisma.client.count({ where: { deletedAt: null, createdAt: { gte: dateStartOfMonth() } } }),
    prisma.sale.groupBy({
      by: ['clientId'],
      where: { status: 'COMPLETED', clientId: { not: null } },
      _sum: { total: true },
      _count: { id: true },
      orderBy: { _sum: { total: 'desc' } },
      take: 10,
    }),
    prisma.sale.findMany({
      where: { paymentMethod: 'CREDITO', status: 'COMPLETED', clientId: { not: null } },
      select: {
        total: true,
        clientId: true,
        client: { select: { id: true, name: true, phone: true } },
        payments: { select: { amount: true } },
      },
    }),
  ])

  const topClientIds = clientSales.map((c) => c.clientId as string)
  const clientNames = await prisma.client.findMany({
    where: { id: { in: topClientIds } },
    select: { id: true, name: true, phone: true },
  })
  const clientNameMap = new Map(clientNames.map((c) => [c.id, c]))

  const topClients = clientSales.map((c) => {
    const info = clientNameMap.get(c.clientId as string)
    return {
      name: info?.name ?? 'Cliente desconocido',
      phone: info?.phone ?? 'N/D',
      salesCount: c._count.id,
      totalSpent: c._sum.total ?? 0,
    }
  })

  // Balance adeudado por cliente
  const debtorMap = new Map<string, { name: string; phone: string; balance: number }>()
  for (const s of creditSales) {
    if (!s.client) continue
    const paid = s.payments.reduce((acc, p) => acc + p.amount, 0)
    const remaining = s.total - paid
    if (remaining > 0) {
      const existing = debtorMap.get(s.client.id) ?? {
        name: s.client.name,
        phone: s.client.phone ?? 'N/D',
        balance: 0,
      }
      existing.balance += remaining
      debtorMap.set(s.client.id, existing)
    }
  }

  const debtorsList = Array.from(debtorMap.values()).sort((a, b) => b.balance - a.balance)
  const totalDebt = debtorsList.reduce((sum, d) => sum + d.balance, 0)

  const data = {
    totalClients,
    newThisMonth: monthClients,
    topClients,
    debtorsCount: debtorsList.length,
    totalOutstandingDebt: totalDebt,
    topDebtors: debtorsList.slice(0, 10),
  }

  return {
    name: 'generate_client_report',
    data,
    summary: summarize(
      'generate_client_report',
      `Reporte de clientes: ${totalClients} registrados (${monthClients} este mes). Cartera pendiente ${formatCurrency(totalDebt)} en ${debtorsList.length} clientes.`,
    ),
    executedAt: new Date().toISOString(),
  }
}

async function channelReportTool(): Promise<AssistantToolResult> {
  const [posSales, webSales, pendingWeb] = await Promise.all([
    prisma.sale.aggregate({
      where: { status: 'COMPLETED', webOrders: { none: {} } },
      _count: { id: true },
      _sum: { total: true },
    }),
    prisma.sale.aggregate({
      where: { status: 'COMPLETED', webOrders: { some: {} } },
      _count: { id: true },
      _sum: { total: true },
    }),
    prisma.webOrder.count({ where: { status: 'PENDING' } }),
  ])

  const posTotal = posSales._sum.total ?? 0
  const posCount = posSales._count.id ?? 0
  const posAvg = posCount > 0 ? posTotal / posCount : 0

  const webTotal = webSales._sum.total ?? 0
  const webCount = webSales._count.id ?? 0
  const webAvg = webCount > 0 ? webTotal / webCount : 0

  const grandTotal = posTotal + webTotal

  const data = {
    pos: {
      channel: 'Mostrador / Tienda Física (POS)',
      count: posCount,
      total: posTotal,
      averageTicket: posAvg,
      sharePercentage: grandTotal > 0 ? Math.round((posTotal / grandTotal) * 100) : 0,
    },
    web: {
      channel: 'Tienda Online (Web)',
      count: webCount,
      total: webTotal,
      averageTicket: webAvg,
      sharePercentage: grandTotal > 0 ? Math.round((webTotal / grandTotal) * 100) : 0,
      pendingOrdersCount: pendingWeb,
    },
    grandTotal,
    totalTransactions: posCount + webCount,
  }

  return {
    name: 'generate_channel_report',
    data,
    summary: summarize(
      'generate_channel_report',
      `Canales de venta: Mostrador ${formatCurrency(posTotal)} (${data.pos.sharePercentage}%) vs Web ${formatCurrency(webTotal)} (${data.web.sharePercentage}%).`,
    ),
    executedAt: new Date().toISOString(),
  }
}

async function searchProductsTool(args: Record<string, unknown>): Promise<AssistantToolResult> {
  const query = typeof args.query === 'string' ? args.query.trim() : ''
  if (!query) {
    return {
      name: 'search_products',
      data: { query: '', products: [] },
      summary: summarize('search_products', 'Por favor especifica un nombre o código de producto para buscar.'),
      executedAt: new Date().toISOString(),
    }
  }

  const products = await prisma.product.findMany({
    where: {
      deletedAt: null,
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { barcode: { contains: query, mode: 'insensitive' } },
        { category: { name: { contains: query, mode: 'insensitive' } } },
      ],
    },
    select: {
      id: true,
      name: true,
      barcode: true,
      stock: true,
      lowStockThreshold: true,
      costPrice: true,
      salePrice: true,
      webVisible: true,
      category: { select: { name: true } },
    },
    take: 8,
  })

  const data = {
    query,
    count: products.length,
    products: products.map((p) => ({
      id: p.id,
      name: p.name,
      barcode: p.barcode ?? 'S/N',
      stock: p.stock,
      costPrice: p.costPrice,
      salePrice: p.salePrice,
      margin: p.salePrice > 0 ? Math.round(((p.salePrice - p.costPrice) / p.salePrice) * 100) : 0,
      category: p.category?.name ?? 'Sin categoría',
      webVisible: p.webVisible ? 'Visible en tienda web' : 'Solo POS',
      isLowStock: p.stock <= p.lowStockThreshold,
    })),
  }

  return {
    name: 'search_products',
    data,
    summary: summarize('search_products', `Se encontraron ${products.length} productos coincidentes con "${query}".`),
    executedAt: new Date().toISOString(),
  }
}

async function adjustProductStockTool(args: Record<string, unknown>): Promise<AssistantToolResult> {
  const search = typeof args.productId === 'string' ? args.productId.trim() : ''
  const quantityChange =
    typeof args.quantityChange === 'number' ? args.quantityChange : parseInt(String(args.quantityChange || 0), 10)
  const reason = typeof args.reason === 'string' ? args.reason.trim() : 'Ajuste realizado desde Asistente IA'

  if (!search) {
    throw new AiProviderError('bad_request', 'Debes indicar el nombre o ID del producto a ajustar.')
  }
  if (!quantityChange || isNaN(quantityChange)) {
    throw new AiProviderError('bad_request', 'Debes indicar la cantidad a sumar o restar (número diferente de 0).')
  }

  const product = await prisma.product.findFirst({
    where: {
      deletedAt: null,
      OR: [{ id: search }, { name: { contains: search, mode: 'insensitive' } }, { barcode: search }],
    },
    select: { id: true, name: true, stock: true, costPrice: true },
  })

  if (!product) {
    throw new AiProviderError(
      'bad_request',
      `No se encontró ningún producto con el identificador o nombre "${search}".`,
    )
  }

  const previousStock = product.stock
  const newStock = previousStock + quantityChange
  if (newStock < 0) {
    throw new AiProviderError(
      'bad_request',
      `No puedes dejar el stock en negativo. Stock actual: ${previousStock}, intentaste restar: ${Math.abs(quantityChange)}.`,
    )
  }

  const movementType = quantityChange > 0 ? 'IN' : 'OUT'

  await prisma.$transaction(async (tx) => {
    await tx.product.update({
      where: { id: product.id },
      data: { stock: newStock },
    })

    await tx.stockMovement.create({
      data: {
        productId: product.id,
        type: movementType,
        quantity: Math.abs(quantityChange),
        unitCost: product.costPrice,
        reason,
        reference: 'AI-ASSISTANT',
      },
    })
  })

  const data = {
    productId: product.id,
    productName: product.name,
    previousStock,
    quantityChange,
    newStock,
    reason,
  }

  return {
    name: 'adjust_product_stock',
    data,
    summary: summarize(
      'adjust_product_stock',
      `Stock de "${product.name}" actualizado con éxito: de ${previousStock} a ${newStock} uds (${quantityChange > 0 ? `+${quantityChange}` : quantityChange}). Motivo: ${reason}`,
    ),
    executedAt: new Date().toISOString(),
  }
}

async function searchClientsTool(args: Record<string, unknown>): Promise<AssistantToolResult> {
  const query = typeof args.query === 'string' ? args.query.trim() : ''
  if (!query) {
    return {
      name: 'search_clients',
      data: { query: '', clients: [] },
      summary: summarize('search_clients', 'Indica el nombre o teléfono del cliente a consultar.'),
      executedAt: new Date().toISOString(),
    }
  }

  const clients = await prisma.client.findMany({
    where: {
      deletedAt: null,
      OR: [{ name: { contains: query, mode: 'insensitive' } }, { phone: { contains: query, mode: 'insensitive' } }],
    },
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      address: true,
      sales: {
        where: { status: 'COMPLETED' },
        select: {
          id: true,
          invoiceNumber: true,
          total: true,
          paymentMethod: true,
          saleDate: true,
          payments: { select: { amount: true } },
        },
      },
    },
    take: 6,
  })

  const results = clients.map((c) => {
    let pendingDebt = 0
    for (const s of c.sales) {
      if (s.paymentMethod === 'CREDITO') {
        const paid = s.payments.reduce((acc, p) => acc + p.amount, 0)
        pendingDebt += Math.max(0, s.total - paid)
      }
    }
    const totalSpent = c.sales.reduce((sum, s) => sum + s.total, 0)
    return {
      id: c.id,
      name: c.name,
      phone: c.phone ?? 'Sin teléfono',
      email: c.email ?? 'Sin email',
      address: c.address ?? 'Sin dirección',
      totalPurchases: c.sales.length,
      totalSpent,
      pendingDebt,
      lastPurchase: c.sales.length > 0 ? c.sales[0].saleDate.toISOString() : null,
    }
  })

  const data = {
    query,
    count: clients.length,
    clients: results,
  }

  return {
    name: 'search_clients',
    data,
    summary: summarize('search_clients', `Se encontraron ${clients.length} clientes para "${query}".`),
    executedAt: new Date().toISOString(),
  }
}

async function manageWebOrderTool(args: Record<string, unknown>): Promise<AssistantToolResult> {
  const ref = typeof args.referenceOrId === 'string' ? args.referenceOrId.trim() : ''
  const newStatus = typeof args.newStatus === 'string' ? args.newStatus.trim().toUpperCase() : null

  if (!ref) {
    throw new AiProviderError('bad_request', 'Debes especificar la referencia del pedido (ej: ORD-1001) o el ID.')
  }

  const order = await prisma.webOrder.findFirst({
    where: {
      OR: [{ reference: ref }, { id: ref }],
    },
    include: {
      items: {
        include: {
          product: { select: { id: true, name: true, stock: true } },
        },
      },
    },
  })

  if (!order) {
    throw new AiProviderError('bad_request', `No se encontró ningún pedido web con referencia o ID "${ref}".`)
  }

  // Si solo es consulta (sin newStatus)
  if (!newStatus) {
    const data = {
      id: order.id,
      reference: order.reference ?? 'S/N',
      status: order.status,
      statusLabel: getWebOrderStatusLabel(order.status),
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      customerEmail: order.customerEmail ?? 'N/D',
      notes: order.notes ?? 'Sin notas',
      total: order.total,
      createdAt: order.createdAt.toISOString(),
      items: order.items.map((it) => ({
        productName: it.productName,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        total: it.total,
        currentStock: it.product?.stock ?? 'N/D',
      })),
    }

    return {
      name: 'manage_web_order',
      data,
      summary: summarize(
        'manage_web_order',
        `Pedido ${data.reference} (${data.statusLabel}): ${order.customerName} - Total ${formatCurrency(order.total)}`,
      ),
      executedAt: new Date().toISOString(),
    }
  }

  // Si se solicita cambio de estado (CONFIRMED o CANCELLED)
  if (newStatus === 'CONFIRMED') {
    if (order.status !== 'PENDING') {
      throw new AiProviderError(
        'bad_request',
        `El pedido ya está en estado ${order.status}, solo se puede confirmar si está PENDING.`,
      )
    }

    // Transacción: reservar stock y confirmar
    await prisma.$transaction(async (tx) => {
      for (const item of order.items) {
        if (!item.productId) continue
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        })
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            type: 'RESERVATION',
            quantity: item.quantity,
            reference: order.reference ?? order.id,
            reason: `Reserva por confirmación pedido web ${order.reference ?? order.id} vía Asistente IA`,
          },
        })
      }

      await tx.webOrder.update({
        where: { id: order.id },
        data: { status: 'CONFIRMED', confirmedAt: new Date() },
      })
    })

    return {
      name: 'manage_web_order',
      data: { id: order.id, reference: order.reference, previousStatus: 'PENDING', newStatus: 'CONFIRMED' },
      summary: summarize(
        'manage_web_order',
        `Pedido ${order.reference ?? order.id} CONFIRMADO con éxito. El stock de sus productos ha sido reservado.`,
      ),
      executedAt: new Date().toISOString(),
    }
  }

  if (newStatus === 'CANCELLED') {
    if (order.status === 'CANCELLED' || order.status === 'CONVERTED') {
      throw new AiProviderError('bad_request', `El pedido ya se encuentra ${order.status} y no puede cancelarse.`)
    }

    await prisma.$transaction(async (tx) => {
      // Si estaba CONFIRMED, liberar stock
      if (order.status === 'CONFIRMED') {
        for (const item of order.items) {
          if (!item.productId) continue
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          })
          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              type: 'RELEASE',
              quantity: item.quantity,
              reference: order.reference ?? order.id,
              reason: `Liberación de stock por cancelación de pedido web ${order.reference ?? order.id} vía Asistente IA`,
            },
          })
        }
      }

      await tx.webOrder.update({
        where: { id: order.id },
        data: { status: 'CANCELLED' },
      })
    })

    return {
      name: 'manage_web_order',
      data: { id: order.id, reference: order.reference, previousStatus: order.status, newStatus: 'CANCELLED' },
      summary: summarize(
        'manage_web_order',
        `Pedido ${order.reference ?? order.id} CANCELADO. Stock restaurado si estaba reservado.`,
      ),
      executedAt: new Date().toISOString(),
    }
  }

  throw new AiProviderError(
    'bad_request',
    `Estado no permitido: "${newStatus}". Opciones válidas: CONFIRMED o CANCELLED.`,
  )
}

const EXECUTORS: Record<AssistantToolName, (args: Record<string, unknown>) => Promise<AssistantToolResult>> = {
  get_business_snapshot: snapshotTool,
  get_sales_summary: salesSummaryTool,
  get_inventory_status: inventoryStatusTool,
  get_web_orders_status: webOrdersStatusTool,
  get_recent_sales: recentSalesTool,
  get_client_summary: clientSummaryTool,
  get_pending_credit: pendingCreditTool,
  get_contact_messages: contactMessagesTool,
  get_finance_summary: financeSummaryTool,
  generate_executive_report: executiveReportTool,
  generate_sales_report: salesReportTool,
  generate_inventory_report: inventoryReportTool,
  generate_client_report: clientReportTool,
  generate_channel_report: channelReportTool,
  search_products: searchProductsTool,
  adjust_product_stock: adjustProductStockTool,
  search_clients: searchClientsTool,
  manage_web_order: manageWebOrderTool,
}

export function isAssistantToolName(name: unknown): name is AssistantToolName {
  return typeof name === 'string' && name in EXECUTORS
}

export async function runAssistantTool(
  name: AssistantToolName,
  args: Record<string, unknown> = {},
): Promise<AssistantToolResult> {
  const executor = EXECUTORS[name]
  if (!executor) {
    throw new AiProviderError('bad_request', `Herramienta de asistente desconocida: ${String(name)}`)
  }
  return await executor(args)
}

interface FormattedToolData {
  count?: number
  total?: number
  averageTicket?: number
  periodLabel?: string
  byPayment?: Array<{ label: string; count: number; total: number }>
  products?: number
  units?: number
  lowStockCount?: number
  outOfStockCount?: number
  stockValueRetail?: number
  lowStock?: Array<{ name: string; stock: number; threshold: number; category: string | null }>
  counts?: Record<string, number>
  expiryHours?: number
  oldestPending?: Array<{ reference: string | null; customer: string; total: string; created: string }>
  sales?: Array<{
    invoice: string
    client: string
    totalFormatted: string
    payment: string
    date: string
  }>
  limit?: number
  topClients?: Array<{ name: string; total: number }>
  newThisMonth?: number
  salesCount?: number
  totalOutstanding?: number
  messages?: Array<{
    name: string
    email: string | null
    message: string
    read: boolean
    createdAt: string
  }>
  unreadOnly?: boolean
  income?: number
  expenses?: number
  balance?: number
}

export function formatToolResultText(result: AssistantToolResult): string {
  const data = (result.data ?? {}) as unknown as FormattedToolData
  if (!data || Object.keys(data).length === 0) return result.summary

  switch (result.name) {
    case 'get_business_snapshot': {
      const snapshot = result.data
      return businessSnapshotToText(snapshot as unknown as Parameters<typeof businessSnapshotToText>[0])
    }
    case 'get_sales_summary': {
      const lines = [
        `Ventas ${String(data.periodLabel)}: ${data.count} ventas por ${formatCurrency(Number(data.total ?? 0))}.`,
        `Ticket promedio: ${formatCurrency(Number(data.averageTicket ?? 0))}.`,
      ]
      const byPayment = Array.isArray(data.byPayment)
        ? (data.byPayment as Array<{ label: string; count: number; total: number }>)
        : []
      if (byPayment.length) {
        lines.push('Por método de pago:')
        for (const p of byPayment) lines.push(`  • ${p.label}: ${p.count} ventas, ${formatCurrency(p.total)}`)
      }
      return lines.join('\n')
    }
    case 'get_inventory_status': {
      const lowStock = Array.isArray(data.lowStock)
        ? (data.lowStock as Array<{ name: string; stock: number; threshold: number; category: string | null }>)
        : []
      const lines = [
        `Inventario: ${data.products} productos, ${data.units} unidades.`,
        `Valor del stock (a precio de venta): ${formatCurrency(Number(data.stockValueRetail ?? 0))}.`,
        `${data.lowStockCount} productos con stock bajo, de los cuales ${data.outOfStockCount} agotados.`,
        'Con stock bajo:',
        ...(lowStock.length
          ? lowStock.map(
              (p) => `  • ${p.name}: ${p.stock} uds (mín ${p.threshold})${p.category ? ` - ${p.category}` : ''}`,
            )
          : ['  (ninguno)']),
      ]
      return lines.join('\n')
    }
    case 'get_web_orders_status': {
      const counts = (data.counts ?? {}) as Record<string, number>
      const pending = Array.isArray(data.oldestPending)
        ? (data.oldestPending as Array<{ reference: string; customer: string; total: string; created: string }>)
        : []
      const lines = [
        `Pedidos de la tienda online: ${counts.PENDING ?? 0} pendientes, ${counts.CONFIRMED ?? 0} confirmados, ${counts.CONVERTED ?? 0} convertidos, ${counts.CANCELLED ?? 0} cancelados.`,
        `Los pendientes se cancelan automáticamente tras ${data.expiryHours} horas.`,
      ]
      if (pending.length) {
        lines.push('Pendientes más antiguos:')
        for (const o of pending) {
          lines.push(
            `  • ${o.reference ?? 'S/N'} - ${o.customer} - ${o.total} - ${new Date(o.created).toLocaleDateString('es-CO')}`,
          )
        }
      }
      return lines.join('\n')
    }
    case 'get_recent_sales': {
      const sales = Array.isArray(data.sales)
        ? (data.sales as Array<{
            invoice: string
            client: string
            totalFormatted: string
            payment: string
            date: string
          }>)
        : []
      return (
        'Últimas ventas:\n' +
        (sales.length
          ? sales
              .map(
                (s) =>
                  `  • ${s.invoice} - ${s.client} - ${s.totalFormatted} - ${s.payment} - ${new Date(s.date).toLocaleDateString('es-CO')}`,
              )
              .join('\n')
          : '  (sin ventas)')
      )
    }
    case 'get_client_summary': {
      const topClients = Array.isArray(data.topClients)
        ? (data.topClients as Array<{ name: string; total: number }>)
        : []
      const lines = [`Clientes: ${data.total} registrados, ${data.newThisMonth} nuevos este mes.`]
      if (topClients.length) {
        lines.push('Mayores compradores:')
        for (const c of topClients) lines.push(`  • ${c.name}: ${formatCurrency(c.total)}`)
      }
      return lines.join('\n')
    }
    case 'get_pending_credit': {
      return `Crédito pendiente de cobro: ${formatCurrency(Number(data.totalOutstanding ?? 0))} en ${data.salesCount ?? 0} ventas a crédito.`
    }
    case 'get_contact_messages': {
      const messages = Array.isArray(data.messages)
        ? (data.messages as Array<{
            name: string
            email: string | null
            message: string
            read: boolean
            createdAt: string
          }>)
        : []
      return (
        `Mensajes de contacto${data.unreadOnly ? ' sin leer' : ''} (${messages.length}):\n` +
        (messages.length
          ? messages
              .map(
                (m) =>
                  `  • ${m.name}${m.email ? ` (${m.email})` : ''}: ${m.message.slice(0, 80)}${m.message.length > 80 ? '…' : ''}${m.read ? '' : ' [sin leer]'}`,
              )
              .join('\n')
          : '  (sin mensajes)')
      )
    }
    case 'get_finance_summary': {
      return `Ingresos del mes: ${formatCurrency(Number(data.income ?? 0))} · Gastos: ${formatCurrency(Number(data.expenses ?? 0))} · Saldo: ${formatCurrency(Number(data.balance ?? 0))}.`
    }
    case 'generate_executive_report': {
      const d = result.data as Record<string, any>
      return [
        '# 📊 Informe Ejecutivo Integral - Cilmax ERP',
        `*Generado en vivo: ${new Date(d.generatedAt).toLocaleString('es-CO')}*\n`,
        '### 1. Desempeño Comercial',
        `- **Ventas de Hoy:** ${d.salesToday?.count} ventas por un total de **${formatCurrency(d.salesToday?.total || 0)}**.`,
        `- **Margen Bruto Estimado Hoy:** **${formatCurrency(d.salesToday?.profitEstimated || 0)}** (utilidad estimada sobre costos).`,
        `- **Ventas del Mes:** ${d.salesMonth?.count} ventas por **${formatCurrency(d.salesMonth?.total || 0)}**.`,
        `- **Gastos del Mes:** ${formatCurrency(d.salesMonth?.expenses || 0)} ➔ **Resultado Operativo Neto:** **${formatCurrency(d.salesMonth?.netBalance || 0)}**.\n`,
        '### 2. Tienda Online (E-Commerce)',
        `- **Pedidos Pendientes:** ${d.webOrders?.pending} pedidos esperando confirmación y preparación.`,
        `- **Pedidos este mes:** ${d.webOrders?.ordersThisMonth} órdenes recibidas.\n`,
        '### 3. Salud y Valorización del Inventario',
        `- **Referencias Activas:** ${d.inventory?.totalProducts} productos (${d.inventory?.totalUnits} unidades físicas en bodega).`,
        `- **Valorización al Costo:** ${formatCurrency(d.inventory?.stockValueCost || 0)}.`,
        `- **Valorización a la Venta:** **${formatCurrency(d.inventory?.stockValueRetail || 0)}**.`,
        `- **Margen Comercial Potencial:** **${formatCurrency(d.inventory?.potentialProfit || 0)}**.`,
        `- **Alertas de Stock:** ${d.inventory?.lowStockCount} productos en nivel bajo, de los cuales **${d.inventory?.outOfStockCount} están agotados**.\n`,
        '### 4. Cartera y Créditos por Cobrar',
        `- **Saldo Pendiente en la Calle:** **${formatCurrency(d.credit?.pendingCreditTotal || 0)}**.`,
        `- **Clientes con Deuda Activa:** ${d.credit?.debtorClientsCount} clientes.`,
      ].join('\n')
    }
    case 'generate_sales_report': {
      const d = result.data as Record<string, any>
      const lines = [
        `# 📈 Reporte Detallado de Ventas (${d.periodLabel})`,
        `- **Total Facturado:** **${formatCurrency(d.total || 0)}**`,
        `- **Cantidad de Transacciones:** ${d.count} ventas`,
        `- **Ticket Promedio:** ${formatCurrency(d.averageTicket || 0)}`,
        `- **Descuentos Otorgados:** ${formatCurrency(d.totalDiscounts || 0)}\n`,
        '### Desglose por Método de Pago',
      ]
      if (Array.isArray(d.byPayment) && d.byPayment.length > 0) {
        for (const p of d.byPayment) {
          lines.push(`- **${p.label}:** ${p.count} ventas | **${formatCurrency(p.total)}** (${p.percentage}%)`)
        }
      } else {
        lines.push('- No se registraron ventas en este período.')
      }

      if (Array.isArray(d.recentSample) && d.recentSample.length > 0) {
        lines.push('\n### Muestra de Ventas Recientes')
        for (const s of d.recentSample) {
          lines.push(
            `- **${s.invoice}:** ${s.client} · ${formatCurrency(s.total)} (${s.payment}) · ${new Date(s.date).toLocaleDateString('es-CO')}`,
          )
        }
      }
      return lines.join('\n')
    }
    case 'generate_inventory_report': {
      const d = result.data as Record<string, any>
      const lines = [
        '# 📦 Reporte Integral de Inventario y Abastecimiento',
        `- **Catálogo Activo:** ${d.totalProducts} productos`,
        `- **Unidades Físicas Totales:** ${d.totalUnits} unidades`,
        `- **Valorización al Costo:** ${formatCurrency(d.stockValueCost || 0)}`,
        `- **Valorización a Precio Venta:** **${formatCurrency(d.stockValueRetail || 0)}**`,
        `- **Margen Proyectado en Bodega:** **${formatCurrency(d.potentialProfit || 0)}**`,
        `- **Alertas de Reposición:** ${d.lowStockCount} productos bajo el mínimo (${d.outOfStockCount} agotados)\n`,
        '### ⚠️ Compras Sugeridas para Reposición Inmediata',
      ]
      if (Array.isArray(d.replenishmentSuggested) && d.replenishmentSuggested.length > 0) {
        for (const p of d.replenishmentSuggested) {
          lines.push(
            `- **${p.name}** (${p.category}): Stock actual: **${p.currentStock}** (Mín: ${p.threshold}) ➔ Pedir: **${p.suggestedOrder} uds** (Costo unit: ${formatCurrency(p.costPrice)})`,
          )
        }
      } else {
        lines.push('- Todo el inventario se encuentra en niveles adecuados.')
      }
      return lines.join('\n')
    }
    case 'generate_client_report': {
      const d = result.data as Record<string, any>
      const lines = [
        '# 👥 Reporte Estratégico de Clientes y Cartera',
        `- **Clientes Registrados:** ${d.totalClients} (${d.newThisMonth} registrados este mes)`,
        `- **Cartera Total Pendiente:** **${formatCurrency(d.totalOutstandingDebt || 0)}** en ${d.debtorsCount} clientes\n`,
        '### 🏆 Top Clientes Compradores',
      ]
      if (Array.isArray(d.topClients) && d.topClients.length > 0) {
        for (const c of d.topClients) {
          lines.push(
            `- **${c.name}** (Tel: ${c.phone}): ${c.salesCount} compras por un total de **${formatCurrency(c.totalSpent)}**`,
          )
        }
      }
      if (Array.isArray(d.topDebtors) && d.topDebtors.length > 0) {
        lines.push('\n### 💳 Cartera de Créditos Pendientes')
        for (const deb of d.topDebtors) {
          lines.push(`- **${deb.name}** (Tel: ${deb.phone}): Saldo adeudado: **${formatCurrency(deb.balance)}**`)
        }
      }
      return lines.join('\n')
    }
    case 'generate_channel_report': {
      const d = result.data as Record<string, any>
      return [
        '# 🏪 Reporte Comparativo de Canales (POS Físico vs Tienda Web)',
        `- **Facturación Global:** **${formatCurrency(d.grandTotal || 0)}** (${d.totalTransactions} transacciones totales)\n`,
        `### Canal Mostrador / Físico:`,
        `- Ventas: ${d.pos?.count} | Total: **${formatCurrency(d.pos?.total || 0)}** (${d.pos?.sharePercentage}% del negocio)`,
        `- Ticket Promedio: ${formatCurrency(d.pos?.averageTicket || 0)}\n`,
        `### Canal Tienda Online (Web):`,
        `- Ventas Convertidas: ${d.web?.count} | Total: **${formatCurrency(d.web?.total || 0)}** (${d.web?.sharePercentage}% del negocio)`,
        `- Ticket Promedio: ${formatCurrency(d.web?.averageTicket || 0)}`,
        `- Pedidos Pendientes de Confirmación: **${d.web?.pendingOrdersCount} pedidos**`,
      ].join('\n')
    }
    case 'search_products': {
      const d = result.data as Record<string, any>
      if (!Array.isArray(d.products) || d.products.length === 0) {
        return `🔍 No se encontraron productos que coincidan con "${d.query}".`
      }
      const lines = [`🔍 Se encontraron ${d.count} productos para "${d.query}":`]
      for (const p of d.products) {
        lines.push(
          `- **${p.name}** | Stock: **${p.stock} uds** ${p.isLowStock ? '⚠️ (Bajo)' : '✅'} | Venta: **${formatCurrency(p.salePrice)}** | Costo: ${formatCurrency(p.costPrice)} (Margen: ${p.margin}%) | ${p.category} | ${p.webVisible}`,
        )
      }
      return lines.join('\n')
    }
    case 'adjust_product_stock': {
      const d = result.data as Record<string, any>
      return [
        '✅ **Ajuste de Inventario Exitoso**',
        `- **Producto:** ${d.productName}`,
        `- **Stock Anterior:** ${d.previousStock} uds`,
        `- **Ajuste:** ${d.quantityChange > 0 ? `+${d.quantityChange}` : d.quantityChange} uds`,
        `- **Nuevo Stock Actual:** **${d.newStock} uds**`,
        `- **Motivo Registrado:** ${d.reason}`,
      ].join('\n')
    }
    case 'search_clients': {
      const d = result.data as Record<string, any>
      if (!Array.isArray(d.clients) || d.clients.length === 0) {
        return `🔍 No se encontraron clientes para "${d.query}".`
      }
      const lines = [`🔍 Se encontraron ${d.count} clientes para "${d.query}":`]
      for (const c of d.clients) {
        lines.push(
          `- **${c.name}** | Tel: ${c.phone} | Compras: ${c.totalPurchases} (${formatCurrency(c.totalSpent)}) | Saldo Pendiente: **${formatCurrency(c.pendingDebt)}**`,
        )
      }
      return lines.join('\n')
    }
    case 'manage_web_order': {
      const d = result.data as Record<string, any>
      if (d.newStatus) {
        return `✅ **Pedido ${d.reference} actualizado a ${d.newStatus}**. ${result.summary}`
      }
      const lines = [
        `🛒 **Detalle del Pedido Web ${d.reference}**`,
        `- **Estado:** ${d.statusLabel}`,
        `- **Cliente:** ${d.customerName} (Tel: ${d.customerPhone})`,
        `- **Total:** **${formatCurrency(d.total || 0)}**`,
        `- **Fecha:** ${new Date(d.createdAt).toLocaleString('es-CO')}`,
        `- **Notas:** ${d.notes}\n`,
        '**Productos en el pedido:**',
      ]
      if (Array.isArray(d.items)) {
        for (const it of d.items) {
          lines.push(
            `  • ${it.productName} x${it.quantity} a ${formatCurrency(it.unitPrice)} (Subtotal: ${formatCurrency(it.total)}) [Stock en almacén: ${it.currentStock}]`,
          )
        }
      }
      return lines.join('\n')
    }
    default:
      return JSON.stringify(result.data)
  }
}
