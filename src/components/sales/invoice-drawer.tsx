'use client'

import React, { useEffect, useState } from 'react'
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

interface InvoiceDrawerProps {
  saleId: string | null
  open: boolean
  onClose: () => void
}

export function InvoiceDrawer({ saleId, open, onClose }: InvoiceDrawerProps) {
  const [sale, setSale] = useState<DianInvoiceSaleData | null>(null)
  const [loading, setLoading] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)

  // Cargar información de la venta cuando se abre el drawer
  useEffect(() => {
    if (!open || !saleId) {
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
        console.error('Error al cargar la factura en el drawer:', err)
        toast.error('Error al cargar la factura')
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [saleId, open, onClose])

  // Cerrar con tecla Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && open) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  // Bloquear scroll de fondo cuando el drawer está abierto
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  if (!open) return null

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

    // Intentar impresión aislada mediante iframe invisible para un resultado 100% limpio
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
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop con desenfoque suave */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Contenedor del Slide Drawer anclado a la derecha */}
      <div className="fixed inset-y-0 right-0 flex max-w-full pl-0 sm:pl-10">
        <div className="w-screen max-w-4xl bg-card border-l border-border shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out">
          {/* Header Superior del Drawer */}
          <div className="px-4 sm:px-6 py-4 bg-background border-b border-border flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
                <Receipt className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base sm:text-lg font-bold text-foreground truncate">
                    {loading ? <Skeleton className="h-6 w-36" /> : `Factura #${sale?.invoiceNumber || ''}`}
                  </h2>
                  <Badge
                    variant="outline"
                    className="text-[10px] uppercase font-bold tracking-wider border-primary/25 bg-primary/10 text-primary"
                  >
                    Estándar DIAN
                  </Badge>
                  {sale && (
                    <Badge variant={sale.status === 'COMPLETED' ? 'default' : 'destructive'} className="text-[10px]">
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
                        <Badge variant="outline" className={`text-[10px] ${getCreditStatusColor(cs)}`}>
                          {getCreditStatusLabel(cs)}
                        </Badge>
                      ) : null
                    })()}
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {loading
                    ? 'Cargando detalles de la factura...'
                    : `Cliente: ${sale?.client?.name || 'Consumidor Final'} • Fecha: ${new Date(sale?.saleDate || '').toLocaleDateString('es-CO')}`}
                </p>
              </div>
            </div>

            {/* Acciones del Encabezado */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {sale && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrintInvoice}
                    className="h-8 gap-1.5 text-xs rounded-xl hidden sm:inline-flex"
                    title="Imprimir Factura"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    <span>Imprimir</span>
                  </Button>

                  <a href={`/api/sales/${sale.id}/pdf`} target="_blank" rel="noopener noreferrer">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1.5 text-xs rounded-xl"
                      title="Descargar PDF"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span className="hidden md:inline">Descargar PDF</span>
                    </Button>
                  </a>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleWhatsAppShare}
                    className="h-8 gap-1.5 text-xs rounded-xl hidden sm:inline-flex"
                    title="Compartir por WhatsApp"
                  >
                    <Share2 className="h-3.5 w-3.5" />
                    <span className="hidden md:inline">WhatsApp</span>
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={handleCopyLink}
                    className="h-8 w-8 rounded-xl"
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
                className="h-8 w-8 rounded-xl ml-1 text-muted-foreground hover:text-foreground"
                title="Cerrar panel"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Cuerpo Desplazable del Drawer */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            {loading ? (
              <div className="space-y-6 py-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full rounded-xl" />
                  ))}
                </div>
                <div className="flex items-center justify-center py-12">
                  <div className="flex flex-col items-center gap-3 text-muted-foreground">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm">Generando representación fiscal de la factura...</p>
                  </div>
                </div>
              </div>
            ) : sale ? (
              <>
                {/* 1. Tarjetas Resumen Rápido (KPI Chips) */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-card rounded-xl border border-border/80 shadow-2xs">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                      <DollarSign className="h-3.5 w-3.5 text-primary" />
                      <span>Total Venta</span>
                    </div>
                    <div className="text-base sm:text-lg font-bold font-mono text-foreground">
                      {formatCurrency(sale.total)}
                    </div>
                  </div>

                  <div className="p-3 bg-card rounded-xl border border-border/80 shadow-2xs">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                      <User className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>Cliente</span>
                    </div>
                    <div
                      className="text-sm font-semibold text-foreground truncate"
                      title={sale.client?.name || 'Consumidor Final'}
                    >
                      {sale.client?.name || 'Consumidor Final'}
                    </div>
                    {sale.client?.phone && (
                      <div className="text-[11px] font-mono text-muted-foreground truncate">{sale.client.phone}</div>
                    )}
                  </div>

                  <div className="p-3 bg-card rounded-xl border border-border/80 shadow-2xs">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                      <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>Forma de Pago</span>
                    </div>
                    <div className="text-sm font-semibold text-foreground">
                      {getPaymentMethodLabel(sale.paymentMethod)}
                    </div>
                    {isCredit && (
                      <div className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                        Pendiente: {formatCurrency(pendingBalance)}
                      </div>
                    )}
                  </div>

                  <div className="p-3 bg-card rounded-xl border border-border/80 shadow-2xs">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>Fecha / Atendido</span>
                    </div>
                    <div className="text-xs font-semibold text-foreground">
                      {new Date(sale.saleDate).toLocaleDateString('es-CO')}
                    </div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      {sale.user?.name || 'Administración'}
                    </div>
                  </div>
                </div>

                {/* 2. Previsualización de la Factura Estándar DIAN */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                    <span className="font-semibold text-foreground">Vista Previa DIAN (Documento Fiscal):</span>
                    <span className="text-[11px]">Diseño oficial para impresión y auditoría</span>
                  </div>

                  <div className="shadow-md rounded-2xl overflow-hidden" id="dian-invoice-printable">
                    <DianInvoiceView sale={sale} />
                  </div>
                </div>
              </>
            ) : null}
          </div>

          {/* Footer Móvil con Botones de Acción */}
          {sale && (
            <div className="p-3 bg-background border-t border-border flex sm:hidden items-center justify-between gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrintInvoice}
                className="flex-1 h-9 gap-1.5 text-xs rounded-xl"
              >
                <Printer className="h-4 w-4" />
                Imprimir
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleWhatsAppShare}
                className="flex-1 h-9 gap-1.5 text-xs rounded-xl"
              >
                <Share2 className="h-4 w-4" />
                WhatsApp
              </Button>

              <a href={`/api/sales/${sale.id}/pdf`} target="_blank" rel="noopener noreferrer" className="flex-1">
                <Button variant="default" size="sm" className="w-full h-9 gap-1.5 text-xs rounded-xl">
                  <Download className="h-4 w-4" />
                  PDF
                </Button>
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
