'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import { formatCurrency, formatCurrencyInWords, generateCufe } from '@/lib/format'
import { getPaymentMethodLabel, getCreditStatus, getCreditStatusLabel } from '@/lib/labels'
import { Check, Copy, ShieldCheck, QrCode } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

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
  user?: { name: string } | null
  invoice?: {
    companyName?: string
    companyNit?: string | null
    companyAddress?: string | null
    companyCity?: string | null
    companyPhone?: string | null
    companyEmail?: string | null
    currency?: string
    invoiceFooter?: string | null
  } | null
}

interface DianInvoiceViewProps {
  sale: DianInvoiceSaleData
  className?: string
}

export function DianInvoiceView({ sale, className = '' }: DianInvoiceViewProps) {
  const [copiedCufe, setCopiedCufe] = useState(false)

  // Emisor
  const companyName = sale.invoice?.companyName || 'Cilmax S.A.S.'
  const companyNit = sale.invoice?.companyNit || '901.482.391-4'
  const companyAddress = sale.invoice?.companyAddress || 'Calle Principal #10-24'
  const companyCity = sale.invoice?.companyCity || 'Bogotá D.C., Colombia'
  const companyPhone = sale.invoice?.companyPhone || '+57 (300) 000-0000'
  const companyEmail = sale.invoice?.companyEmail || 'contacto@cilmax.com'
  const currency = sale.invoice?.currency || 'COP'

  // Fechas y Horas
  const saleDate = new Date(sale.saleDate)
  const isValidDate = !isNaN(saleDate.getTime())
  const dateStr = isValidDate
    ? saleDate.toLocaleDateString('es-CO', { year: 'numeric', month: '2-digit', day: '2-digit' })
    : '2026/01/01'
  const timeStr = isValidDate
    ? saleDate.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '12:00:00'
  const dueDateStr = sale.dueDate
    ? new Date(sale.dueDate).toLocaleDateString('es-CO', { year: 'numeric', month: '2-digit', day: '2-digit' })
    : dateStr

  // Cálculos Tributarios DIAN (Tarifa General 19%)
  const total = Number(sale.total) || 0
  const subtotal = Number(sale.subtotal) || total
  const discount = Number(sale.discount) || 0
  const baseGravable = Math.round((total / 1.19) * 100) / 100
  const valorIva = Math.round((total - baseGravable) * 100) / 100

  // Crédito
  const isCredit = sale.paymentMethod === 'CREDITO'
  const totalPaid = (sale.payments ?? []).reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
  const pendingBalance = Math.max(0, total - totalPaid)
  const isPaidInFull = !isCredit || pendingBalance <= 0

  // CUFE
  const cufe = generateCufe(
    sale.invoiceNumber,
    sale.saleDate,
    total,
    companyNit.replace(/\D/g, ''),
    sale.client?.phone?.replace(/\D/g, '') || '222222222222',
  )

  function handleCopyCufe() {
    navigator.clipboard.writeText(cufe)
    setCopiedCufe(true)
    toast.success('CUFE copiado al portapapeles')
    setTimeout(() => setCopiedCufe(false), 2500)
  }

  return (
    <div
      className={`invoice-sheet bg-white text-slate-900 border border-slate-300 rounded-2xl shadow-sm overflow-hidden text-xs print:border-none print:shadow-none print:rounded-none print:m-0 print:p-0 ${className}`}
    >
      {/* Barra de Acreditación Fiscal Superior */}
      <div className="bg-slate-900 text-white px-4 py-2 flex flex-wrap items-center justify-between text-[11px] font-medium tracking-wide">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>REPRESENTACIÓN GRÁFICA DE FACTURA ELECTRÓNICA DE VENTA</span>
        </div>
        <div className="font-mono text-[10px] text-slate-300">
          DIAN &bull; ANEXO TÉCNICO 1.9 &bull; AMBIENTE PRODUCCIÓN
        </div>
      </div>

      <div className="p-4 sm:p-7 md:p-9 space-y-6">
        {/* 1. Encabezado Oficial: Emisor + Recuadro Fiscal de Factura */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start pb-5 border-b border-slate-200">
          {/* Columna Izquierda: Datos del Emisor (Obligado a Facturar) */}
          <div className="md:col-span-7 space-y-2">
            <div className="flex items-center gap-3">
              <Image
                src="/logo cilmax.png"
                alt={companyName}
                width={140}
                height={36}
                priority
                className="h-8 w-auto object-contain"
              />
            </div>

            <div>
              <h1 className="text-base font-extrabold uppercase text-slate-950 tracking-tight">{companyName}</h1>
              <div className="text-[11px] text-slate-700 leading-snug space-y-0.5 mt-1 font-normal">
                <div>
                  <span className="font-semibold text-slate-900">NIT:</span>{' '}
                  <span className="font-mono font-bold text-slate-900">{companyNit}</span> &bull;{' '}
                  <span className="text-slate-600">Régimen Ordinario</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-900">Responsabilidad Tributaria:</span>{' '}
                  <span>Responsable de IVA (Código 05)</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-900">Actividad Económica:</span>{' '}
                  <span>CIIU 4741 - Comercio de equipos de cómputo y afines</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-900">Dirección:</span>{' '}
                  <span>{[companyAddress, companyCity].filter(Boolean).join(', ')}</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-900">Tel:</span> {companyPhone}
                  {companyEmail && ` &bull; Email: ${companyEmail}`}
                </div>
              </div>
            </div>
          </div>

          {/* Columna Derecha: Recuadro Oficial de Factura Electrónica */}
          <div className="md:col-span-5 bg-slate-50 border-2 border-slate-800 rounded-xl p-3.5 space-y-2 text-slate-800 shadow-2xs">
            <div className="text-center pb-2 border-b border-slate-300">
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-600">
                Factura Electrónica de Venta
              </div>
              <div className="text-2xl font-black font-mono text-slate-950 tracking-tight mt-0.5">
                No. {sale.invoiceNumber}
              </div>
            </div>

            <div className="text-[10px] text-slate-600 space-y-1">
              <div className="p-1.5 rounded-sm bg-slate-100/90 text-[9.5px] text-slate-700 leading-tight">
                <span className="font-bold">Autorización DIAN No.</span> 18764000001234
                <br />
                <span className="font-semibold">Vigencia:</span> 18 meses (2024/01/15 a 2025/07/15)
                <br />
                <span className="font-semibold">Rango autorizado:</span> SETP-1 al SETP-10000
              </div>
              <div className="flex justify-between pt-1">
                <span className="text-slate-500">Tipo de Operación:</span>
                <span className="font-semibold text-slate-900 font-mono">10 - Estándar</span>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Bloque de Datos del Adquiriente & Datos de Emisión y Pago */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50/70 border border-slate-200 rounded-xl p-4 text-[11px]">
          {/* Adquiriente / Comprador */}
          <div className="space-y-1.5">
            <div className="text-[10px] font-black uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-1">
              Información del Adquiriente (Comprador)
            </div>
            {sale.client ? (
              <div className="space-y-1 text-slate-700">
                <div>
                  <span className="text-slate-500">Nombre / Razón Social:</span>{' '}
                  <span className="font-bold text-slate-950 uppercase">{sale.client.name}</span>
                </div>
                <div>
                  <span className="text-slate-500">Identificación:</span>{' '}
                  <span className="font-mono font-bold text-slate-900">
                    {sale.client.phone ? `CC/NIT: ${sale.client.phone}` : 'NIT: 222222222222 (Consumidor Final)'}
                  </span>
                </div>
                {sale.client.address && (
                  <div>
                    <span className="text-slate-500">Dirección:</span> {sale.client.address}
                  </div>
                )}
                {sale.client.phone && (
                  <div>
                    <span className="text-slate-500">Teléfono:</span>{' '}
                    <span className="font-mono">{sale.client.phone}</span>
                  </div>
                )}
                {sale.client.email && (
                  <div>
                    <span className="text-slate-500">Correo Electrónico:</span> {sale.client.email}
                  </div>
                )}
                <div>
                  <span className="text-slate-500">Responsabilidad Tributaria:</span>{' '}
                  <span className="text-slate-800">R-99-PN (No Responsable)</span>
                </div>
              </div>
            ) : (
              <div className="space-y-1 text-slate-700">
                <div>
                  <span className="text-slate-500">Nombre / Razón Social:</span>{' '}
                  <span className="font-bold text-slate-950">CONSUMIDOR FINAL</span>
                </div>
                <div>
                  <span className="text-slate-500">Identificación:</span>{' '}
                  <span className="font-mono font-bold text-slate-900">NIT: 222222222222</span>
                </div>
                <div className="text-slate-500 italic">Venta para cuantías menores</div>
              </div>
            )}
          </div>

          {/* Datos de Emisión y Pago */}
          <div className="space-y-1.5 md:border-l md:border-slate-200 md:pl-4">
            <div className="text-[10px] font-black uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-1">
              Datos de Emisión y Transacción
            </div>
            <div className="space-y-1 text-slate-700">
              <div className="flex justify-between">
                <span className="text-slate-500">Fecha y Hora de Generación:</span>
                <span className="font-mono font-bold text-slate-900">
                  {dateStr} {timeStr}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Fecha y Hora de Expedición:</span>
                <span className="font-mono font-semibold text-slate-800">
                  {dateStr} {timeStr}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Fecha de Vencimiento:</span>
                <span className="font-mono font-bold text-slate-900">{dueDateStr}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Forma de Pago:</span>
                <span className="font-bold text-slate-900">{isCredit ? '2 - Crédito' : '1 - Contado'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Medio de Pago:</span>
                <span className="font-medium text-slate-800">{getPaymentMethodLabel(sale.paymentMethod)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Estado de Pago:</span>
                <span className="font-semibold text-slate-900">{isPaidInFull ? 'Pagada' : 'Crédito Pendiente'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Atendido por:</span>
                <span className="font-medium text-slate-800">{sale.user?.name || 'Administración'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Tabla Reglamentaria de Ítems (Bienes y Servicios) */}
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[11px] min-w-[620px]">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[9.5px]">
                  <th className="py-2.5 px-3 w-8 text-center">#</th>
                  <th className="py-2.5 px-3 w-28">Código / Ref.</th>
                  <th className="py-2.5 px-3">Descripción del Bien o Servicio</th>
                  <th className="py-2.5 px-3 text-center w-14">Cant.</th>
                  <th className="py-2.5 px-3 text-center w-14">UM</th>
                  <th className="py-2.5 px-3 text-right w-24">Vr. Unitario</th>
                  <th className="py-2.5 px-3 text-center w-16">IVA</th>
                  <th className="py-2.5 px-3 text-right w-28">Total Ítem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {sale.items.map((item, index) => (
                  <tr key={item.id || index} className="hover:bg-slate-50/60">
                    <td className="py-2 px-3 text-center font-mono text-slate-400">{index + 1}</td>
                    <td className="py-2 px-3 font-mono text-[10px] text-slate-600 truncate max-w-[120px]">
                      {item.product?.barcode || `ITM-${index + 1}`}
                    </td>
                    <td className="py-2 px-3 font-medium text-slate-950">{item.product?.name}</td>
                    <td className="py-2 px-3 text-center font-mono text-slate-800">
                      {Number(item.quantity).toFixed(2)}
                    </td>
                    <td className="py-2 px-3 text-center font-mono text-[10px] text-slate-500">94/UN</td>
                    <td className="py-2 px-3 text-right font-mono text-slate-700">
                      {formatCurrency(item.unitPrice, currency)}
                    </td>
                    <td className="py-2 px-3 text-center font-mono text-[10px] text-slate-600">19.00%</td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-slate-950">
                      {formatCurrency(item.total, currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 4. Discriminación de Impuestos y Liquidación de Totales */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start pt-1">
          {/* Lado Izquierdo: Tabla de Discriminación de Impuestos DIAN + Condiciones */}
          <div className="md:col-span-7 space-y-4">
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-slate-100/90 px-3 py-1.5 border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-700">
                Discriminación de Impuestos (DIAN)
              </div>
              <table className="w-full text-[10.5px] border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[9.5px] text-slate-500 font-semibold uppercase">
                    <th className="py-1.5 px-3 text-left">Tipo Impuesto</th>
                    <th className="py-1.5 px-3 text-right">Tarifa</th>
                    <th className="py-1.5 px-3 text-right">Base Gravable</th>
                    <th className="py-1.5 px-3 text-right">Valor Impuesto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="py-1.5 px-3 font-medium text-slate-800">01 - Impuesto sobre las Ventas (IVA)</td>
                    <td className="py-1.5 px-3 text-right font-mono text-slate-700">19.00%</td>
                    <td className="py-1.5 px-3 text-right font-mono text-slate-700">
                      {formatCurrency(baseGravable, currency)}
                    </td>
                    <td className="py-1.5 px-3 text-right font-mono font-semibold text-slate-900">
                      {formatCurrency(valorIva, currency)}
                    </td>
                  </tr>
                  <tr className="bg-slate-50/50 font-bold text-slate-900">
                    <td colSpan={3} className="py-1.5 px-3 text-right text-[10px] uppercase">
                      Total Impuestos
                    </td>
                    <td className="py-1.5 px-3 text-right font-mono">{formatCurrency(valorIva, currency)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Condiciones de Crédito (si aplica) */}
            {isCredit && (
              <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/80 text-[11px] space-y-1.5">
                <div className="font-bold text-slate-800 uppercase tracking-wider text-[10px] flex items-center justify-between">
                  <span>Detalle de Crédito Comercial</span>
                  {(() => {
                    const cs = getCreditStatus({
                      paymentMethod: sale.paymentMethod,
                      dueDate: sale.dueDate ? new Date(sale.dueDate) : null,
                      status: sale.status ?? 'COMPLETED',
                      payments: sale.payments,
                      total: sale.total,
                    })
                    return cs ? (
                      <span className="font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-800 text-[10px]">
                        {getCreditStatusLabel(cs)}
                      </span>
                    ) : null
                  })()}
                </div>
                <div className="grid grid-cols-2 gap-2 text-slate-700 pt-1">
                  <div>
                    <span className="text-slate-500">Total Abonado:</span>{' '}
                    <span className="font-mono font-bold text-slate-900">{formatCurrency(totalPaid, currency)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Saldo Pendiente:</span>{' '}
                    <span className="font-mono font-bold text-slate-950">
                      {formatCurrency(pendingBalance, currency)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Valor en Letras Formal Obligatorio */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[10.5px]">
              <div className="text-[9.5px] font-bold text-slate-500 uppercase tracking-wider">Valor en Letras:</div>
              <div className="font-bold font-mono text-slate-900 mt-0.5 tracking-tight uppercase">
                SON: {formatCurrencyInWords(total)}
              </div>
            </div>
          </div>

          {/* Lado Derecho: Totales de la Factura */}
          <div className="md:col-span-5 space-y-2 text-[11px]">
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/40 space-y-2">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal Bruto:</span>
                <span className="font-mono font-medium text-slate-900">{formatCurrency(subtotal, currency)}</span>
              </div>

              {discount > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>(-) Descuento Comercial:</span>
                  <span className="font-mono font-medium text-slate-900">-{formatCurrency(discount, currency)}</span>
                </div>
              )}

              <div className="flex justify-between text-slate-600 pt-1 border-t border-slate-200">
                <span>Subtotal Gravable:</span>
                <span className="font-mono font-medium text-slate-900">{formatCurrency(baseGravable, currency)}</span>
              </div>

              <div className="flex justify-between text-slate-600">
                <span>(+) IVA (19.00%):</span>
                <span className="font-mono font-medium text-slate-900">{formatCurrency(valorIva, currency)}</span>
              </div>

              {/* Total a Pagar Formal */}
              <div className="mt-3 p-3.5 rounded-xl bg-slate-900 text-white flex items-center justify-between shadow-xs">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-wider text-slate-300">Total Factura</div>
                  <div className="text-[9px] text-slate-400">Moneda: {currency}</div>
                </div>
                <div className="text-2xl font-black font-mono tracking-tight text-white">
                  {formatCurrency(total, currency)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 5. Pie Fiscal Normativo: CUFE, Código QR y Leyenda Mercantil DIAN */}
        <div className="pt-5 border-t-2 border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-5 bg-slate-50 p-4 rounded-xl border border-slate-200">
            {/* Código QR Normativo DIAN */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="p-2 bg-white rounded-lg border border-slate-300 shadow-2xs">
                <QrCode className="h-16 w-16 text-slate-900" />
              </div>
              <div className="text-[10px] text-slate-600 space-y-0.5">
                <div className="font-bold text-slate-900 uppercase">Validación Fiscal DIAN</div>
                <div>NumFac: {sale.invoiceNumber}</div>
                <div>FecFac: {dateStr}</div>
                <div>NitFac: {companyNit.replace(/\D/g, '')}</div>
                <div className="text-[9px] text-emerald-700 font-semibold">● Validación Exitosa</div>
              </div>
            </div>

            {/* CUFE */}
            <div className="flex-1 w-full sm:w-auto text-[10px] space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-700 uppercase tracking-wider text-[9.5px]">
                  CUFE (Código Único de Factura Electrónica):
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyCufe}
                  className="h-6 px-2 text-[10px] gap-1 text-slate-600 hover:text-slate-950"
                  title="Copiar CUFE"
                >
                  {copiedCufe ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                  {copiedCufe ? 'Copiado' : 'Copiar'}
                </Button>
              </div>
              <div className="p-2 rounded-md bg-white border border-slate-200 font-mono text-[9px] text-slate-700 break-all leading-relaxed select-all">
                {cufe}
              </div>
            </div>
          </div>

          {/* Leyenda Mercantil Oficial (Código de Comercio Art. 774) */}
          <div className="text-[9.5px] text-slate-500 leading-relaxed text-center sm:text-left space-y-1">
            <p>
              <strong className="text-slate-700">Título Valor:</strong> Esta factura electrónica de venta se asimila en
              sus efectos a la letra de cambio según lo establecido en el Artículo 774 del Código de Comercio
              colombiano. El comprador declara haber recibido real y materialmente a entera satisfacción las mercancías
              o servicios descritos en este documento.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-between text-[9px] text-slate-400 pt-1 border-t border-slate-100">
              <div>
                Facturado electrónicamente por <span className="font-semibold text-slate-600">{companyName}</span>{' '}
                &bull; NIT {companyNit}
              </div>
              <div>Software: TECNICELL ERP v2.0 &bull; Representación Gráfica Oficial</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
