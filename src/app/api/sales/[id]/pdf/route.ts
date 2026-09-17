import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { loadPdfSettings, renderInvoicePdf } from '@/lib/pdf'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const sale = await prisma.sale.findUnique({
    where: { id },
    include: {
      client: true,
      items: { include: { product: true } },
      invoice: true,
      user: { select: { id: true, name: true, email: true } },
      payments: { select: { amount: true }, orderBy: { paymentDate: 'asc' } },
      installments: { select: { amount: true, dueDate: true }, orderBy: { dueDate: 'asc' } },
    },
  })

  if (!sale) {
    return NextResponse.json({ error: 'Venta no encontrada' }, { status: 404 })
  }

  const settings = await loadPdfSettings()

  const pdfBytes = await renderInvoicePdf(
    {
      id: sale.id,
      invoiceNumber: sale.invoiceNumber,
      subtotal: sale.subtotal,
      discount: sale.discount,
      total: sale.total,
      paymentMethod: sale.paymentMethod,
      status: sale.status,
      saleDate: sale.saleDate,
      dueDate: sale.dueDate,
      payments: sale.payments,
      installments: sale.installments,
      client: sale.client,
      items: sale.items,
      user: sale.user,
      invoice: sale.invoice,
    },
    settings,
  )

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="factura-${sale.invoiceNumber}.pdf"`,
    },
  })
}
