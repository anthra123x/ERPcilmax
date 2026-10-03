import { describe, it, expect, vi } from 'vitest'

const sale = {
  id: 'sale-1',
  invoiceNumber: 'CIL-9',
  subtotal: 480000,
  discount: 0,
  total: 480000,
  paymentMethod: 'CASH',
  status: 'COMPLETED',
  saleDate: new Date('2026-09-17T12:00:00.000Z'),
  dueDate: null,
  client: {
    id: 'c1',
    name: 'Cliente',
    phone: '300',
    email: null,
    address: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  items: [
    {
      id: 'i1',
      quantity: 1,
      unitPrice: 480000,
      total: 480000,
      subtotal: 480000,
      discount: 0,
      taxRate: 19,
      productId: 'p1',
      product: { id: 'p1', name: 'Combo Olla', barcode: '123', createdAt: new Date(), updatedAt: new Date() },
    },
  ],
  payments: [],
  installments: [],
  user: { id: 'u1', name: 'Admin', email: null },
  invoice: null,
}

vi.mock('@/lib/prisma', () => ({
  prisma: {
    sale: { findUnique: vi.fn().mockResolvedValue(sale) },
    systemSettings: { findFirst: vi.fn().mockResolvedValue(null) },
  },
}))

describe('route /api/sales/[id]/pdf', () => {
  it('responde un PDF descargable', async () => {
    const { GET } = await import('./route')
    const res = await GET(
      new Request('http://x/api/sales/sale-1/pdf') as never,
      {
        params: Promise.resolve({ id: 'sale-1' }),
      } as never,
    )

    console.log('ROUTE status:', res.status)
    console.log('ROUTE headers:', JSON.stringify(Object.fromEntries(res.headers.entries())))
    const buf = Buffer.from(await res.arrayBuffer())
    console.log('ROUTE bytes:', buf.length, 'magic:', buf.subarray(0, 5).toString('latin1'))
    expect(res.status).toBe(200)
    expect(buf.subarray(0, 5).toString('latin1')).toBe('%PDF-')
  })
})
