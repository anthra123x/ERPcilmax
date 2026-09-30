'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { X, Printer, Download, Share2, Copy, Check, Receipt, DollarSign, Loader2, Maximize2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { DianInvoiceView, type DianInvoiceSaleData } from './dian-invoice-view'
import { InvoiceDrawer } from './invoice-drawer'
import { getSaleById } from '@/modules/sales/sales.actions'
import { formatCurrency } from '@/lib/format'
import { getPaymentMethodLabel, getCreditStatus, getCreditStatusLabel, getCreditStatusColor } from '@/lib/labels'
import { toast } from 'sonner'

/**
 * Ancho de papel fijo de la representación DIAN. A 680px se activan los
 * `md:grid-cols-*` del documento (son media queries de viewport) para que la
 * maqueta real de la factura se respete antes de escalarla.
 */
const PAPER_WIDTH = 680

interface InvoiceSidePanelProps {
  saleId: string | null
  onClose: () => void
}

/** Hecho secundario del resumen: etiqueta arriba, valor y nota abajo. */
function SummaryFact({
  label,
  value,
  sub,
  valueClassName,
  subClassName,
  title,
}: {
  label: string
  value: string
  sub?: string
  valueClassName?: string
  subClassName?: string
  title?: string
}) {
  return (
    <div className="bg-card p-2 min-w-0">
      <div className="text-[9.5px] uppercase tracking-wide text-muted-foreground truncate">{label}</div>
      <div className={cn('text-[11.5px] font-semibold text-foreground truncate', valueClassName)} title={title}>
        {value}
      </div>
      {sub ? (
        <div className={cn('text-[10px] text-muted-foreground truncate', subClassName)} title={sub}>
          {sub}
        </div>
      ) : null}
    </div>
  )
}

export function InvoiceSidePanel({ saleId, onClose }: InvoiceSidePanelProps) {
  const [sale, setSale] = useState<DianInvoiceSaleData | null>(null)
  const [loading, setLoading] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [thumbScale, setThumbScale] = useState(1)
  const [thumbHeight, setThumbHeight] = useState<number | null>(null)
  const [thumbOffset, setThumbOffset] = useState(0)
  const panelRef = useRef<HTMLDivElement>(null)
  const thumbBoxRef = useRef<HTMLDivElement>(null)
  const thumbSheetRef = useRef<HTMLDivElement>(null)
  const thumbFitRef = useRef<string | null>(null)

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

  // Escape cierra primero el drawer abierto y luego el panel completo
  useEffect(() => {
    if (!saleId) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      if (drawerOpen) {
        setDrawerOpen(false)
        return
      }
      onClose()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [saleId, drawerOpen, onClose])

  /**
   * Fit-to-width del thumbnail: la hoja se renderiza a ancho de papel fijo y
   * se escala al ancho disponible de la caja, de modo que el documento
   * completo siempre queda visible sin importar cuántos ítems tenga.
   *
   * Se mide en `useEffect` (no `useLayoutEffect`) para no romper SSR ni la
   * hidratación de Next, y la firma `ancho x alto natural` evita realimentar
   * el propio ResizeObserver: escribir la altura de la caja no cambia ni su
   * ancho ni el alto natural de la hoja (que está en `absolute`).
   */
  useEffect(() => {
    const box = thumbBoxRef.current
    const sheet = thumbSheetRef.current
    if (!box || !sheet) return

    thumbFitRef.current = null

    const fit = () => {
      const available = box.clientWidth
      const natural = sheet.offsetHeight
      if (available <= 0 || natural <= 0) return
      const signature = `${available}x${natural}`
      if (thumbFitRef.current === signature) return
      thumbFitRef.current = signature
      const nextScale = Math.min(1, available / PAPER_WIDTH)
      setThumbScale(nextScale)
      setThumbHeight(Math.round(natural * nextScale))
      // Cuando la caja es más ancha que el papel (layout apilado en tablet)
      // la hoja entra a escala 1 y hay que centrarla en lugar de pegarla a la izquierda.
      setThumbOffset(Math.max(0, (available - PAPER_WIDTH) / 2))
    }

    fit()

    const observer = new ResizeObserver(fit)
    observer.observe(box)
    observer.observe(sheet)
    return () => observer.disconnect()
  }, [sale?.id, drawerOpen])

  const handleCopyLink = useCallback(() => {
    if (!sale) return
    const url = `${window.location.origin}/sales/${sale.id}/invoice`
    navigator.clipboard.writeText(url)
    setCopiedLink(true)
    toast.success('Enlace de la factura copiado al portapapeles')
    setTimeout(() => setCopiedLink(false), 2500)
  }, [sale])

  const handleWhatsAppShare = useCallback(() => {
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
  }, [sale])

  /**
   * Imprime el DOM de `#dian-invoice-printable` dentro de un iframe limpio.
   * El nodo vive DENTRO de la hoja escalada, así que su `outerHTML` no
   * arrastra el `transform` del thumbnail y el PDF sale a tamaño real.
   */
  const handlePrintInvoice = useCallback(() => {
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
  }, [sale])

  if (!saleId) return null

  const isCredit = sale?.paymentMethod === 'CREDITO'
  const totalPaid = (sale?.payments ?? []).reduce((s, p) => s + (Number(p.amount) || 0), 0)
  const pendingBalance = sale ? Math.max(0, sale.total - totalPaid) : 0
  const clientName = sale?.client?.name || 'Consumidor Final'
  const totalLabel = sale ? formatCurrency(sale.total) : ''

  let creditBadge: React.ReactNode = null
  if (sale && isCredit) {
    const cs = getCreditStatus({
      paymentMethod: sale.paymentMethod,
      dueDate: sale.dueDate ? new Date(sale.dueDate) : null,
      status: sale.status || 'COMPLETED',
      payments: sale.payments,
      total: sale.total,
    })
    if (cs) {
      creditBadge = (
        <Badge variant="outline" className={cn('h-4 px-1.5 py-0 text-[9px]', getCreditStatusColor(cs))}>
          {getCreditStatusLabel(cs)}
        </Badge>
      )
    }
  }

  return (
    <>
      <div
        ref={panelRef}
        role="complementary"
        aria-label={`Detalle de la factura ${sale?.invoiceNumber ?? ''}`.trim()}
        className="w-full flex flex-col overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10 card-shadow xl:sticky xl:top-4 xl:max-h-[calc(100vh-2rem)] transition-all duration-300"
      >
        {/* Encabezado: identidad primero, acciones secundarias en iconos */}
        <div className="px-3 py-2.5 border-b border-border flex items-center gap-2 shrink-0">
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary shrink-0">
            <Receipt className="h-4 w-4" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap min-w-0">
              <h2 className="text-[13px] font-bold text-foreground truncate">
                {loading ? <Skeleton className="h-4 w-24" /> : `Factura #${sale?.invoiceNumber || ''}`}
              </h2>
              <Badge
                variant="outline"
                className="h-4 px-1.5 py-0 text-[9px] uppercase font-bold tracking-wider border-primary/25 bg-primary/10 text-primary"
              >
                Estándar DIAN
              </Badge>
              {sale && (
                <Badge
                  variant={sale.status === 'COMPLETED' ? 'default' : 'destructive'}
                  className="h-4 px-1.5 py-0 text-[9px]"
                >
                  {sale.status === 'COMPLETED' ? 'Completada' : 'Anulada'}
                </Badge>
              )}
              {creditBadge}
            </div>
            <p className="text-[10.5px] text-muted-foreground truncate mt-0.5">
              {loading
                ? 'Cargando factura...'
                : `Cliente: ${clientName} • Fecha: ${new Date(sale?.saleDate || '').toLocaleDateString('es-CO')}`}
            </p>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleCopyLink}
              disabled={!sale}
              className="h-7 w-7 rounded-lg cursor-pointer"
              title="Copiar enlace de la factura"
              aria-label="Copiar enlace de la factura"
            >
              {copiedLink ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setDrawerOpen(true)}
              disabled={!sale}
              className="h-7 w-7 rounded-lg cursor-pointer"
              title="Ver factura completa"
              aria-label="Ver factura completa"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onClose}
              className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
              title="Cerrar panel lateral"
              aria-label="Cerrar panel lateral"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Cuerpo desplazable: el capping de alto lo hace el padre flex con min-h-0 */}
        <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3">
          {loading ? (
            <div className="space-y-3">
              <div className="rounded-xl border border-border overflow-hidden">
                <Skeleton className="h-9 w-full rounded-none" />
                <div className="grid grid-cols-2 gap-px bg-border">
                  {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="h-11 w-full rounded-none" />
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-center py-10">
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <p className="text-[11px]">Cargando representación fiscal de la factura...</p>
                </div>
              </div>
            </div>
          ) : sale ? (
            <>
              {/* Resumen: un solo bloque donde el Total manda */}
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="flex items-baseline justify-between gap-2 px-3 py-2 bg-primary/[0.04] border-b border-border">
                  <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <DollarSign className="h-3 w-3 text-primary shrink-0" />
                    Total
                  </span>
                  <span
                    className="text-base font-bold font-mono tabular-nums text-foreground truncate"
                    title={totalLabel}
                  >
                    {totalLabel}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-px bg-border">
                  <SummaryFact
                    label="Cliente"
                    value={clientName}
                    sub={sale.client?.phone || undefined}
                    title={clientName}
                  />
                  <SummaryFact
                    label="Pago"
                    value={getPaymentMethodLabel(sale.paymentMethod)}
                    sub={isCredit ? `Pend: ${formatCurrency(pendingBalance)}` : undefined}
                    subClassName={isCredit ? 'text-amber-600 dark:text-amber-400 font-medium' : undefined}
                  />
                  <SummaryFact
                    label="Fecha"
                    value={new Date(sale.saleDate).toLocaleDateString('es-CO')}
                    sub={sale.user?.name || 'Administración'}
                  />
                  <SummaryFact
                    label="Ítems"
                    value={`${sale.items.length} ${sale.items.length === 1 ? 'producto' : 'productos'}`}
                    sub={`Subtotal ${formatCurrency(sale.subtotal)}`}
                  />
                </div>
              </div>

              {/* Representación DIAN como thumbnail, con escape hatch al documento completo */}
              {drawerOpen ? null : (
                <div className="space-y-1.5">
                  <span className="block px-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Documento fiscal DIAN
                  </span>

                  <div
                    ref={thumbBoxRef}
                    className={cn(
                      'relative w-full min-h-[200px] overflow-hidden rounded-xl border border-border bg-white transition-opacity duration-300',
                      thumbHeight ? 'opacity-100' : 'opacity-0',
                    )}
                    style={{ height: thumbHeight ?? undefined }}
                  >
                    <div
                      ref={thumbSheetRef}
                      className="absolute top-0 origin-top-left"
                      style={{ left: thumbOffset, width: PAPER_WIDTH, transform: `scale(${thumbScale})` }}
                    >
                      <div id="dian-invoice-printable">
                        <DianInvoiceView sale={sale} />
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDrawerOpen(true)}
                    className="h-6 w-full gap-1 px-1 text-[10.5px] rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <Maximize2 className="h-3 w-3" />
                    Ver factura completa
                  </Button>
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Pie con las acciones sustantivas: siempre visible */}
        {sale ? (
          <div className="px-3 py-2 border-t border-border flex items-center gap-1.5 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrintInvoice}
              className="flex-1 h-7 gap-1 px-2 text-[11px] rounded-lg cursor-pointer"
              title="Imprimir factura"
            >
              <Printer className="h-3.5 w-3.5" />
              Imprimir
            </Button>

            <a href={`/api/sales/${sale.id}/pdf`} target="_blank" rel="noopener noreferrer" className="flex-1">
              <Button
                variant="outline"
                size="sm"
                className="w-full h-7 gap-1 px-2 text-[11px] rounded-lg cursor-pointer"
                title="Descargar PDF"
              >
                <Download className="h-3.5 w-3.5" />
                PDF
              </Button>
            </a>

            <Button
              variant="outline"
              size="sm"
              onClick={handleWhatsAppShare}
              className="flex-1 h-7 gap-1 px-2 text-[11px] rounded-lg cursor-pointer"
              title="Compartir por WhatsApp"
            >
              <Share2 className="h-3.5 w-3.5" />
              WhatsApp
            </Button>
          </div>
        ) : null}
      </div>

      {/*
        El drawer se monta FUERA del panel a propósito: un ancestro con
        `overflow-hidden` o con la transform de la animación de entrada se
        convierte en containing block y le truncaría el `position: fixed`.
      */}
      <InvoiceDrawer saleId={saleId} open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  )
}
