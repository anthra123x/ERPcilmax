'use client'

import React from 'react'
import Image from 'next/image'
import { formatCurrency, formatCurrencyInWords, generateCufe } from '@/lib/format'
import { getPaymentMethodLabel, getCreditStatus, getCreditStatusLabel } from '@/lib/labels'

export interface DianInvoiceSaleData {
  id: string
  invoiceNumber: string
  subtotal: number
  discount: number
  total: number
  paymentMethod: string
  status?: string
  saleDate: Date | string
  dueDate?: Date | string | null
  client?: {
    id?: string
    name: string
    phone?: string | null
    email?: string | null
    address?: string | null
  } | null
  items: Array<{
    id?: string
    quantity: number
    unitPrice: number
    total: number
    product: {
      id?: string
      name: string
      barcode?: string | null
    }
  }>
  payments?: Array<{
    amount: number
    paymentDate?: Date | string
    paymentMethod?: string
  }>
  installments?: Array<{
    amount: number
    dueDate: Date | string
  }>
  user?: { name?: string | null } | null
  invoice?: {
    companyName?: string | null
    companyNit?: string | null
    companyAddress?: string | null
    companyCity?: string | null
    companyPhone?: string | null
    companyEmail?: string | null
    currency?: string | null
    invoiceFooter?: string | null
  } | null
}

interface DianInvoiceViewProps {
  sale: DianInvoiceSaleData
  className?: string
}

/** Tarifa general de IVA vigente en Colombia. */
const IVA_RATE = 0.19

/**
 * Representación gráfica de factura electrónica de venta.
 *
 * Criterio de diseño: documento de negocio, no página de producto. La
 * jerarquía es la de cualquier factura —emisor, comprador, detalle,
 * totales, condiciones— resuelta con reglas finas y espacio en blanco. No hay
 * banners, cajas oscuras, iconografía ni cromo de interfaz: todo lo que se
 * imprime debe dinerse por su peso tipográfico, no por su color de fondo.
 */
export function DianInvoiceView({ sale, className = '' }: DianInvoiceViewProps) {
  const companyName = sale.invoice?.companyName || 'Cilmax S.A.S.'
  const companyNit = sale.invoice?.companyNit || '901.482.391-4'
  const companyAddress = sale.invoice?.companyAddress || 'Calle Principal #10-24'
  const companyCity = sale.invoice?.companyCity || 'Bogotá D.C., Colombia'
  const companyPhone = sale.invoice?.companyPhone || '+57 (300) 000-0000'
  const companyEmail = sale.invoice?.companyEmail || 'contacto@cilmax.com'
  const currency = sale.invoice?.currency || 'COP'

  const saleDate = new Date(sale.saleDate)
  const isValidDate = !isNaN(saleDate.getTime())
  const formatDate = (value: Date | string) => {
    const date = new Date(value)
    return isNaN(date.getTime())
      ? '—'
      : date.toLocaleDateString('es-CO', { year: 'numeric', month: '2-digit', day: '2-digit' })
  }
  const formatTime = (value: Date | string) => {
    const date = new Date(value)
    return isNaN(date.getTime())
      ? '—'
      : date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }

  const dateStr = isValidDate ? formatDate(saleDate) : '—'
  const timeStr = isValidDate ? formatTime(saleDate) : '—'
  const dueDateStr = sale.dueDate ? formatDate(sale.dueDate) : dateStr

  const total = Number(sale.total) || 0
  const subtotal = Number(sale.subtotal) || total
  const discount = Number(sale.discount) || 0
  const baseGravable = Math.round((total / (1 + IVA_RATE)) * 100) / 100
  const valorIva = Math.round((total - baseGravable) * 100) / 100

  const isCredit = sale.paymentMethod === 'CREDITO'
  const totalPaid = (sale.payments ?? []).reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
  const pendingBalance = Math.max(0, total - totalPaid)

  const creditStatus = isCredit
    ? getCreditStatus({
        paymentMethod: sale.paymentMethod,
        dueDate: sale.dueDate ? new Date(sale.dueDate) : null,
        status: sale.status ?? 'COMPLETED',
        payments: sale.payments,
        total: sale.total,
      })
    : null

  const cufe = generateCufe(
    sale.invoiceNumber,
    sale.saleDate,
    total,
    companyNit.replace(/\D/g, ''),
    sale.client?.phone?.replace(/\D/g, '') || '222222222222',
  )

  const location = [companyAddress, companyCity].filter(Boolean).join(', ')
  const isCancelled = sale.status === 'CANCELLED'

  return (
    <div className={`invoice-sheet bg-white text-slate-900 text-[11px] leading-[1.5] print:p-0 ${className}`}>
      <div className="p-7 sm:p-9 space-y-7">
        {/* 1. Emisor e identificación del documento */}
        <header className="flex items-start justify-between gap-8 pb-5 border-b border-slate-300">
          <div className="flex items-start gap-4 min-w-0">
            <Image
              src="/logo cilmax-print.png"
              alt={companyName}
              width={120}
              height={30}
              className="h-7 w-auto object-contain shrink-0 mt-0.5"
            />
            <div className="min-w-0">
              <h1 className="text-[13px] font-bold uppercase tracking-wide text-slate-950">{companyName}</h1>
              <dl className="mt-1.5 text-[10px] text-slate-600 space-y-px">
                <div>
                  <span className="text-slate-500">NIT</span>{' '}
                  <span className="font-mono font-medium text-slate-800">{companyNit}</span>
                  <span className="text-slate-500"> · Régimen ordinario · Responsable de IVA</span>
                </div>
                <div>{location}</div>
                <div>
                  {companyPhone}
                  {companyEmail ? <span className="text-slate-500"> · {companyEmail}</span> : null}
                </div>
              </dl>
            </div>
          </div>

          <div className="text-right shrink-0">
            <div className="text-[9px] uppercase tracking-[0.14em] text-slate-500">Factura de venta</div>
            <div className="text-xl font-bold font-mono tracking-tight text-slate-950 mt-1">{sale.invoiceNumber}</div>
            <div className="text-[10px] text-slate-600 mt-1.5">
              {dateStr} · {timeStr}
            </div>
            {isCancelled ? (
              <div className="text-[9px] uppercase tracking-wider font-semibold text-slate-500 mt-1">
                Documento anulado
              </div>
            ) : null}
          </div>
        </header>

        {/* 2. Comprador y condiciones de la venta */}
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-5">
          <div>
            <h2 className="text-[9px] uppercase tracking-[0.14em] text-slate-500 pb-1.5 mb-2 border-b border-slate-200">
              Facturar a
            </h2>
            {sale.client ? (
              <dl className="space-y-px text-[10.5px]">
                <div className="text-[11.5px] font-semibold text-slate-950 uppercase">{sale.client.name}</div>
                {sale.client.phone ? (
                  <div className="text-slate-600">
                    <span className="text-slate-500">CC/NIT</span>{' '}
                    <span className="font-mono">{sale.client.phone}</span>
                  </div>
                ) : null}
                {sale.client.address ? (
                  <div className="text-slate-600">
                    <span className="text-slate-500">Dirección</span> {sale.client.address}
                  </div>
                ) : null}
                {sale.client.email ? (
                  <div className="text-slate-600">
                    <span className="text-slate-500">Correo</span> {sale.client.email}
                  </div>
                ) : null}
              </dl>
            ) : (
              <dl className="space-y-px text-[10.5px]">
                <div className="text-[11.5px] font-semibold text-slate-950 uppercase">Consumidor final</div>
                <div className="text-slate-600">
                  <span className="text-slate-500">Identificación</span> <span className="font-mono">222222222222</span>
                </div>
              </dl>
            )}
          </div>

          <div>
            <h2 className="text-[9px] uppercase tracking-[0.14em] text-slate-500 pb-1.5 mb-2 border-b border-slate-200">
              Condiciones
            </h2>
            <dl className="space-y-px text-[10.5px]">
              <Row label="Fecha de emisión" value={`${dateStr} · ${timeStr}`} mono />
              {isCredit ? <Row label="Fecha de vencimiento" value={dueDateStr} mono /> : null}
              <Row
                label="Forma de pago"
                value={`${isCredit ? 'Crédito' : 'Contado'} · ${getPaymentMethodLabel(sale.paymentMethod)}`}
              />
              {creditStatus ? <Row label="Estado del crédito" value={getCreditStatusLabel(creditStatus)} /> : null}
              {sale.user?.name ? <Row label="Atendió" value={sale.user.name} /> : null}
            </dl>
          </div>
        </section>

        {/* 3. Detalle de la venta */}
        <section>
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-slate-400 text-[9px] uppercase tracking-[0.1em] text-slate-500">
                <th className="py-2 pr-3 font-medium text-left w-8">#</th>
                <th className="py-2 pr-3 font-medium text-left w-24">Código</th>
                <th className="py-2 pr-3 font-medium text-left">Descripción</th>
                <th className="py-2 pr-3 font-medium text-right w-16">Cant.</th>
                <th className="py-2 pr-3 font-medium text-right w-24">V. unitario</th>
                <th className="py-2 pr-3 font-medium text-right w-16">IVA</th>
                <th className="py-2 font-medium text-right w-28">Total</th>
              </tr>
            </thead>
            <tbody>
              {sale.items.map((item, index) => (
                <tr key={item.id || index} className="border-b border-slate-100 align-top">
                  <td className="py-2 pr-3 text-right font-mono text-[10px] text-slate-400">{index + 1}</td>
                  <td className="py-2 pr-3 font-mono text-[10px] text-slate-500 break-all">
                    {item.product?.barcode || '—'}
                  </td>
                  <td className="py-2 pr-3 text-slate-900">{item.product?.name}</td>
                  <td className="py-2 pr-3 text-right font-mono text-slate-700">{Number(item.quantity).toFixed(2)}</td>
                  <td className="py-2 pr-3 text-right font-mono text-slate-700">
                    {formatCurrency(item.unitPrice, currency)}
                  </td>
                  <td className="py-2 pr-3 text-right font-mono text-[10px] text-slate-500">19%</td>
                  <td className="py-2 text-right font-mono font-medium text-slate-900">
                    {formatCurrency(item.total, currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* 4. Totales y valor en letras */}
        <section className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
          <div className="space-y-3 sm:max-w-[58%]">
            <div>
              <div className="text-[9px] uppercase tracking-[0.14em] text-slate-500">Valor en letras</div>
              <div className="text-[10.5px] text-slate-800 mt-0.5">
                <span className="uppercase">Son</span> {formatCurrencyInWords(total)}
              </div>
            </div>

            {isCredit ? (
              <div className="text-[10px] text-slate-600 space-y-px">
                <Row label="Total abonado" value={formatCurrency(totalPaid, currency)} mono />
                <Row label="Saldo pendiente" value={formatCurrency(pendingBalance, currency)} mono emphasis />
                <div className="text-slate-500 pt-0.5">Saldo en letras: {formatCurrencyInWords(pendingBalance)}</div>
              </div>
            ) : null}

            <div className="text-[9.5px] text-slate-500">
              IVA ({formatPercent(IVA_RATE)}) · Base gravable {formatCurrency(baseGravable, currency)} · Impuesto{' '}
              {formatCurrency(valorIva, currency)}
            </div>
          </div>

          <dl className="sm:w-64 shrink-0 space-y-1.5 text-[11px]">
            <Row label="Subtotal" value={formatCurrency(subtotal, currency)} mono />
            {discount > 0 ? <Row label="Descuento" value={`-${formatCurrency(discount, currency)}`} mono /> : null}
            <Row label="IVA (19%)" value={formatCurrency(valorIva, currency)} mono />
            <div className="flex items-baseline justify-between gap-4 pt-2 mt-2 border-t-2 border-slate-800">
              <dt className="text-[10px] uppercase tracking-[0.12em] font-semibold text-slate-950">Total</dt>
              <dd className="text-[15px] font-bold font-mono text-slate-950">{formatCurrency(total, currency)}</dd>
            </div>
            <div className="text-right text-[9.5px] text-slate-500">Moneda: {currency}</div>
          </dl>
        </section>

        {/* 5. Pie fiscal: lo que exige la norma, en el menor espacio posible */}
        <footer className="pt-4 border-t border-slate-300 space-y-1.5 text-[9px] leading-[1.6] text-slate-500">
          <div>
            <span className="uppercase tracking-[0.1em] text-slate-600">CUFE</span>{' '}
            <span className="font-mono text-slate-700 break-all select-all">{cufe}</span>
          </div>
          <div>
            Documento electrónico de venta. Resolución DIAN No. 18764000001234 del 15/01/2024, rango SETP-1 a
            SETP-10000. Emitido el {dateStr} a las {timeStr} (America/Bogotá).
          </div>
          <div>
            Esta factura de venta se asimila en sus efectos a la letra de cambio según el Art. 774 del Código de
            Comercio. El comprador declara recibir a entera satisfacción los bienes o servicios descritos.
          </div>
          {sale.invoice?.invoiceFooter ? <div>{sale.invoice.invoiceFooter}</div> : null}
        </footer>
      </div>
    </div>
  )
}

/** Par etiqueta/valor de una sola línea. */
function Row({ label, value, mono, emphasis }: { label: string; value: string; mono?: boolean; emphasis?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-slate-500 shrink-0">{label}</dt>
      <dd
        className={`text-right ${mono ? 'font-mono' : ''} ${emphasis ? 'font-semibold text-slate-900' : 'text-slate-800'}`}
      >
        {value}
      </dd>
    </div>
  )
}

function formatPercent(rate: number) {
  return `${(rate * 100).toFixed(2)}%`
}
