'use client'

import React, { useEffect, useState, useRef } from 'react'
import {
  X,
  Printer,
  Download,
  Share2,
  Copy,
  Check,
  Receipt,
  Clock,
  User,
  CreditCard,
  DollarSign,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { DianInvoiceView, type DianInvoiceSaleData } from './dian-invoice-view'
import { getSaleById } from '@/modules/sales/sales.actions'
import { formatCurrency } from '@/lib/format'
import { getPaymentMethodLabel, getCreditStatus, getCreditStatusLabel, getCreditStatusColor } from '@/lib/labels'
import { toast } from 'sonner'

interface InvoiceSidePanelProps {
  saleId: string | null
  onClose: () => void
}

export function InvoiceSidePanel({ saleId, onClose }: InvoiceSidePanelProps) {
  const [sale, setSale] = useState<DianInvoiceSaleData | null>(null)
  const [loading, setLoading] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  // Cargar información de la venta cuando cambia el saleId
  useEffect(() => {
    if (!saleId) {
      return
    }

    let isMounted = true
    queueMicrotask(() => {
      if (isMounted) setLoading(true)
    })

    getSaleById(saleId)
      .then((data) => {
        if (!isMounted) return
        if (data) {
          setSale(data as unknown as DianInvoiceSaleData)
        } else {
          toast.error('No se pudo encontrar la factura')
          onClose()
        }
      })
      .catch((err) => {
        if (!isMounted) return
        console.error('Error al cargar la factura en el panel lateral:', err)
        toast.error('Error al cargar la factura')
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [saleId, onClose])

  // Desplazar suavemente a la vista en dispositivos pequeños
  useEffect(() => {
    if (saleId && panelRef.current && window.innerWidth < 1024) {
      panelRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [saleId])

  if (!saleId) return null

  function handleCopyLink() {
    if (!sale) return
    const url = `${window.location.origin}/sales/${sale.id}/invoice`
    navigator.clipboard.writeText(url)
    setCopiedLink(true)
    toast.success('Enlace de la factura copiado al portapapeles')
    setTimeout(() => setCopiedLink(false), 2500)
  }

  function handleWhatsAppShare() {
    if (!sale) return
    const company = sale.invoice?.companyName || 'Cilmax'
    const clientName = sale.client?.name || 'Estimado cliente'
    const totalFmt = formatCurrency(sale.total)
    const url = `${window.location.origin}/sales/${sale.id}/invoice`

    const message = `Hola *${clientName}*, te compartimos tu Factura Electrónica de Venta de *${company}*:\n\n📄 *Factura:* #${sale.invoiceNumber}\n💰 *Total:* ${totalFmt}\n📅 *Fecha:* ${new Date(sale.saleDate).toLocaleDateString('es-CO')}\n\nPuedes consultar o descargar el documento fiscal aquí:\n${url}\n\n¡Gracias por tu compra!`

    const cleanPhone = sale.client?.phone ? sale.client.phone.replace(/\D/g, '') : ''
    const waUrl = cleanPhone
      ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`

    window.open(waUrl, '_blank')
  }

  function handlePrintInvoice() {
    if (!sale) return

    const invoiceEl = document.getElementById('dian-invoice-printable')
    if (!invoiceEl) {
      window.print()
      return
    }

    try {
      const printFrame = document.createElement('iframe')
      printFrame.style.position = 'fixed'
      printFrame.style.right = '0'
      printFrame.style.bottom = '0'
      printFrame.style.width = '0'
      printFrame.style.height = '0'
      printFrame.style.border = '0'
      document.body.appendChild(printFrame)

      const doc = printFrame.contentWindow?.document
      if (!doc) {
        window.print()
        return
      }

      const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
        .map((s) => s.outerHTML)
        .join('\n')

      doc.open()
      doc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8" />
            <title>Factura Electrónica ${sale.invoiceNumber}</title>
            ${styles}
            <style>
              body { background: white !important; padding: 10px; font-family: system-ui, sans-serif; }
              .invoice-sheet { border: none !important; box-shadow: none !important; border-radius: 0 !important; width: 100% !important; max-width: 100% !important; }
              @page { margin: 8mm; size: A4; }
            </style>
          </head>
          <body>
            ${invoiceEl.outerHTML}
          </body>
        </html>
      `)
      doc.close()

      setTimeout(() => {
        printFrame.contentWindow?.focus()
        printFrame.contentWindow?.print()
        setTimeout(() => {
          if (document.body.contains(printFrame)) {
            document.body.removeChild(printFrame)
          }
        }, 1500)
      }, 350)
    } catch {
      window.print()
    }
  }

  const isCredit = sale?.paymentMethod === 'CREDITO'
  const totalPaid = (sale?.payments ?? []).reduce((s, p) => s + (Number(p.amount) || 0), 0)
  const pendingBalance = sale ? Math.max(0, sale.total - totalPaid) : 0

  return (
    <div
      ref={panelRef}
      className="w-full bg-slate-50 dark:bg-slate-900 border border-border rounded-2xl shadow-xl flex flex-col overflow-hidden lg:sticky lg:top-4 lg:max-h-[calc(100vh-6rem)] transition-all duration-300 animate-in fade-in slide-in-from-right-4"
    >
      {/* Header Superior del Panel Lateral */}
      <div className="px-4 sm:px-5 py-3.5 bg-background border-b border-border flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
            <Receipt className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm sm:text-base font-bold text-foreground truncate">
                {loading ? <Skeleton className="h-5 w-28" /> : `Factura #${sale?.invoiceNumber || ''}`}
              </h2>
              <Badge
                variant="outline"
                className="text-[9.5px] uppercase font-bold tracking-wider bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 py-0.5"
              >
                Estándar DIAN
              </Badge>
              {sale && (
                <Badge
                  variant={sale.status === 'COMPLETED' ? 'default' : 'destructive'}
                  className="text-[9.5px] py-0.5"
                >
                  {sale.status === 'COMPLETED' ? 'Completada' : 'Anulada'}
                </Badge>
              )}
              {sale &&
                isCredit &&
                (() => {
                  const cs = getCreditStatus({
                    paymentMethod: sale.paymentMethod,
                    dueDate: sale.dueDate ? new Date(sale.dueDate) : null,
                    status: sale.status || 'COMPLETED',
                    payments: sale.payments,
                    total: sale.total,
                  })
                  return cs ? (
                    <Badge variant="outline" className={`text-[9.5px] py-0.5 ${getCreditStatusColor(cs)}`}>
                      {getCreditStatusLabel(cs)}
                    </Badge>
                  ) : null
                })()}
            </div>
            <p className="text-[11px] text-muted-foreground truncate mt-0.5">
              {loading
                ? 'Cargando factura...'
                : `Cliente: ${sale?.client?.name || 'Consumidor Final'} • Fecha: ${new Date(sale?.saleDate || '').toLocaleDateString('es-CO')}`}
            </p>
          </div>
        </div>

        {/* Acciones del Encabezado (Sin el botón ExternalLink) */}
        <div className="flex items-center gap-1.5 shrink-0">
          {sale && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrintInvoice}
                className="h-8 gap-1 text-xs rounded-xl hidden sm:inline-flex cursor-pointer"
                title="Imprimir Factura"
              >
                <Printer className="h-3.5 w-3.5" />
                <span className="hidden xl:inline">Imprimir</span>
              </Button>

              <a href={`/api/sales/${sale.id}/pdf`} target="_blank" rel="noopener noreferrer">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1 text-xs rounded-xl cursor-pointer"
                  title="Descargar PDF"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span className="hidden xl:inline">PDF</span>
                </Button>
              </a>

              <Button
                variant="outline"
                size="sm"
                onClick={handleWhatsAppShare}
                className="h-8 gap-1 text-xs rounded-xl hidden sm:inline-flex cursor-pointer"
                title="Compartir por WhatsApp"
              >
                <Share2 className="h-3.5 w-3.5" />
                <span className="hidden 2xl:inline">WhatsApp</span>
              </Button>

              <Button
                variant="ghost"
                size="icon-sm"
                onClick={handleCopyLink}
                className="h-8 w-8 rounded-xl cursor-pointer"
                title="Copiar enlace"
              >
                {copiedLink ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </>
          )}

          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            className="h-8 w-8 rounded-xl text-muted-foreground hover:text-foreground cursor-pointer"
            title="Cerrar panel lateral"
          >
            <X className="h-4.5 w-4.5" />
          </Button>
        </div>
      </div>

      {/* Cuerpo Desplazable del Panel */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[calc(100vh-12rem)]">
        {loading ? (
          <div className="space-y-4 py-6">
            <div className="grid grid-cols-2 gap-2.5">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))}
            </div>
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-3 text-muted-foreground">
                <Loader2 className="h-7 w-7 animate-spin text-primary" />
                <p className="text-xs">Cargando representación fiscal de la factura...</p>
              </div>
            </div>
          </div>
        ) : sale ? (
          <>
            {/* 1. Tarjetas Resumen Rápido */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-2.5 bg-card rounded-xl border border-border/80 shadow-2xs">
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-0.5">
                  <DollarSign className="h-3 w-3 text-primary" />
                  <span>Total</span>
                </div>
                <div className="text-sm sm:text-base font-bold font-mono text-foreground">
                  {formatCurrency(sale.total)}
                </div>
              </div>

              <div className="p-2.5 bg-card rounded-xl border border-border/80 shadow-2xs">
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-0.5">
                  <User className="h-3 w-3 text-muted-foreground" />
                  <span>Cliente</span>
                </div>
                <div
                  className="text-xs font-semibold text-foreground truncate"
                  title={sale.client?.name || 'Consumidor Final'}
                >
                  {sale.client?.name || 'Consumidor Final'}
                </div>
                {sale.client?.phone && (
                  <div className="text-[10px] font-mono text-muted-foreground truncate">{sale.client.phone}</div>
                )}
              </div>

              <div className="p-2.5 bg-card rounded-xl border border-border/80 shadow-2xs">
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-0.5">
                  <CreditCard className="h-3 w-3 text-muted-foreground" />
                  <span>Pago</span>
                </div>
                <div className="text-xs font-semibold text-foreground truncate">
                  {getPaymentMethodLabel(sale.paymentMethod)}
                </div>
                {isCredit && (
                  <div className="text-[10px] text-amber-600 dark:text-amber-400 font-medium truncate">
                    Pend: {formatCurrency(pendingBalance)}
                  </div>
                )}
              </div>

              <div className="p-2.5 bg-card rounded-xl border border-border/80 shadow-2xs">
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-0.5">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  <span>Fecha</span>
                </div>
                <div className="text-xs font-semibold text-foreground truncate">
                  {new Date(sale.saleDate).toLocaleDateString('es-CO')}
                </div>
                <div className="text-[10px] text-muted-foreground truncate">
                  {sale.user?.name || 'Admin'}
                </div>
              </div>
            </div>

            {/* 2. Previsualización de la Factura Estándar DIAN */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
                <span className="font-semibold text-foreground">Vista Previa DIAN:</span>
                <span className="text-[10.5px]">Documento oficial para auditoría</span>
              </div>

              <div className="shadow-xs rounded-xl overflow-hidden" id="dian-invoice-printable">
                <DianInvoiceView sale={sale} />
              </div>
            </div>
          </>
        ) : null}
      </div>

      {/* Footer Móvil con Botones de Acción */}
      {sale && (
        <div className="p-2.5 bg-background border-t border-border flex sm:hidden items-center justify-between gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrintInvoice}
            className="flex-1 h-8 gap-1 text-xs rounded-xl"
          >
            <Printer className="h-3.5 w-3.5" />
            Imprimir
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleWhatsAppShare}
            className="flex-1 h-8 gap-1 text-xs rounded-xl"
          >
            <Share2 className="h-3.5 w-3.5" />
            WhatsApp
          </Button>

          <a href={`/api/sales/${sale.id}/pdf`} target="_blank" rel="noopener noreferrer" className="flex-1">
            <Button variant="default" size="sm" className="w-full h-8 gap-1 text-xs rounded-xl">
              <Download className="h-3.5 w-3.5" />
              PDF
            </Button>
          </a>
        </div>
      )}
    </div>
  )
}
