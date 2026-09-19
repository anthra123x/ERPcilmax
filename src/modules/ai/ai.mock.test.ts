import { beforeEach, describe, expect, it, vi } from 'vitest'
import { detectIntent, runMockAssistant } from './ai.mock'

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

beforeEach(() => {
  vi.clearAllMocks()
  prismaMock.systemSettings.findFirst.mockResolvedValue({
    companyName: 'Cilmax',
    currency: 'COP',
    lowStockThreshold: 5,
    webPendingExpiryHours: 24,
  })
  prismaMock.storeSetting.findUnique.mockResolvedValue({ key: 'store', value: { storeName: 'Tienda Demo' } })
  prismaMock.sale.findMany.mockResolvedValue([{ id: '1', total: 150000, paymentMethod: 'CASH' }])
  prismaMock.product.findMany.mockResolvedValue([
    { name: 'Bajo', stock: 1, lowStockThreshold: 5, costPrice: 10000, salePrice: 20000, category: null },
  ])
  prismaMock.webOrder.findMany.mockResolvedValue([])
  prismaMock.webOrder.groupBy.mockResolvedValue([])
  prismaMock.client.count.mockResolvedValue(3)
  prismaMock.contactMessage.count.mockResolvedValue(1)
  prismaMock.contactMessage.findMany.mockResolvedValue([])
  prismaMock.product.count.mockResolvedValue(1)
  prismaMock.expense.aggregate.mockResolvedValue({ _sum: { amount: 0 } })
})

describe('detectIntent', () => {
  it('detecta ventas y período', () => {
    const intent = detectIntent('¿cómo van las ventas de hoy?')
    expect(intent?.tools).toEqual(['get_sales_summary'])
    expect(intent?.args?.[0].args.period).toBe('today')
  })

  it('detecta stock', () => {
    const intent = detectIntent('qué productos tienen stock bajo')
    expect(intent?.tools).toContain('get_inventory_status')
  })

  it('detecta pedidos de la tienda online', () => {
    const intent = detectIntent('hay pedidos pendientes en la tienda online')
    expect(intent?.tools).toContain('get_web_orders_status')
  })

  it('detecta créditos', () => {
    const intent = detectIntent('cuánto dinero me deben a crédito')
    expect(intent?.tools).toContain('get_pending_credit')
  })

  it('detecta resumen general', () => {
    const intent = detectIntent('resumen general del negocio')
    expect(intent?.tools).toEqual(['get_recent_sales', 'get_business_snapshot'])
  })

  it('no matchea mensajes ajenos', () => {
    expect(detectIntent('cuál es el clima de la ciudad hoy')).toBeNull()
  })
})

describe('runMockAssistant', () => {
  it('responde con datos de ventas en modo simulación', async () => {
    const result = await runMockAssistant('ventas de hoy')
    expect(result.toolsUsed).toEqual(['get_sales_summary'])
    expect(result.reply).toContain('modo simulación')
    expect(result.reply).toContain('Ventas hoy')
    expect(norm(result.reply)).toContain('$150.000')
  })

  it('anuncia capacidades cuando no entiende la pregunta', async () => {
    const result = await runMockAssistant('¿qué es un agente de IA?')
    expect(result.toolsUsed).toEqual([])
    expect(result.reply).toContain('Puedo ayudarte con datos en tiempo real')
  })

  it('tolera fallos de herramientas sin romper la respuesta', async () => {
    prismaMock.sale.findMany.mockRejectedValue(new Error('db caída'))
    const result = await runMockAssistant('ventas de hoy')
    expect(result.reply).toContain('no se pudo cargar')
    expect(result.toolsUsed).toEqual(['get_sales_summary'])
  })
})