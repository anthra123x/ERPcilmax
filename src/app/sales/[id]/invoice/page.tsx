import { notFound } from 'next/navigation'
import { getSaleById } from '@/modules/sales/sales.actions'
import { formatCurrency } from '@/lib/format'
import { InvoiceToolbar } from './invoice-toolbar'
import { DianInvoiceView, type DianInvoiceSaleData } from '@/components/sales/dian-invoice-view'

interface InvoicePageProps {
  params: Promise<{ id: string }>
}

export const dynamic = 'force-dynamic'

export default async function InvoicePage({ params }: InvoicePageProps) {
  const { id } = await params
  const sale = await getSaleById(id)

  if (!sale) notFound()

  const companyName = sale.invoice?.companyName || 'Cilmax S.A.S.'
  const currency = sale.invoice?.currency || 'COP'
  const totalFormatted = formatCurrency(sale.total, currency)

  return (
    <div className="space-y-6 pb-12 max-w-4xl mx-auto px-2 sm:px-0">
      {/* Barra de Herramientas Interactiva (Oculta al imprimir) */}
      <InvoiceToolbar
        saleId={sale.id}
        invoiceNumber={sale.invoiceNumber}
        clientName={sale.client?.name}
        clientPhone={sale.client?.phone}
        totalFormatted={totalFormatted}
        companyName={companyName}
      />

      {/* Factura Electrónica Estandarizada DIAN */}
      <DianInvoiceView sale={sale as unknown as DianInvoiceSaleData} />
    </div>
  )
}
