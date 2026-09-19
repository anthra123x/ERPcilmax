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
  { name: 'get_web_orders_status', description: 'Pedidos de la tienda online por estado y pendientes más antiguos.', args: {} },
  { name: 'get_recent_sales', description: 'Últimas ventas registradas.', args: { limit: 'número (por defecto 5)' } },
  { name: 'get_client_summary', description: 'Clientes: totales, nuevos del mes y mayores compradores.', args: {} },
  { name: 'get_pending_credit', description: 'Créditos pendientes de cobro.', args: {} },
  { name: 'get_contact_messages', description: 'Mensajes de contacto recientes.', args: { unreadOnly: 'boolean' } },
  { name: 'get_finance_summary', description: 'Ingresos vs gastos del mes actual.', args: {} },
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

  const lowStock = products
    .filter((p) => p.stock <= p.lowStockThreshold)
    .sort((a, b) => a.stock - b.stock)

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
    summary: summarize('get_pending_credit', `${formatCurrency(outstandingTotal)} pendientes en ${sales.length} ventas a crédito`),
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
    summary: summarize('get_finance_summary', `Ingresos ${formatCurrency(income)} · gastos ${formatCurrency(outgoings)} · saldo ${formatCurrency(income - outgoings)}`),
    executedAt: new Date().toISOString(),
  }
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
      return businessSnapshotToText(
        snapshot as unknown as Parameters<typeof businessSnapshotToText>[0],
      )
    }
    case 'get_sales_summary': {
      const lines = [
        `Ventas ${String(data.periodLabel)}: ${data.count} ventas por ${formatCurrency(Number(data.total ?? 0))}.`,
        `Ticket promedio: ${formatCurrency(Number(data.averageTicket ?? 0))}.`,
      ]
      const byPayment = Array.isArray(data.byPayment) ? (data.byPayment as Array<{ label: string; count: number; total: number }>) : []
      if (byPayment.length) {
        lines.push('Por método de pago:')
        for (const p of byPayment) lines.push(`  • ${p.label}: ${p.count} ventas, ${formatCurrency(p.total)}`)
      }
      return lines.join('\n')
    }
    case 'get_inventory_status': {
      const lowStock = Array.isArray(data.lowStock) ? (data.lowStock as Array<{ name: string; stock: number; threshold: number; category: string | null }>) : []
      const lines = [
        `Inventario: ${data.products} productos, ${data.units} unidades.`,
        `Valor del stock (a precio de venta): ${formatCurrency(Number(data.stockValueRetail ?? 0))}.`,
        `${data.lowStockCount} productos con stock bajo, de los cuales ${data.outOfStockCount} agotados.`,
        'Con stock bajo:',
        ...(lowStock.length
          ? lowStock.map((p) => `  • ${p.name}: ${p.stock} uds (mín ${p.threshold})${p.category ? ` - ${p.category}` : ''}`)
          : ['  (ninguno)']),
      ]
      return lines.join('\n')
    }
    case 'get_web_orders_status': {
      const counts = (data.counts ?? {}) as Record<string, number>
      const pending = Array.isArray(data.oldestPending) ? (data.oldestPending as Array<{ reference: string; customer: string; total: string; created: string }>) : []
      const lines = [
        `Pedidos de la tienda online: ${counts.PENDING ?? 0} pendientes, ${counts.CONFIRMED ?? 0} confirmados, ${counts.CONVERTED ?? 0} convertidos, ${counts.CANCELLED ?? 0} cancelados.`,
        `Los pendientes se cancelan automáticamente tras ${data.expiryHours} horas.`,
      ]
      if (pending.length) {
        lines.push('Pendientes más antiguos:')
        for (const o of pending) {
          lines.push(`  • ${o.reference ?? 'S/N'} - ${o.customer} - ${o.total} - ${new Date(o.created).toLocaleDateString('es-CO')}`)
        }
      }
      return lines.join('\n')
    }
    case 'get_recent_sales': {
      const sales = Array.isArray(data.sales) ? (data.sales as Array<{ invoice: string; client: string; totalFormatted: string; payment: string; date: string }>) : []
      return (
        'Últimas ventas:\n' +
        (sales.length
          ? sales
              .map((s) => `  • ${s.invoice} - ${s.client} - ${s.totalFormatted} - ${s.payment} - ${new Date(s.date).toLocaleDateString('es-CO')}`)
              .join('\n')
          : '  (sin ventas)')
      )
    }
    case 'get_client_summary': {
      const topClients = Array.isArray(data.topClients) ? (data.topClients as Array<{ name: string; total: number }>) : []
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
      const messages = Array.isArray(data.messages) ? (data.messages as Array<{ name: string; email: string | null; message: string; read: boolean; createdAt: string }>) : []
      return (
        `Mensajes de contacto${data.unreadOnly ? ' sin leer' : ''} (${messages.length}):\n` +
        (messages.length
          ? messages
              .map((m) => `  • ${m.name}${m.email ? ` (${m.email})` : ''}: ${m.message.slice(0, 80)}${m.message.length > 80 ? '…' : ''}${m.read ? '' : ' [sin leer]'}`)
              .join('\n')
          : '  (sin mensajes)')
      )
    }
    case 'get_finance_summary': {
      return `Ingresos del mes: ${formatCurrency(Number(data.income ?? 0))} · Gastos: ${formatCurrency(Number(data.expenses ?? 0))} · Saldo: ${formatCurrency(Number(data.balance ?? 0))}.`
    }
    default:
      return JSON.stringify(result.data)
  }
}