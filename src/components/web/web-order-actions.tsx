'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { AlertTriangle, Ban, CheckCircle2, Loader2, PackageCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cancelWebOrder, confirmWebOrder, convertWebOrderToSale } from '@/modules/web/web.actions'

type WebOrderActionsStatus = 'PENDING' | 'CONFIRMED' | 'CONVERTED' | 'CANCELLED'

interface WebOrderActionsProps {
  orderId: string
  status: WebOrderActionsStatus
}

export function WebOrderActions({ orderId, status }: WebOrderActionsProps) {
  const router = useRouter()
  const [acting, setActing] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)

  if (status !== 'PENDING' && status !== 'CONFIRMED') return null

  async function handleConfirm() {
    setActing(true)
    const result = await confirmWebOrder(orderId)
    if (result?.error) {
      toast.error(result.error)
    } else if (result?.success) {
      toast.success(result.success)
      router.refresh()
    }
    setActing(false)
  }

  async function handleConvert() {
    setActing(true)
    const result = await convertWebOrderToSale(orderId)
    if (result?.error) {
      toast.error(result.error)
    } else if (result?.success && 'saleId' in result) {
      toast.success(result.success)
      router.push(`/sales/${result.saleId}`)
      router.refresh()
    }
    setActing(false)
  }

  async function handleCancel() {
    setActing(true)
    const result = await cancelWebOrder(orderId)
    if (result?.error) {
      toast.error(result.error)
    } else if (result?.success) {
      toast.success(result.success)
      router.refresh()
    }
    setActing(false)
    setCancelOpen(false)
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {status === 'PENDING' && (
        <Button size="sm" variant="outline" onClick={handleConfirm} disabled={acting}>
          {acting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <PackageCheck className="h-4 w-4" />
          )}
          {acting ? 'Confirmando…' : 'Confirmar y reservar'}
        </Button>
      )}
      <Button size="sm" onClick={handleConvert} disabled={acting}>
        {acting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
        {acting ? 'Convirtiendo…' : 'Convertir a venta'}
      </Button>
      <Button variant="outline" size="sm" onClick={() => setCancelOpen(true)} disabled={acting}>
        <Ban className="h-4 w-4" />
        Cancelar
      </Button>

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <DialogTitle className="text-center">¿Cancelar pedido web?</DialogTitle>
            <DialogDescription className="text-center">
              {status === 'CONFIRMED'
                ? 'El stock reservado de este pedido se devolverá al inventario.'
                : 'El pedido quedará con estado CANCELLED y no podrá convertirse a venta.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelOpen(false)} disabled={acting}>
              Volver
            </Button>
            <Button variant="destructive" onClick={handleCancel} disabled={acting}>
              {acting ? 'Cancelando…' : 'Cancelar pedido'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}