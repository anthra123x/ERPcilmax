import { beforeEach, describe, expect, it, vi } from 'vitest'
import { formatToolResultText, isAssistantToolName, runAssistantTool } from './ai.tools'

const norm = (s: string) => s.replace(/\u00A0/g, '')

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    systemSettings: { findFirst: vi.fn() },
    storeSetting: { findUnique: vi.fn() },
    sale: { findMany: vi.fn(), groupBy: vi.fn() },
    product: { findMany: vi.fn(), count: vi.fn() },
    webOrder: { groupBy: vi.fn(), findMany: vi.fn() },
    client: { count: vi.fn(), findMany: vi.fn() },
    contactMessage: { count: vi.fn(), findMany: vi.fn() },
    expense: { aggregate: vi.fn() },
  },
}))

vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }))

function defaultMocks() {
  prismaMock.systemSettings.findFirst.mockResolvedValue({
    companyName: 'Cilmax',
    currency: 'COP',
    lowStockThreshold: 5,
    webPendingExpiryHours: 24,
  })
  prismaMock.storeSetting.findUnique.mockResolvedValue({ key: 'store', value: { storeName: 'Tienda Demo' } })
  prismaMock.sale.findMany.mockResolvedValue([])
  prismaMock.sale.groupBy.mockResolvedValue([])
  prismaMock.product.findMany.mockResolvedValue([])
  prismaMock.product.count.mockResolvedValue(0)
  prismaMock.webOrder.groupBy.mockResolvedValue([])
  prismaMock.webOrder.findMany.mockResolvedValue([])
  prismaMock.client.count.mockResolvedValue(0)
  prismaMock.client.findMany.mockResolvedValue([])
  prismaMock.contactMessage.count.mockResolvedValue(0)
  prismaMock.contactMessage.findMany.mockResolvedValue([])
  prismaMock.expense.aggregate.mockResolvedValue({ _sum: { amount: 0 } })
}

beforeEach(() => {
  vi.clearAllMocks()
  defaultMocks()
})

describe('isAssistantToolName', () => {
  it('reconoce herramientas válidas', () => {
    expect(isAssistantToolName('get_sales_summary')).toBe(true)
    expect(isAssistantToolName('get_inventory_status')).toBe(true)
  })

  it('rechaza nombres desconocidos', () => {
    expect(isAssistantToolName('hack_db')).toBe(false)
    expect(isAssistantToolName(42)).toBe(false)
  })
})

describe('get_sales_summary', () => {
  it('agrupa ventas del período por método de pago', async () => {
    prismaMock.sale.findMany.mockResolvedValue([
      { id: '1', total: 100000, paymentMethod: 'CASH' },
      { id: '2', total: 250000, paymentMethod: 'TRANSFER' },
      { id: '3', total: 50000, paymentMethod: 'CASH' },
    ])

    const result = await runAssistantTool('get_sales_summary', { period: 'today' })

    expect(result.data.count).toBe(3)
    expect(result.data.total).toBe(400000)
    expect(result.data.averageTicket).toBeCloseTo(133333.33, 1)
    expect(result.data.byPayment).toEqual([
      { method: 'CASH', label: 'Efectivo', count: 2, total: 150000 },
      { method: 'TRANSFER', label: 'Transferencia', count: 1, total: 250000 },
    ])
    expect(norm(result.summary)).toContain('$400.000')
  })
})

describe('get_inventory_status', () => {
  it('calcula stock bajo, agotados y valor', async () => {
    prismaMock.product.findMany.mockResolvedValue([
      { name: 'Bajo', stock: 1, lowStockThreshold: 5, costPrice: 10000, salePrice: 20000, category: { name: 'Accesorios' } },
      { name: 'Agotado', stock: 0, lowStockThreshold: 5, costPrice: 5000, salePrice: 15000, category: null },
      { name: 'Ok', stock: 10, lowStockThreshold: 5, costPrice: 20000, salePrice: 40000, category: { name: 'Equipos' } },
    ])

    const result = await runAssistantTool('get_inventory_status')

    expect(result.data.products).toBe(3)
    expect(result.data.units).toBe(11)
    expect(result.data.lowStockCount).toBe(2)
    expect(result.data.outOfStockCount).toBe(1)
    expect(result.data.stockValueRetail).toBe(420000)
    const lowStockData = result.data.lowStock as Array<{ name: string }>
    expect(lowStockData[0].name).toBe('Agotado')
    expect(lowStockData[1].name).toBe('Bajo')
    expect(norm(formatToolResultText(result))).toContain('$420.000')
  })
})

describe('get_web_orders_status', () => {
  it('cuenta estados y lista pendientes antiguos', async () => {
    prismaMock.webOrder.groupBy.mockResolvedValue([
      { status: 'PENDING', _count: { id: 3 } },
      { status: 'CONFIRMED', _count: { id: 2 } },
    ])
    prismaMock.webOrder.findMany.mockResolvedValue([
      {
        id: 'o1',
        reference: 'ORD-1001',
        customerName: 'Ana',
        customerPhone: '300',
        total: 120000,
        currency: 'COP',
        status: 'PENDING',
        createdAt: new Date('2026-09-01T10:00:00Z'),
      },
      {
        id: 'o2',
        reference: 'ORD-1002',
        customerName: 'Luis',
        customerPhone: '301',
        total: 80000,
        currency: 'COP',
        status: 'PENDING',
        createdAt: new Date('2026-09-02T10:00:00Z'),
      },
    ])

    const result = await runAssistantTool('get_web_orders_status')

    expect(result.data.counts).toEqual({ PENDING: 3, CONFIRMED: 2 })
    expect(result.data.total).toBe(5)
    expect(result.data.expiryHours).toBe(24)
    const oldestPending = result.data.oldestPending as Array<{ reference: string | null; total: string }>
    expect(oldestPending).toHaveLength(2)
    expect(oldestPending[0].reference).toBe('ORD-1001')
    expect(norm(oldestPending[0].total)).toBe('$120.000')
    expect(result.summary).toContain('3 pendientes')
  })
})

describe('get_pending_credit', () => {
  it('suma saldos pendientes descontando pagos', async () => {
    prismaMock.sale.findMany.mockResolvedValue([
      { total: 200000, payments: [{ amount: 50000 }] },
      { total: 100000, payments: [] },
    ])

    const result = await runAssistantTool('get_pending_credit')

    expect(result.data.salesCount).toBe(2)
    expect(result.data.totalOwed).toBe(300000)
    expect(result.data.totalOutstanding).toBe(250000)
    expect(norm(result.summary)).toContain('$250.000')
  })
})

describe('get_recent_sales', () => {
  it('devuelve últimas ventas con límite configurable', async () => {
    prismaMock.sale.findMany.mockResolvedValue([
      {
        id: 's1',
        invoiceNumber: 'CIL-001',
        total: 120000,
        paymentMethod: 'CASH',
        saleDate: new Date('2026-09-10T15:00:00Z'),
        client: { name: 'Carlos' },
      },
    ])

    const result = await runAssistantTool('get_recent_sales', { limit: 3 })

    expect(result.data.limit).toBe(3)
    const salesData = result.data.sales as Array<{ invoice: string; client: string; totalFormatted: string }>
    expect(salesData[0].invoice).toBe('CIL-001')
    expect(salesData[0].client).toBe('Carlos')
    expect(norm(salesData[0].totalFormatted)).toBe('$120.000')
  })
})

describe('get_client_summary', () => {
  it('lista mayores compradores', async () => {
    prismaMock.client.count.mockResolvedValue(7)
    prismaMock.sale.groupBy.mockResolvedValue([{ clientId: 'c1', _sum: { total: 400000 } }])
    prismaMock.client.findMany.mockResolvedValue([{ id: 'c1', name: 'Carlos' }])

    const result = await runAssistantTool('get_client_summary')

    expect(result.data.total).toBe(7)
    expect(result.data.newThisMonth).toBe(7)
    expect(result.data.topClients).toEqual([{ clientId: 'c1', name: 'Carlos', total: 400000 }])
    expect(formatToolResultText(result)).toContain('Carlos')
  })
})

describe('get_finance_summary', () => {
  it('calcula ingresos, gastos y saldo del mes', async () => {
    prismaMock.sale.findMany.mockResolvedValue([{ total: 100000 }, { total: 50000 }])
    prismaMock.expense.aggregate.mockResolvedValue({ _sum: { amount: 20000 } })

    const result = await runAssistantTool('get_finance_summary')

    expect(result.data.income).toBe(150000)
    expect(result.data.expenses).toBe(20000)
    expect(result.data.balance).toBe(130000)
    expect(norm(formatToolResultText(result))).toContain('$130.000')
  })
})

describe('get_business_snapshot', () => {
  it('integra el resumen general', async () => {
    prismaMock.sale.findMany.mockResolvedValue([{ total: 150000, payments: [] }])
    prismaMock.product.findMany.mockResolvedValue([
      { name: 'Bajo', stock: 1, lowStockThreshold: 5, costPrice: 10000, salePrice: 20000, category: null },
    ])
    prismaMock.webOrder.findMany.mockResolvedValue([{ status: 'PENDING' }, { status: 'CONFIRMED' }])
    prismaMock.client.count.mockResolvedValue(4)
    prismaMock.contactMessage.count.mockResolvedValue(2)
    prismaMock.product.count.mockResolvedValue(1)

    const result = await runAssistantTool('get_business_snapshot')
    const data = result.data as unknown as {
      salesToday: { count: number; total: number }
      inventory: { products: number }
      webOrders: { PENDING: number; CONFIRMED: number }
      clients: { total: number }
      contactUnread: number
    }

    expect(data.salesToday.count).toBe(1)
    expect(data.salesToday.total).toBe(150000)
    expect(data.inventory.products).toBe(1)
    expect(data.webOrders.PENDING).toBe(1)
    expect(data.webOrders.CONFIRMED).toBe(1)
    expect(data.clients.total).toBe(4)
    expect(data.contactUnread).toBe(2)
  })
})