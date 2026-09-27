import { notFound } from 'next/navigation'
import Image from 'next/image'
import { getSaleById } from '@/modules/sales/sales.actions'
import { formatCurrency } from '@/lib/format'
import { getPaymentMethodLabel } from '@/lib/labels'
import { InvoiceToolbar } from './invoice-toolbar'
import { QrCode } from 'lucide-react'

interface InvoicePageProps {
  params: Promise<{ id: string }>
}

export const dynamic = 'force-dynamic'

export default async function InvoicePage({ params }: InvoicePageProps) {
  const { id } = await params
  const sale = await getSaleById(id)

  if (!sale) notFound()

  const companyName = sale.invoice?.companyName || 'Cilmax S.A.S.'
  const companyNit = sale.invoice?.companyNit || '901.482.391-4'
  const companyAddress = sale.invoice?.companyAddress || 'Calle Principal #10-24'
  const companyCity = sale.invoice?.companyCity || 'Colombia'
  const companyPhone = sale.invoice?.companyPhone || '+57 (300) 000-0000'
  const companyEmail = sale.invoice?.companyEmail || 'contacto@cilmax.com'
  const currency = sale.invoice?.currency || 'COP'
  const invoiceFooter =
    sale.invoice?.invoiceFooter ||
    'Garantía legal sobre productos de conformidad con la ley aplicable.'

  const saleDate = new Date(sale.saleDate)
  const dateStr = saleDate.toLocaleDateString('es-CO', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const timeStr = saleDate.toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
  })

  const isCredit = sale.paymentMethod === 'CREDITO'
  const totalPaid = (sale.payments ?? []).reduce((s, p) => s + p.amount, 0)
  const pendingBalance = Math.max(0, sale.total - totalPaid)
  const isPaidInFull = !isCredit || pendingBalance <= 0

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

      {/* Hoja de Factura Electrónica: Minimalista, Sobria y Profesional */}
      <div className="invoice-sheet bg-white text-slate-900 rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden print:border-none print:shadow-none print:rounded-none">
        <div className="p-4 sm:p-8 md:p-10 space-y-6">
          {/* 1. Cabecera Fiscal Formal */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 pb-6 border-b border-slate-200">
            {/* Datos del Emisor */}
            <div className="space-y-2 max-w-md">
              <div className="flex items-center gap-3">
                <Image
                  src="/logo cilmax.png"
                  alt="Cilmax"
                  width={150}
                  height={38}
                  priority
                  className="h-9 w-auto object-contain"
                />
              </div>

              <div>
                <h1 className="text-base font-bold text-slate-900 tracking-tight uppercase">
                  {companyName}
                </h1>
                <div className="mt-1 text-xs text-slate-600 leading-relaxed font-normal space-y-0.5">
                  {companyNit && (
                    <div>
                      <span className="text-slate-500">NIT:</span>{' '}
                      <span className="font-mono font-medium text-slate-800">{companyNit}</span>
                    </div>
                  )}
                  <div>
                    {[companyAddress, companyCity].filter(Boolean).join(', ')}
                  </div>
                  <div>
                    <span className="text-slate-500">Tel:</span> {companyPhone}
                    {companyEmail && ` | Email: ${companyEmail}`}
                  </div>
                </div>
              </div>
            </div>

            {/* Recuadro de Identificación de Factura Electrónica */}
            <div className="sm:w-72 bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs space-y-2">
              <div className="border-b border-slate-200/80 pb-2">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Factura Electrónica de Venta
                </div>
                <div className="text-xl font-extrabold font-mono text-slate-900 mt-0.5">
                  No. {sale.invoiceNumber}
                </div>
              </div>

              <div className="space-y-1 text-slate-600">
                <div className="flex justify-between">
                  <span className="text-slate-400">Fecha de emisión:</span>
                  <span className="font-medium text-slate-800">{dateStr}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Hora:</span>
                  <span className="font-medium text-slate-800">{timeStr}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Forma de pago:</span>
                  <span className="font-medium text-slate-800">
                    {getPaymentMethodLabel(sale.paymentMethod)}
                  </span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-200/60">
                  <span className="text-slate-400">Estado:</span>
                  <span className="font-semibold text-slate-900">
                    {isPaidInFull ? 'Pagada' : 'Crédito Pendiente'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Datos del Adquiriente / Cliente & Operación */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border border-slate-200 rounded-xl p-4 bg-slate-50/40 text-xs">
            {/* Adquiriente */}
            <div className="space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Adquiriente / Cliente
              </div>
              {sale.client ? (
                <div className="space-y-0.5 text-slate-700">
                  <div className="text-sm font-bold text-slate-900">
                    {sale.client.name}
                  </div>
                  {sale.client.phone && (
                    <div>
                      <span className="text-slate-400">Teléfono:</span>{' '}
                      <span className="font-mono text-slate-800">{sale.client.phone}</span>
                    </div>
                  )}
                  {sale.client.email && (
                    <div>
                      <span className="text-slate-400">Email:</span> {sale.client.email}
                    </div>
                  )}
                  {sale.client.address && (
                    <div>
                      <span className="text-slate-400">Dirección:</span> {sale.client.address}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-slate-500 italic py-1">
                  Cliente general / Consumidor final
                </div>
              )}
            </div>

            {/* Operación */}
            <div className="sm:border-l sm:border-slate-200 sm:pl-4 space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Detalles de Operación
              </div>
              <div className="space-y-0.5 text-slate-700">
                <div>
                  <span className="text-slate-400">Atendido por:</span>{' '}
                  <span className="font-medium text-slate-800">
                    {sale.user?.name || 'Administración'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400">Moneda:</span>{' '}
                  <span className="font-mono font-medium text-slate-800">{currency}</span>
                </div>
                {isCredit && sale.dueDate && (
                  <div>
                    <span className="text-slate-400">Fecha Vencimiento:</span>{' '}
                    <span className="font-medium text-slate-800">
                      {new Date(sale.dueDate).toLocaleDateString('es-CO')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 3. Tabla de Productos */}
          <div className="border border-slate-200 rounded-xl overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs min-w-[500px] sm:min-w-0">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-3 w-10 text-center">#</th>
                  <th className="py-2.5 px-3">Descripción</th>
                  <th className="py-2.5 px-3 text-center w-20">Cant.</th>
                  <th className="py-2.5 px-3 text-right w-32">Precio Unit.</th>
                  <th className="py-2.5 px-3 text-right w-32">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {sale.items.map((item, index) => (
                  <tr key={item.id} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-3 text-center font-mono text-slate-400">
                      {index + 1}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-900">
                      {item.product.name}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-slate-700">
                      {item.quantity}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                      {formatCurrency(item.unitPrice, currency)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-medium text-slate-900">
                      {formatCurrency(item.total, currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 4. Resumen Financiero y Totales */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-6 pt-2">
            {/* Lado Izquierdo: Información de Crédito (si aplica) */}
            <div className="w-full sm:max-w-md">
              {isCredit ? (
                <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50 text-xs space-y-1.5">
                  <div className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                    Condiciones del Crédito
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Monto Abonado:</span>
                    <span className="font-mono font-medium text-slate-800">
                      {formatCurrency(totalPaid, currency)}
                    </span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-900 pt-1 border-t border-slate-200">
                    <span>Saldo Pendiente:</span>
                    <span className="font-mono text-slate-900">
                      {formatCurrency(pendingBalance, currency)}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-[11px] text-slate-500 leading-relaxed max-w-sm">
                  {invoiceFooter}
                </div>
              )}
            </div>

            {/* Lado Derecho: Totales Formales */}
            <div className="w-full sm:w-72 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600 px-1">
                <span>Subtotal</span>
                <span className="font-mono text-slate-800">
                  {formatCurrency(sale.subtotal, currency)}
                </span>
              </div>

              {sale.discount > 0 && (
                <div className="flex justify-between text-slate-600 px-1">
                  <span>Descuento</span>
                  <span className="font-mono text-slate-800">
                    -{formatCurrency(sale.discount, currency)}
                  </span>
                </div>
              )}

              {/* Total Formal: Sobrio, Elegante, Sin Colores Estridentes */}
              <div className="flex items-center justify-between p-3.5 mt-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900">
                <span className="font-bold uppercase tracking-wider text-xs">
                  Total a Pagar
                </span>
                <span className="font-mono text-xl font-bold tracking-tight text-slate-900">
                  {totalFormatted}
                </span>
              </div>
            </div>
          </div>

          {/* 5. Pie de Factura: Código QR y Datos de Verificación */}
          <div className="pt-5 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <div className="flex items-center gap-3">
              <div className="p-1.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 shrink-0">
                <QrCode className="h-9 w-9 text-slate-800" />
              </div>
              <div className="space-y-0.5">
                <div className="text-[11px] font-semibold text-slate-700">
                  Documento Fiscal Digital
                </div>
                <div className="text-[10px] text-slate-400 font-mono">
                  REF: #{sale.invoiceNumber} &bull; ID: {sale.id}
                </div>
              </div>
            </div>

            <div className="text-center sm:text-right space-y-0.5 text-[10px] text-slate-400">
              <div>Documento emitido electrónicamente &bull; {companyName}</div>
              <div>Representación gráfica de factura de venta</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
