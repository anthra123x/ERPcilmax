'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Receipt, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { formatCurrency } from '@/lib/format'
import {
  getCreditStatus,
  getCreditStatusColor,
  getCreditStatusLabel,
  getPaymentMethodLabel,
  round,
} from '@/lib/labels'
import { deletePayment } from '@/modules/sales/payments.actions'
import { RegistrarAbonoDialog } from '@/components/sales/registrar-abono-dialog'

interface SaleCreditPanelProps {
  sale: {
    id: string
    invoiceNumber: string
    total: number
    dueDate: Date | null
    paymentMethod: string
    status: string
    payments: Array<{
      id: string
      amount: number
      paymentMethod: string
      paymentDate: Date
      notes: string | null
      user?: { name: string } | null
    }>
    installments: Array<{ id: string; amount: number; dueDate: Date }>
  }
}

export function SaleCreditPanel({ sale }: SaleCreditPanelProps) {
  const router = useRouter()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState<string | null>(null)

  const paid = round(sale.payments.reduce((s, p) => s + p.amount, 0))
  const saldo = round(sale.total - paid)
  const status = getCreditStatus({
    paymentMethod: sale.paymentMethod,
    dueDate: sale.dueDate,
    status: sale.status,
    payments: sale.payments,
    total: sale.total,
  })

  async function handleDelete(paymentId: string) {
    setDeletingId(paymentId)
    try {
      const result = await deletePayment(paymentId)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success('Abono eliminado')
      setConfirmOpen(null)
      router.refresh()
    } catch {
      toast.error('Error al eliminar el abono')
    } finally {
      setDeletingId(null)
    }
  }

  let acc = 0
  const installmentRows = sale.installments.map((inst) => {
    acc += inst.amount
    const boundary = round(acc)
    const markedPaid = paid >= boundary - 0.005
    const overdue = !markedPaid && inst.dueDate.getTime() < Date.now()
    return { inst, markedPaid, overdue }
  })

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Pagos y saldo</CardTitle>
          {status && (
            <Badge variant="outline" className={getCreditStatusColor(status)}>
              {getCreditStatusLabel(status)}
            </Badge>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <span className="text-xs text-muted-foreground">Total de la venta</span>
              <p className="text-lg font-bold">{formatCurrency(sale.total)}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Abonado</span>
              <p className="text-lg font-semibold text-green-600">{formatCurrency(paid)}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Saldo pendiente</span>
              <p className="text-lg font-semibold text-amber-600">{formatCurrency(saldo)}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Vencimiento</span>
              <p className="text-sm font-medium">
                {sale.dueDate
                  ? sale.dueDate.toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' })
                  : 'Sin vencimiento'}
              </p>
            </div>
          </div>
          {status !== 'PAID' && (
            <div className="pt-2">
              <RegistrarAbonoDialog saleId={sale.id} invoiceNumber={sale.invoiceNumber} saldo={saldo} />
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Historial de abonos</CardTitle>
          </CardHeader>
          <CardContent>
            {sale.payments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay abonos registrados aún.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 text-sm font-medium">Fecha</th>
                      <th className="text-left py-2 text-sm font-medium">Método</th>
                      <th className="text-right py-2 text-sm font-medium">Monto</th>
                      <th className="text-right py-2 text-sm font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {sale.payments.map((p) => (
                      <tr key={p.id} className="border-b">
                        <td className="py-2 text-sm">
                          {new Date(p.paymentDate).toLocaleDateString('es-CO', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="py-2 text-sm">{getPaymentMethodLabel(p.paymentMethod)}</td>
                        <td className="py-2 text-sm text-right font-medium">{formatCurrency(p.amount)}</td>
                        <td className="py-2 text-right">
                          {p.notes && (
                            <span className="text-xs text-muted-foreground block text-right">{p.notes}</span>
                          )}
                          <a
                            href={`/api/sales/${sale.id}/receipt/${p.id}/pdf`}
                            title="Descargar recibo"
                            className="inline-flex"
                          >
                            <Button variant="ghost" size="sm">
                              <Receipt className="h-4 w-4" />
                            </Button>
                          </a>
                          <Dialog open={confirmOpen === p.id} onOpenChange={(o) => setConfirmOpen(o ? p.id : null)}>
                            <DialogTrigger>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                onClick={() => setConfirmOpen(p.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>¿Eliminar abono?</DialogTitle>
                                <DialogDescription>
                                  Se eliminará el abono de {formatCurrency(p.amount)} y su transacción de ingreso
                                  asociada.
                                </DialogDescription>
                              </DialogHeader>
                              <DialogFooter>
                                <Button variant="outline" onClick={() => setConfirmOpen(null)}>
                                  Cancelar
                                </Button>
                                <Button variant="destructive" onClick={() => handleDelete(p.id)} disabled={deletingId === p.id}>
                                  {deletingId === p.id ? 'Eliminando...' : 'Eliminar'}
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Plan de cuotas</CardTitle>
          </CardHeader>
          <CardContent>
            {sale.installments.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin plan de cuotas definido.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 text-sm font-medium">Vencimiento</th>
                      <th className="text-right py-2 text-sm font-medium">Monto</th>
                      <th className="text-right py-2 text-sm font-medium">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {installmentRows.map(({ inst, markedPaid, overdue }) => (
                      <tr key={inst.id} className="border-b">
                        <td className="py-2 text-sm">
                          {inst.dueDate.toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' })}
                        </td>
                        <td className="py-2 text-sm text-right font-medium">{formatCurrency(inst.amount)}</td>
                        <td className="py-2 text-right">
                          {markedPaid ? (
                            <Badge variant="outline" className="text-green-700 bg-green-50 border-green-200">
                              Pagada
                            </Badge>
                          ) : overdue ? (
                            <Badge variant="outline" className="text-red-700 bg-red-50 border-red-200">
                              Vencida
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-amber-700 bg-amber-50 border-amber-200">
                              Pendiente
                            </Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}