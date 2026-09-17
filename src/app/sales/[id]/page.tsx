import { getSaleById } from '@/modules/sales/sales.actions'
import { notFound } from 'next/navigation'
import { PageHeader } from '@/components/ui/page-header'
import Link from 'next/link'
import { ArrowLeft, FileText, Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/format'
import { getPaymentMethodLabel } from '@/lib/labels'
import { SaleCreditPanel } from '@/components/sales/sale-credit-panel'

interface SaleDetailPageProps {
  params: Promise<{ id: string }>
}

export const dynamic = 'force-dynamic'

export default async function SaleDetailPage({ params }: SaleDetailPageProps) {
  const { id } = await params
  const sale = await getSaleById(id)

  if (!sale) notFound()

  return (
    <div className="page-container py-6 space-y-6">
      <PageHeader
        title={`Venta ${sale.invoiceNumber}`}
        description={`Fecha: ${new Date(sale.saleDate).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`}
        actions={
          <div className="flex gap-2">
            <Link href="/sales/history">
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver
              </Button>
            </Link>
            <Link href={`/sales/${sale.id}/invoice`}>
              <Button>
                <Printer className="mr-2 h-4 w-4" />
                Imprimir Factura
              </Button>
            </Link>
            {sale.paymentMethod === 'CREDITO' && (
              <a href={`/api/sales/${sale.id}/credit-statement/pdf`}>
                <Button variant="outline">
                  <FileText className="mr-2 h-4 w-4" />
                  Estado de cuenta
                </Button>
              </a>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Datos de la venta */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Datos de la Venta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <span className="text-xs text-muted-foreground">Estado</span>
              {sale.status === 'COMPLETED' ? (
                <Badge className="ml-2 bg-green-500">Completada</Badge>
              ) : (
                <Badge variant="destructive" className="ml-2">
                  Anulada
                </Badge>
              )}
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Método de pago</span>
              <p className="text-sm font-medium">{getPaymentMethodLabel(sale.paymentMethod)}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Atendido por</span>
              <p className="text-sm font-medium">{sale.user?.name || '—'}</p>
            </div>
          </CardContent>
        </Card>

        {/* Cliente */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Cliente</CardTitle>
          </CardHeader>
          <CardContent>
            {sale.client ? (
              <div className="space-y-2">
                <p className="font-medium">{sale.client.name}</p>
                {sale.client.phone && <p className="text-sm text-muted-foreground">{sale.client.phone}</p>}
                {sale.client.email && <p className="text-sm text-muted-foreground">{sale.client.email}</p>}
                {sale.client.address && <p className="text-sm text-muted-foreground">{sale.client.address}</p>}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Cliente general</p>
            )}
          </CardContent>
        </Card>

        {/* Totales */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Resumen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Subtotal</span>
              <span>{formatCurrency(sale.subtotal)}</span>
            </div>
            {sale.discount > 0 && (
              <div className="flex justify-between text-sm text-destructive">
                <span>Descuento</span>
                <span>-{formatCurrency(sale.discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold pt-2 border-t">
              <span>Total</span>
              <span>{formatCurrency(sale.total)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {sale.paymentMethod === 'CREDITO' && (
        <SaleCreditPanel
          sale={{
            id: sale.id,
            invoiceNumber: sale.invoiceNumber,
            total: sale.total,
            dueDate: sale.dueDate,
            paymentMethod: sale.paymentMethod,
            status: sale.status,
            payments:
              sale.payments?.map((p) => ({
                id: p.id,
                amount: p.amount,
                paymentMethod: p.paymentMethod,
                paymentDate: p.paymentDate,
                notes: p.notes,
                user: p.user,
              })) ?? [],
            installments:
              sale.installments?.map((i) => ({ id: i.id, amount: i.amount, dueDate: i.dueDate })) ?? [],
          }}
        />
      )}

      {/* Productos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Productos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 text-sm font-medium">Producto</th>
                  <th className="text-right py-2 text-sm font-medium">Cantidad</th>
                  <th className="text-right py-2 text-sm font-medium">Precio Unitario</th>
                  <th className="text-right py-2 text-sm font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {sale.items.map((item) => (
                  <tr key={item.id} className="border-b">
                    <td className="py-2 text-sm">{item.product.name}</td>
                    <td className="py-2 text-sm text-right">{item.quantity}</td>
                    <td className="py-2 text-sm text-right">{formatCurrency(item.unitPrice)}</td>
                    <td className="py-2 text-sm text-right font-medium">{formatCurrency(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
