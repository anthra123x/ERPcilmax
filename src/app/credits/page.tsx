import Link from 'next/link'
import { Eye, HandCoins } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/ui/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { formatCurrency } from '@/lib/format'
import { getCreditSales, getCreditSummary } from '@/modules/sales/payments.actions'
import { getCreditStatusLabel, getCreditStatusColor } from '@/lib/labels'
import { RegistrarAbonoDialog } from '@/components/sales/registrar-abono-dialog'
import { CreditSearch } from '@/components/sales/credit-search'

export const dynamic = 'force-dynamic'

function paidOf(payments: Array<{ amount: number }>) {
  return payments.reduce((sum, p) => sum + p.amount, 0)
}

function fmtDate(d: Date | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-CO')
}

export default async function CreditsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; estado?: string; page?: string }>
}) {
  const sp = await searchParams
  const search = sp.search || ''
  const estado = (sp.estado as 'PAID' | 'OVERDUE' | 'PENDING' | 'ALL') || 'ALL'
  const page = Number(sp.page) || 1

  const pageSize = 20
  const summary = await getCreditSummary()
  const { credits, totalPages } = await getCreditSales(search || undefined, estado, page, pageSize)

  const estadoHref = (e: string) =>
    `/credits?${new URLSearchParams({ ...(search && { search }), estado: e }).toString()}`
  const pageHref = (p: number) =>
    `/credits?${new URLSearchParams({ ...(search && { search }), estado, page: String(p) }).toString()}`

  return (
    <div className="page-container py-6 space-y-6">
      <PageHeader
        title="Cartera de Créditos"
        description="Ventas a crédito, abonos y saldos pendientes"
        actions={
          <Link href="/credits/new">
            <Button>
              <HandCoins className="h-4 w-4" />
              Nueva Venta a Crédito
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Vendido a crédito</p>
            <p className="text-2xl font-bold">{formatCurrency(summary.sold)}</p>
            <p className="text-xs text-muted-foreground">{summary.count} ventas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Abonado</p>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(summary.collected)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Saldo pendiente</p>
            <p className="text-2xl font-bold text-amber-600">{formatCurrency(summary.pending)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Vencido</p>
            <p className="text-2xl font-bold text-red-600">{formatCurrency(summary.overdueAmount)}</p>
            <p className="text-xs text-muted-foreground">{summary.overdueCount} facturas</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {[
                { key: 'ALL', label: 'Todas' },
                { key: 'PENDING', label: 'Pendientes' },
                { key: 'OVERDUE', label: 'Vencidas' },
                { key: 'PAID', label: 'Pagadas' },
              ].map((f) => (
                <Link key={f.key} href={estadoHref(f.key)}>
                  <Badge variant={estado === f.key ? 'default' : 'outline'} className="cursor-pointer">
                    {f.label}
                  </Badge>
                </Link>
              ))}
            </div>
            <CreditSearch initialSearch={search} estado={estado} />
          </div>

          {credits.length === 0 ? (
            <EmptyState title="Sin ventas a crédito" description="No hay ventas a crédito que coincidan" />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Factura</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Abonado</TableHead>
                    <TableHead>Saldo</TableHead>
                    <TableHead>Vencimiento</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {credits.map((s) => {
                    const paid = paidOf(s.payments)
                    const saldo = s.total - paid
                    const status = s.creditStatus
                    return (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">{s.invoiceNumber}</TableCell>
                        <TableCell>{s.client?.name || '—'}</TableCell>
                        <TableCell>{formatCurrency(s.total)}</TableCell>
                        <TableCell>{formatCurrency(paid)}</TableCell>
                        <TableCell className="font-semibold">{formatCurrency(saldo)}</TableCell>
                        <TableCell>{fmtDate(s.dueDate)}</TableCell>
                        <TableCell>
                          {status && (
                            <Badge className={getCreditStatusColor(status)} variant="outline">
                              {getCreditStatusLabel(status)}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {status !== 'PAID' && (
                              <RegistrarAbonoDialog saleId={s.id} invoiceNumber={s.invoiceNumber} saldo={saldo} />
                            )}
                            <Link href={`/credits/${s.id}`}>
                              <Button variant="outline" size="icon-sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
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
                Página {page} de {totalPages}
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
