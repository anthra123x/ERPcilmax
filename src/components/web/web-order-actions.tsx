'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { AlertTriangle, Ban, CheckCircle2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { convertWebOrderToSale, cancelWebOrder } from '@/modules/web/web.actions'

interface WebOrderActionsProps {
  orderId: string
  status: 'PENDING' | 'CONVERTED' | 'CANCELLED'
}

export function WebOrderActions({ orderId, status }: WebOrderActionsProps) {
  const router = useRouter()
  const [converting, setConverting] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  if (status !== 'PENDING') return null

  async function handleConvert() {
    setConverting(true)
    const result = await convertWebOrderToSale(orderId)
    if (result?.error) {
      toast.error(result.error)
    } else if (result?.success && 'saleId' in result) {
      toast.success(result.success)
      router.push(`/sales/${result.saleId}`)
      router.refresh()
    }
    setConverting(false)
  }

  async function handleCancel() {
    setCancelling(true)
    const result = await cancelWebOrder(orderId)
    if (result?.error) toast.error(result.error)
    else if (result?.success) {
      toast.success(result.success)
      router.refresh()
    }
    setCancelling(false)
    setCancelOpen(false)
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <Button size="sm" onClick={handleConvert} disabled={converting}>
        {converting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
        {converting ? 'Convirtiendo…' : 'Convertir a venta'}
      </Button>
      <Button variant="outline" size="sm" onClick={() => setCancelOpen(true)} disabled={converting}>
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
              El pedido quedará con estado CANCELLED y no podrá convertirse a venta.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelOpen(false)} disabled={cancelling}>
              Volver
            </Button>
            <Button variant="destructive" onClick={handleCancel} disabled={cancelling}>
              {cancelling ? 'Cancelando…' : 'Cancelar pedido'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
