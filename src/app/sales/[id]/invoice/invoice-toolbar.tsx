'use client'

import { useState } from 'react'
import { Printer, Download, Share2, Copy, Check, ArrowLeft, PlusCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { toast } from 'sonner'

interface InvoiceToolbarProps {
  saleId: string
  invoiceNumber: string
  clientName?: string | null
  clientPhone?: string | null
  totalFormatted: string
  companyName: string
}

export function InvoiceToolbar({
  saleId,
  invoiceNumber,
  clientName,
  clientPhone,
  totalFormatted,
  companyName,
}: InvoiceToolbarProps) {
  const [copied, setCopied] = useState(false)

  function handlePrint() {
    window.print()
  }

  function handleCopyLink() {
    const url = window.location.href
    navigator.clipboard.writeText(url)
    setCopied(true)
    toast.success('Enlace de la factura copiado al portapapeles')
    setTimeout(() => setCopied(false), 2500)
  }

  function handleWhatsAppShare() {
    const name = clientName || 'Estimado cliente'
    const message = `Hola *${name}*, te compartimos el comprobante de tu compra en *${companyName}*:\n\n📄 *Factura:* #${invoiceNumber}\n💰 *Total:* ${totalFormatted}\n\nPuedes consultar o descargar tu factura aquí:\n${window.location.href}\n\n¡Gracias por tu compra!`

    // Si el cliente tiene teléfono registrado, formatear sin caracteres no numéricos
    const cleanPhone = clientPhone ? clientPhone.replace(/\D/g, '') : ''
    const waUrl = cleanPhone
      ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`

    window.open(waUrl, '_blank')
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 print:hidden bg-card/60 backdrop-blur-md p-4 rounded-2xl border border-border/80 shadow-xs">
      <div className="flex items-center gap-2">
        <Link href="/sales">
          <Button variant="outline" size="sm" className="rounded-xl">
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Volver a Ventas
          </Button>
        </Link>
        <Link href="/sales/new">
          <Button variant="outline" size="sm" className="rounded-xl">
            <PlusCircle className="mr-1.5 h-4 w-4" />
            Nueva Venta
          </Button>
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopyLink}
          className="rounded-xl"
          title="Copiar enlace directo"
        >
          {copied ? <Check className="mr-1.5 h-4 w-4 text-emerald-500" /> : <Copy className="mr-1.5 h-4 w-4" />}
          {copied ? 'Copiado' : 'Copiar Link'}
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={handleWhatsAppShare}
          className="rounded-xl"
          title="Compartir comprobante por WhatsApp"
        >
          <Share2 className="mr-1.5 h-4 w-4" />
          WhatsApp
        </Button>

        <a href={`/api/sales/${saleId}/pdf`} target="_blank" rel="noopener noreferrer">
          <Button variant="outline" size="sm" className="rounded-xl">
            <Download className="mr-1.5 h-4 w-4" />
            PDF
          </Button>
        </a>

        <Button
          onClick={handlePrint}
          size="sm"
          className="rounded-xl bg-primary text-primary-foreground font-semibold shadow-sm hover:brightness-105"
        >
          <Printer className="mr-1.5 h-4 w-4" />
          Imprimir Factura
        </Button>
      </div>
    </div>
  )
}
