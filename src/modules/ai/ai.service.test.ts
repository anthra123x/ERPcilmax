import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AI_PROVIDER_KEYS_ENV } from './ai.config'
import { runAssistantTurn } from './ai.service'

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
  prismaMock.sale.findMany.mockResolvedValue([
    { id: '1', total: 150000, paymentMethod: 'CASH', payments: [], client: null, saleDate: new Date() },
  ])
  prismaMock.sale.groupBy.mockResolvedValue([])
  prismaMock.product.findMany.mockResolvedValue([
    { name: 'Bajo', stock: 1, lowStockThreshold: 5, costPrice: 10000, salePrice: 20000, category: null },
  ])
  prismaMock.product.count.mockResolvedValue(1)
  prismaMock.webOrder.groupBy.mockResolvedValue([])
  prismaMock.webOrder.findMany.mockResolvedValue([])
  prismaMock.client.count.mockResolvedValue(3)
  prismaMock.client.findMany.mockResolvedValue([])
  prismaMock.contactMessage.count.mockResolvedValue(1)
  prismaMock.contactMessage.findMany.mockResolvedValue([])
  prismaMock.expense.aggregate.mockResolvedValue({ _sum: { amount: 0 } })
}

function openaiResponse(content: string): Response {
  return {
    ok: true,
    status: 200,
    json: async () => ({ choices: [{ message: { content } }] }),
  } as unknown as Response
}

function quotaResponse(): Response {
  return {
    ok: false,
    status: 429,
    json: async () => ({ error: { message: 'insufficient_quota' } }),
    text: async () => 'insufficient_quota',
  } as unknown as Response
}

const previousEnv = process.env[AI_PROVIDER_KEYS_ENV]
const originalFetch = globalThis.fetch

afterEach(() => {
  if (previousEnv !== undefined) process.env[AI_PROVIDER_KEYS_ENV] = previousEnv
  else delete process.env[AI_PROVIDER_KEYS_ENV]
  globalThis.fetch = originalFetch
})

beforeEach(() => {
  vi.clearAllMocks()
  defaultMocks()
  delete process.env[AI_PROVIDER_KEYS_ENV]
})

describe('runAssistantTurn', () => {
  it('usa el modo mock cuando no hay API keys configuradas', async () => {
    const result = await runAssistantTurn({ message: 'ventas de hoy' })

    expect(result.mode).toBe('mock')
    expect(result.reply).toContain('modo simulación')
    expect(result.toolsUsed).toContain('get_sales_summary')
    expect(result.durationMs).toBeGreaterThanOrEqual(0)
    expect(result.askedAt).toBeTruthy()
  })

  it('usa el agente de IA cuando está configurado', async () => {
    process.env[AI_PROVIDER_KEYS_ENV] = JSON.stringify([
      { provider: 'openai', key: 'sk-1234567890abcdef' },
    ])
    globalThis.fetch = vi.fn().mockResolvedValue(openaiResponse('{"text":"Respuesta del modelo de prueba"}')) as unknown as typeof fetch

    const result = await runAssistantTurn({ message: '¿cómo van las ventas?' })

    expect(result.mode).toBe('ai')
    expect(result.reply).toBe('Respuesta del modelo de prueba')
    expect(result.agent?.provider).toBe('openai')
    expect(globalThis.fetch).toHaveBeenCalled()
  })

  it('ejecuta la herramienta solicitada por el agente y responde en un segundo turno', async () => {
    process.env[AI_PROVIDER_KEYS_ENV] = JSON.stringify([
      { provider: 'openai', key: 'sk-1234567890abcdef' },
    ])
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce(openaiResponse('{"tool":"get_sales_summary","args":{"period":"today"}}'))
      .mockResolvedValueOnce(openaiResponse('{"text":"Hubo 1 venta por $150.000 hoy"}')) as unknown as typeof fetch

    const result = await runAssistantTurn({ message: 'quiero el detalle de ventas de hoy' })

    expect(result.mode).toBe('ai')
    expect(result.reply).toContain('$150.000')
    expect(result.toolsUsed).toContain('get_sales_summary')
    expect(globalThis.fetch).toHaveBeenCalledTimes(2)
  })

  it('cae al modo mock cuando todos los agentes se quedan sin cuota', async () => {
    process.env[AI_PROVIDER_KEYS_ENV] = JSON.stringify([
      { provider: 'openai', key: 'sk-1234567890abcdef' },
    ])
    globalThis.fetch = vi.fn().mockResolvedValue(quotaResponse()) as unknown as typeof fetch

    const result = await runAssistantTurn({ message: 'ventas de hoy' })

    expect(result.mode).toBe('mock')
    expect(result.reply).toContain('modo simulación')
    expect(result.toolsUsed).toContain('get_sales_summary')
  })

  it('respeta el historial reciente limitado a los últimos mensajes', async () => {
    delete process.env[AI_PROVIDER_KEYS_ENV]
    const history = [
      { role: 'user' as const, content: 'hola' },
      { role: 'assistant' as const, content: 'hola, que quieres saber?' },
    ]
    const result = await runAssistantTurn({ message: 'resumen del negocio', history })

    expect(result.mode).toBe('mock')
    expect(result.toolsUsed).toContain('get_business_snapshot')
  })
})