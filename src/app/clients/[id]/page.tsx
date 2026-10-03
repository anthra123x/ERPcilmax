import { getClientById } from '@/modules/clients/clients.actions'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Pencil, Phone, Mail, MapPin, ShoppingCart, Receipt, HandCoins } from 'lucide-react'
import { formatCurrency } from '@/lib/format'
import { getCreditStatus, getCreditStatusColor, getCreditStatusLabel, getPaymentMethodLabel } from '@/lib/labels'

interface ClientPageProps {
  params: Promise<{
    id: string
  }>
}

export const dynamic = 'force-dynamic'

export default async function ClientPage({ params }: ClientPageProps) {
  const { id } = await params
  const client = await getClientById(id)

  if (!client) {
    notFound()
  }

  const creditSales = client.sales.filter((s) => s.paymentMethod === 'CREDITO' && s.status === 'COMPLETED')
  const pendingTotal = creditSales.reduce((acc, s) => {
    const paid = s.payments.reduce((a, p) => a + p.amount, 0)
    return acc + Math.max(0, s.total - paid)
  }, 0)

  return (
    <div className="container mx-auto py-6 min-h-screen space-y-6">
      <div className="flex justify-between items-center">
        <Link href="/clients">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
        </Link>
        <Link href={`/clients/${id}/edit`}>
          <Button variant="outline">
            <Pencil className="mr-2 h-4 w-4" />
            Editar Cliente
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{client.name}</CardTitle>
          <CardDescription>Información del cliente</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>{client.phone}</span>
            </div>
            {client.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{client.email}</span>
              </div>
            )}
            {client.address && (
              <div className="flex items-center gap-2 md:col-span-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{client.address}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {creditSales.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <HandCoins className="h-5 w-5" />
              Cuentas por cobrar
            </CardTitle>
            <CardDescription>Ventas a crédito con saldo pendiente</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-none border p-4">
                <p className="text-2xl font-bold text-amber-600">{formatCurrency(pendingTotal)}</p>
                <p className="text-sm text-muted-foreground">Saldo pendiente total</p>
              </div>
              <div className="rounded-none border p-4">
                <p className="text-2xl font-bold">{creditSales.length}</p>
                <p className="text-sm text-muted-foreground">Ventas a crédito</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left px-4 py-3 font-medium">Factura</th>
                    <th className="text-right px-4 py-3 font-medium">Total</th>
                    <th className="text-right px-4 py-3 font-medium">Abonado</th>
                    <th className="text-right px-4 py-3 font-medium">Saldo</th>
                    <th className="text-right px-4 py-3 font-medium">Vencimiento</th>
                    <th className="text-right px-4 py-3 font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {creditSales.map((sale) => {
                    const paid = sale.payments.reduce((a, p) => a + p.amount, 0)
                    const saldo = Math.max(0, sale.total - paid)
                    const st = getCreditStatus(sale)
                    return (
                      <tr key={sale.id} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="px-4 py-3 font-mono text-xs">
                          <Link href={`/sales/${sale.id}`} className="text-primary hover:underline">
                            {sale.invoiceNumber}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-right">{formatCurrency(sale.total)}</td>
                        <td className="px-4 py-3 text-right text-emerald-600">{formatCurrency(paid)}</td>
                        <td className="px-4 py-3 text-right font-semibold text-amber-600">{formatCurrency(saldo)}</td>
                        <td className="px-4 py-3 text-right text-muted-foreground">
                          {sale.dueDate ? new Date(sale.dueDate).toLocaleDateString('es-CO') : '—'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {st && (
                            <Badge variant="outline" className={getCreditStatusColor(st)}>
                              {getCreditStatusLabel(st)}
                            </Badge>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ShoppingCart className="h-5 w-5" />
            Historial de Compras
          </CardTitle>
          <CardDescription>{client.sales.length} ventas registradas</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {client.sales.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Este cliente no tiene compras registradas</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left px-4 py-3 font-medium">Factura</th>
                    <th className="text-left px-4 py-3 font-medium">Productos</th>
                    <th className="text-left px-4 py-3 font-medium">Método</th>
                    <th className="text-right px-4 py-3 font-medium">Total</th>
                    <th className="text-right px-4 py-3 font-medium">Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {client.sales.map((sale) => (
                    <tr key={sale.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3 font-mono text-xs">
                        <Link
                          href={`/sales/${sale.id}`}
                          className="inline-flex items-center gap-1 text-primary hover:underline"
                        >
                          <Receipt className="h-3 w-3" />
                          {sale.invoiceNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {sale.items.map((item) => `${item.quantity}× ${item.product.name}`).join(', ')}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-xs">
                          {getPaymentMethodLabel(sale.paymentMethod)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">{formatCurrency(sale.total)}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground">
                        {new Date(sale.saleDate).toLocaleDateString('es-CO')}
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
  )
}
