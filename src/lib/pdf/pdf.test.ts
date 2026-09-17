import { describe, expect, it } from 'vitest'
import { renderCreditStatementPdf, renderInvoicePdf, renderReceiptPdf, type PdfSettings } from './index'

const now = new Date('2026-09-17T12:00:00.000Z')
const plus = (days: number) => new Date(now.getTime() + days * 864e5)

const settings: PdfSettings = {
  companyName: 'Cilmax',
  companyNit: '900.123.456-7',
  companyAddress: 'Calle 10 #20-30',
  companyCity: 'Medellín',
  companyPhone: '300 123 4567',
  companyEmail: 'hola@cilmax.store',
  invoicePrefix: 'CIL-',
  invoiceFooter: null,
  currency: 'COP',
}

const sale = {
  id: 'sale-1',
  invoiceNumber: 'CIL-0001',
  subtotal: 480000,
  discount: 20000,
  total: 460000,
  paymentMethod: 'CREDITO',
  status: 'COMPLETED',
  saleDate: now,
  dueDate: plus(30),
  payments: [
    { id: 'p1', amount: 100000, paymentMethod: 'CASH', paymentDate: now, notes: 'Cuota inicial', user: { name: 'Admin' } },
    { id: 'p2', amount: 50000, paymentMethod: 'TRANSFER', paymentDate: plus(5), notes: null, user: { name: 'Admin' } },
  ],
  installments: [
    { id: 'i1', amount: 150000, dueDate: plus(-2) },
    { id: 'i2', amount: 150000, dueDate: plus(20) },
    { id: 'i3', amount: 160000, dueDate: plus(50) },
  ],
  client: { name: 'Cliente Prueba', phone: '300 000 0000', email: 'cliente@example.com', address: 'Calle 1 #2-3' },
  items: [
    { quantity: 1, unitPrice: 300000, total: 300000, product: { name: 'iPhone 15 Pro Max 256GB' } },
    { quantity: 2, unitPrice: 80000, total: 160000, product: { name: 'Forro transparente' } },
    { quantity: 1, unitPrice: 20000, total: 20000, product: { name: 'Vidrio templado' } },
  ],
  user: { name: 'Admin' },
  invoice: null,
}

function expectPdf(bytes: Uint8Array) {
  expect(bytes.length).toBeGreaterThan(1000)
  expect(Buffer.from(bytes.subarray(0, 5)).toString('latin1')).toBe('%PDF-')
}

describe('PDF documents', () => {
  it('renders a valid invoice PDF', async () => {
    expectPdf(await renderInvoicePdf(sale, settings))
  })

  it('renders a valid payment receipt PDF', async () => {
    expectPdf(await renderReceiptPdf(sale, 'p2', 'CIL-0001-A02', settings))
  })

  it('renders a valid credit statement PDF', async () => {
    expectPdf(await renderCreditStatementPdf(sale, settings))
  })

  it('renders without company settings', async () => {
    expectPdf(await renderInvoicePdf(sale))
  })
})
