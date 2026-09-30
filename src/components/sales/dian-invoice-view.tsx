'use client'

import React from 'react'
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
 * Criterio: documento de negocio, no página de producto. Estructura canónica
 * de una factura —emisor, importes clave, destinatario, detalle, forma de
 * pago, firmas y cierre fiscal— resuelta con reglas finas y aire. La
 * jerarquía la sostiene el peso tipográfico y el espacio, no los fondos ni la
 * iconografía.
 *
 * Bloques en `div`, nunca en `<header>` ni `<aside>`: la regla `@media print`
 * de globals.css oculta esos elementos para neutralizar el shell del
 * dashboard y se llevaría por delante el documento al imprimir.
 */
export function DianInvoiceView({ sale, className = '' }: DianInvoiceViewProps) {
  const companyName = sale.invoice?.companyName || 'Cilmax S.A.S.'
  const companyNit = sale.invoice?.companyNit || '901.482.391-4'
  const companyAddress = sale.invoice?.companyAddress || 'Calle Principal #10-24'
  const companyCity = sale.invoice?.companyCity || 'Bogotá D.C., Colombia'
  const companyPhone = sale.invoice?.companyPhone || '+57 (300) 000-0000'
  const companyEmail = sale.invoice?.companyEmail || 'contacto@cilmax.com'
  const currency = sale.invoice?.currency || 'COP'

  const fmtDate = (value: Date | string | null | undefined) => {
    if (!value) return '—'
    const date = new Date(value)
    return isNaN(date.getTime())
      ? '—'
      : date.toLocaleDateString('es-CO', { year: 'numeric', month: '2-digit', day: '2-digit' })
  }
  const fmtTime = (value: Date | string) => {
    const date = new Date(value)
    return isNaN(date.getTime())
      ? '—'
      : date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }

  const dateStr = fmtDate(sale.saleDate)
  const timeStr = fmtTime(sale.saleDate)

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
  const clientName = sale.client?.name || 'Consumidor Final'
  const isCancelled = sale.status === 'CANCELLED'

  return (
    <div className={`invoice-sheet bg-white text-slate-900 text-[10.5px] leading-[1.5] print:p-0 ${className}`}>
      <div className="p-8">
        {/* 1. Emisor y tipo de documento */}
        <div className="flex items-start justify-between gap-8">
          <div className="min-w-0">
            <h1 className="text-[19px] font-bold uppercase tracking-tight text-slate-950">{companyName}</h1>
            <div className="mt-1.5 text-slate-600 space-y-px">
              <div>{location}</div>
              <div>
                {companyPhone} &bull; {companyEmail}
              </div>
            </div>
          </div>

          <div className="text-right shrink-0">
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">Factura de venta</div>
            <div className="text-2xl font-bold tracking-tight text-slate-950 mt-1">{sale.invoiceNumber}</div>
            {isCancelled ? (
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mt-1">Anulada</div>
            ) : null}
          </div>
        </div>

        <div className="mt-4 text-slate-600">
          <span className="text-slate-500">NIT</span> <span className="font-medium text-slate-800">{companyNit}</span>
          <span className="text-slate-500"> &bull; Régimen ordinario &bull; Responsable de IVA</span>
        </div>

        <Rule />

        {/* 2. Importes y fechas clave */}
        <div className="grid grid-cols-4 gap-4">
          <KeyValue label="Total a pagar" value={formatCurrency(total, currency)} mono strong />
          <KeyValue label="Fecha de emisión" value={dateStr} mono />
          <KeyValue label="Vence" value={isCredit ? fmtDate(sale.dueDate) : '—'} mono />
          <KeyValue label="Emitida" value={timeStr} mono />
        </div>

        <Rule />

        {/* 3. Destinatario y contacto */}
        <div className="grid grid-cols-2 gap-8">
          <div>
            <SectionLabel>Facturar a</SectionLabel>
            <div className="font-semibold uppercase text-slate-950">{clientName}</div>
            {sale.client?.phone ? <div className="text-slate-600 mt-0.5">CC/NIT: {sale.client.phone}</div> : null}
            {sale.client?.address ? <div className="text-slate-600">{sale.client.address}</div> : null}
          </div>
          <div>
            <SectionLabel>Contacto</SectionLabel>
            <div className="text-slate-600">{sale.client?.phone || companyPhone}</div>
            {sale.client?.email ? <div className="text-slate-600">{sale.client.email}</div> : null}
            {sale.user?.name ? (
              <div className="text-slate-600">
                <span className="text-slate-500">Atendió</span> {sale.user.name}
              </div>
            ) : null}
          </div>
        </div>

        <Rule />

        {/* 4. Detalle */}
        <table className="w-full border-collapse">
          <thead>
            <tr className="text-[9px] uppercase tracking-[0.08em] text-slate-500">
              <th className="py-2 pr-3 font-semibold text-left w-6">#</th>
              <th className="py-2 pr-3 font-semibold text-left">Descripción de bienes o servicios</th>
              <th className="py-2 pr-3 font-semibold text-right w-20">Cant.</th>
              <th className="py-2 pr-3 font-semibold text-right w-24">V. unitario</th>
              <th className="py-2 pr-3 font-semibold text-right w-16">Desc.</th>
              <th className="py-2 pr-3 font-semibold text-right w-14">IVA</th>
              <th className="py-2 font-semibold text-right w-28">Total</th>
            </tr>
          </thead>
          <tbody>
            {sale.items.map((item, index) => (
              <tr key={item.id || index} className="align-top">
                <td className="py-2.5 pr-3 text-right font-mono text-slate-400">{index + 1}</td>
                <td className="py-2.5 pr-3 text-slate-900">
                  {item.product?.name}
                  {item.product?.barcode ? (
                    <div className="font-mono text-[9px] text-slate-400 mt-0.5">{item.product.barcode}</div>
                  ) : null}
                </td>
                <td className="py-2.5 pr-3 text-right font-mono text-slate-700">{Number(item.quantity).toFixed(2)}</td>
                <td className="py-2.5 pr-3 text-right font-mono text-slate-700">
                  {formatCurrency(item.unitPrice, currency)}
                </td>
                <td className="py-2.5 pr-3 text-right font-mono text-slate-400">0</td>
                <td className="py-2.5 pr-3 text-right font-mono text-slate-500">19%</td>
                <td className="py-2.5 text-right font-mono font-medium text-slate-900">
                  {formatCurrency(item.total, currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <Rule />

        {/* 5. Forma de pago, valor en letras y totales */}
        <div className="grid grid-cols-3 gap-6">
          <div>
            <SectionLabel>Forma de pago</SectionLabel>
            <div className="text-slate-800">{getPaymentMethodLabel(sale.paymentMethod)}</div>
            {creditStatus ? <div className="text-slate-600 mt-0.5">{getCreditStatusLabel(creditStatus)}</div> : null}
            {isCredit ? (
              <div className="text-slate-600 mt-0.5">
                Abonado <span className="font-mono">{formatCurrency(totalPaid, currency)}</span>
              </div>
            ) : null}
          </div>

          <div>
            <SectionLabel>En letras</SectionLabel>
            <div className="text-slate-800">
              <span className="uppercase">Son</span> {formatCurrencyInWords(total)}
            </div>
            {isCredit && pendingBalance > 0 ? (
              <div className="text-slate-500 mt-1 text-[9.5px]">Saldo: {formatCurrencyInWords(pendingBalance)}</div>
            ) : null}
          </div>

          <dl className="space-y-1">
            <TotalRow label="Subtotal" value={formatCurrency(subtotal, currency)} />
            {discount > 0 ? <TotalRow label="Descuento" value={`-${formatCurrency(discount, currency)}`} /> : null}
            <TotalRow label={`IVA (${(IVA_RATE * 100).toFixed(0)}%)`} value={formatCurrency(valorIva, currency)} />
            <div className="flex items-baseline justify-between gap-3 pt-1.5 mt-1.5 border-t-2 border-slate-900">
              <dt className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-950">Total</dt>
              <dd className="text-[15px] font-bold font-mono text-slate-950">{formatCurrency(total, currency)}</dd>
            </div>
          </dl>
        </div>

        <div className="mt-2 text-[9.5px] text-slate-500">
          IVA 19.00% &bull; Base gravable {formatCurrency(baseGravable, currency)} &bull; Impuesto{' '}
          {formatCurrency(valorIva, currency)} &bull; Moneda {currency}
        </div>

        <Rule />

        {/* 6. Firmas */}
        <div className="grid grid-cols-2 gap-8">
          <div>
            <SectionLabel>Aceptado por</SectionLabel>
            <div className="text-slate-800">{clientName}</div>
          </div>
          <div>
            <SectionLabel>Firma</SectionLabel>
            <div className="h-8 border-b border-slate-300" />
            <div className="text-[9.5px] text-slate-500 mt-1">{companyName}</div>
          </div>
        </div>

        <Rule />

        {/* 7. Cierre fiscal */}
        <div className="space-y-1 text-[9px] leading-[1.6] text-slate-500">
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
        </div>
      </div>
    </div>
  )
}

/** Regla horizontal fina: el separador por defecto de una factura. */
function Rule() {
  return <div className="my-4 h-px w-full bg-slate-900/15" />
}

/** Rótulo de sección en versalitas. */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="mb-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-500">{children}</div>
}

/** Par etiqueta/valor para las filas de importes clave. */
function KeyValue({ label, value, mono, strong }: { label: string; value: string; mono?: boolean; strong?: boolean }) {
  return (
    <div className="min-w-0">
      <div className="text-[9px] uppercase tracking-[0.1em] text-slate-500">{label}</div>
      <div
        className={`truncate ${mono ? 'font-mono' : ''} ${strong ? 'text-[12px] font-semibold text-slate-950' : 'text-slate-800'}`}
      >
        {value}
      </div>
    </div>
  )
}

/** Fila del bloque de totales. */
function TotalRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-mono text-slate-800">{value}</dd>
    </div>
  )
}
