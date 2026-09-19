import Link from 'next/link'
import { ArrowLeft, ExternalLink, MessageCircle } from 'lucide-react'
import { notFound } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/format'
import { getAdminWebOrderById } from '@/modules/web/web.actions'
import { getWebSettings } from '@/modules/web/web.service'
import { buildWhatsAppHref, buildWhatsAppOrderMessage } from '@/modules/web/web.helpers'
import { getWebOrderStatusLabel, getWebOrderStatusColor } from '@/lib/labels'
import { WebOrderActions } from '@/components/web/web-order-actions'

export const dynamic = 'force-dynamic'

function fmtDate(d: Date | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default async function WebOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [order, settings] = await Promise.all([getAdminWebOrderById(id), getWebSettings()])
  if (!order) notFound()

  const waMessage =
    order.status === 'PENDING' || order.status === 'CONFIRMED'
      ? buildWhatsAppHref(
          order.customerPhone,
          buildWhatsAppOrderMessage({
            storeName: settings.storeName,
            customerName: order.customerName,
            reference: order.reference,
            status: order.status,
            items: order.items,
            total: order.total,
          }),
        )
      : null

  return (
    <div className="page-container py-6 space-y-6">
      <Link
        href="/web/orders"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Volver a pedidos web
      </Link>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle>Pedido {order.customerName}</CardTitle>
                  <CardDescription>
                    <span className="font-mono text-primary">{order.reference || 'Sin referencia'}</span> · Recibido{' '}
                    {fmtDate(order.createdAt)} · Teléfono {order.customerPhone}
                  </CardDescription>
                </div>
                <Badge className={getWebOrderStatusColor(order.status)} variant="outline">
                  {getWebOrderStatusLabel(order.status)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead>Cantidad</TableHead>
                    <TableHead>Precio unitario</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <p className="font-medium">{item.productName}</p>
                        {item.product?.slug && (
                          <Link
                            href={`/web/products/${item.product.id}`}
                            className="text-xs text-primary hover:underline"
                          >
                            /{item.product.slug}
                          </Link>
                        )}
                      </TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>{formatCurrency(item.unitPrice)}</TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(item.total)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell colSpan={3} className="text-right text-sm text-muted-foreground">
                      Total del pedido
                    </TableCell>
                    <TableCell className="text-right font-bold">{formatCurrency(order.total)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <WebOrderActions orderId={order.id} status={order.status} />
                {waMessage && (
                  <a href={waMessage} target="_blank" rel="noreferrer">
                    <Button variant="outline" size="sm" className="text-green-600">
                      <MessageCircle className="h-4 w-4" /> Enviar por WhatsApp
                    </Button>
                  </a>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Cliente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="font-medium">{order.customerName}</p>
              <p>{order.customerPhone}</p>
              {order.customerEmail && <p>{order.customerEmail}</p>}
            </CardContent>
          </Card>

          {order.notes ? (
            <Card>
              <CardHeader>
                <CardTitle>Nota del cliente</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">{order.notes}</p>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Trazabilidad</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Recibido</span>
                <span>{fmtDate(order.createdAt)}</span>
              </div>
              {order.confirmedAt && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">Confirmado (stock reservado)</span>
                  <span>{fmtDate(order.confirmedAt)}</span>
                </div>
              )}
              {order.status === 'CANCELLED' && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">Cancelado</span>
                  <span>{fmtDate(order.updatedAt)}</span>
                </div>
              )}
              {order.convertedSale && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">Convertido a venta</span>
                  <span>{fmtDate(order.convertedSale.saleDate)}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {order.convertedSale && (
            <Card>
              <CardHeader>
                <CardTitle>Venta POS</CardTitle>
                <CardDescription>Pedido convertido a venta {fmtDate(order.convertedSale.saleDate)}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Factura {order.convertedSale.invoiceNumber}</p>
                <p className="text-lg font-bold">{formatCurrency(order.convertedSale.total)}</p>
                <Link href={`/sales/${order.convertedSale.id}`}>
                  <Button variant="outline" size="sm" className="mt-2">
                    <ExternalLink className="h-4 w-4" /> Ver venta
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
