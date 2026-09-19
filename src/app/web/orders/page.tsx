import Link from 'next/link'
import { Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/ui/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { formatCurrency } from '@/lib/format'
import { getAdminWebOrders } from '@/modules/web/web.actions'
import { getWebOrderStatusLabel, getWebOrderStatusColor } from '@/lib/labels'
import { WebOrderActions } from '@/components/web/web-order-actions'
import { WebOrderSearch } from '@/components/web/web-order-search'

export const dynamic = 'force-dynamic'

function fmtDate(d: Date) {
  return new Date(d).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default async function WebOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; page?: string; buscar?: string }>
}) {
  const sp = await searchParams
  const estado = (sp.estado as string) || 'ALL'
  const page = Number(sp.page) || 1
  const buscar = sp.buscar || ''
  const pageSize = 20

  const { orders, total, totalPages } = await getAdminWebOrders(estado, page, pageSize, buscar)

  const estadoHref = (e: string) => `/web/orders?${new URLSearchParams({ estado: e }).toString()}`
  const pageHref = (p: number) =>
    `/web/orders?${new URLSearchParams({ estado, page: String(p), ...(buscar ? { buscar } : {}) }).toString()}`

  return (
    <div className="page-container py-6 space-y-6">
      <PageHeader title="Pedidos web" description="Pedidos recibidos de la tienda. Confirma y reserva stock, o conviértelos en venta POS." />

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {[
                { key: 'ALL', label: 'Todos' },
                { key: 'PENDING', label: 'Pendientes' },
                { key: 'CONFIRMED', label: 'Confirmados' },
                { key: 'CONVERTED', label: 'Convertidos' },
                { key: 'CANCELLED', label: 'Cancelados' },
              ].map((f) => (
                <Link key={f.key} href={estadoHref(f.key)}>
                  <Badge variant={estado === f.key ? 'default' : 'outline'} className="cursor-pointer">
                    {f.label}
                  </Badge>
                </Link>
              ))}
            </div>
            <WebOrderSearch search={buscar} />
          </div>

          {orders.length === 0 ? (
            <EmptyState title="Sin pedidos web" description="No hay pedidos que coincidan con el filtro." />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Referencia</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Productos</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell>
                        <span className="font-mono text-xs font-semibold text-primary">{o.reference || '—'}</span>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">{o.customerName}</p>
                        <p className="text-xs text-muted-foreground">{o.customerPhone}</p>
                      </TableCell>
                      <TableCell>
                        <p className="max-w-xs truncate text-sm text-muted-foreground">
                          {o.items.map((i) => `${i.productName} ×${i.quantity}`).join(', ')}
                        </p>
                      </TableCell>
                      <TableCell className="font-semibold">{formatCurrency(o.total)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{fmtDate(o.createdAt)}</TableCell>
                      <TableCell>
                        <Badge className={getWebOrderStatusColor(o.status)} variant="outline">
                          {getWebOrderStatusLabel(o.status)}
                        </Badge>
                        {o.convertedSale && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            <Link href={`/sales/${o.convertedSale.id}`} className="text-primary hover:underline">
                              {o.convertedSale.invoiceNumber}
                            </Link>
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <WebOrderActions orderId={o.id} status={o.status} />
                          <Link href={`/web/orders/${o.id}`}>
                            <Button variant="outline" size="icon-sm" title="Ver detalle">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3">
              {page > 1 && (
                <Link href={pageHref(page - 1)}>
                  <Button variant="outline" size="sm">
                    Anterior
                  </Button>
                </Link>
              )}
              <span className="text-sm text-muted-foreground">
                Página {page} de {totalPages} ({total} pedidos)
              </span>
              {page < totalPages && (
                <Link href={pageHref(page + 1)}>
                  <Button variant="outline" size="sm">
                    Siguiente
                  </Button>
                </Link>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
