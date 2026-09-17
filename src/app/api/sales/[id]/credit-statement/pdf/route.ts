import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { loadPdfSettings, renderCreditStatementPdf } from '@/lib/pdf'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const sale = await prisma.sale.findUnique({
    where: { id },
    include: {
      client: true,
      invoice: true,
      payments: {
        include: { user: { select: { name: true } } },
        orderBy: { paymentDate: 'asc' },
      },
      installments: { orderBy: { dueDate: 'asc' } },
    },
  })

  if (!sale) {
    return NextResponse.json({ error: 'Venta no encontrada' }, { status: 404 })
  }

  if (sale.paymentMethod !== 'CREDITO') {
    return NextResponse.json({ error: 'La venta no es un crédito' }, { status: 400 })
  }

  const settings = await loadPdfSettings()
  const pdfBytes = await renderCreditStatementPdf(sale, settings)

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="estado-cuenta-${sale.invoiceNumber}.pdf"`,
    },
  })
}
