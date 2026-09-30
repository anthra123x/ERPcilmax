'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { HandCoins, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatCurrency } from '@/lib/format'
import { registerPayment } from '@/modules/sales/payments.actions'

export function RegistrarAbonoDialog({
  saleId,
  invoiceNumber,
  saldo,
}: {
  saleId: string
  invoiceNumber: string
  saldo: number
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [amount, setAmount] = useState(0)
  const [method, setMethod] = useState<'CASH' | 'CARD' | 'TRANSFER'>('CASH')
  const [paymentDate, setPaymentDate] = useState('')
  const [notes, setNotes] = useState('')

  async function handleSubmit() {
    if (amount <= 0) {
      toast.error('Ingresa un monto mayor a 0')
      return
    }
    if (amount > saldo + 0.005) {
      toast.error(`El abono supera el saldo pendiente (${formatCurrency(saldo)})`)
      return
    }

    setSaving(true)
    try {
      const result = await registerPayment({
        saleId,
        amount,
        paymentMethod: method,
        paymentDate: paymentDate || null,
        notes: notes || null,
      })
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success('Abono registrado exitosamente')
      setOpen(false)
      setAmount(0)
      setPaymentDate('')
      setNotes('')
      router.refresh()
    } catch {
      toast.error('Error al registrar el abono')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>
        <Button size="sm">
          <HandCoins className="h-4 w-4" />
          Registrar abono
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar abono · {invoiceNumber}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Saldo pendiente</span>
            <span className="font-medium">{formatCurrency(saldo)}</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Monto</Label>
              <Input
                type="number"
                min="0"
                step="100"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value) || 0)}
                placeholder="0"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Método</Label>
              <Select value={method} onValueChange={(v) => setMethod(v as 'CASH' | 'CARD' | 'TRANSFER')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">Efectivo</SelectItem>
                  <SelectItem value="CARD">Tarjeta</SelectItem>
                  <SelectItem value="TRANSFER">Transferencia</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Fecha</Label>
            <Input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Nota (opcional)</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Observaciones" />
          </div>
          <Button className="w-full" onClick={handleSubmit} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Procesando...
              </>
            ) : (
              'Registrar abono'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
