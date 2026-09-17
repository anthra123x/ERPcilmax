import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { loadPdfSettings, renderReceiptPdf } from '@/lib/pdf'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; paymentId: string }> },
) {
  const { id, paymentId } = await params

  const sale = await prisma.sale.findUnique({
    where: { id },
    include: {
      client: true,
      invoice: true,
      payments: {
        include: { user: { select: { name: true } } },
        orderBy: { paymentDate: 'asc' },
      },
    },
  })

  if (!sale) {
    return NextResponse.json({ error: 'Venta no encontrada' }, { status: 404 })
  }

  const index = sale.payments.findIndex((p) => p.id === paymentId)
  if (index === -1) {
    return NextResponse.json({ error: 'Abono no encontrado' }, { status: 404 })
  }

  const settings = await loadPdfSettings()
  const receiptNumber = `${sale.invoiceNumber}-A${String(index + 1).padStart(2, '0')}`

  const pdfBytes = await renderReceiptPdf(sale, paymentId, receiptNumber, settings)

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="recibo-${receiptNumber}.pdf"`,
    },
  })
}
