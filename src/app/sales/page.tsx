'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Search, Ban, Receipt, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/ui/page-header'
import { Pagination } from '@/components/ui/pagination'
import { formatCurrency } from '@/lib/format'
import { getCreditStatus, getCreditStatusColor, getCreditStatusLabel, getPaymentMethodLabel } from '@/lib/labels'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { getSales, deleteSale } from '@/modules/sales/sales.actions'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { SalesInspectorLayout } from '@/components/sales/sales-inspector-layout'

interface Sale {
  id: string
  invoiceNumber: string
  subtotal: number
  discount: number
  total: number
  paymentMethod: string
  status: string
  saleDate: Date
  dueDate: Date | null
  client: { id: string; name: string; phone: string | null } | null
  items: Array<{ id: string; quantity: number; total: number; product: { name: string } }>
  payments: Array<{ amount: number }>
}

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalSales, setTotalSales] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [saleToCancel, setSaleToCancel] = useState<Sale | null>(null)
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null)
  const pageSize = 20

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const invoiceId = params.get('invoiceId') || params.get('openInvoice')
      if (invoiceId) {
        setSelectedSaleId(invoiceId)
      }
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    loadSales()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, page])

  async function loadSales() {
    try {
      setLoading(true)
      const result = await getSales(debouncedSearch || undefined, page, pageSize)
      setSales(result.sales)
      setTotalSales(result.total)
      setTotalPages(result.totalPages)
    } catch {
      console.error('Error loading sales')
    } finally {
      setLoading(false)
    }
  }

  async function handleDeleteSale(sale: Sale) {
    const result = await deleteSale(sale.id)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Venta eliminada')
      if (selectedSaleId === sale.id) {
        setSelectedSaleId(null)
      }
      await loadSales()
    }
    setCancelDialogOpen(false)
    setSaleToCancel(null)
  }

  if (loading && sales.length === 0) {
    return (
      <div className="py-2 space-y-6">
        <Skeleton className="h-9 w-48" />
        <Card>
          <CardContent className="p-6 space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="py-2 space-y-6">
      <PageHeader
        title="Ventas"
        description="Consulta las ventas realizadas y registra nuevas"
        actions={
          <Link href="/sales/new">
            <Button>
              <Plus className="h-4 w-4" />
              Nueva Venta
            </Button>
          </Link>
        }
      />

      {/* Contenedor Split: la tabla conserva la jerarquía y el panel de factura ocupa ancho fijo compacto */}
      <SalesInspectorLayout
        selectedSaleId={selectedSaleId}
        onClose={() => {
          setSelectedSaleId(null)
        }}
      >
        <Card>
          <CardHeader className="pb-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por factura, cliente..."
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table className="min-w-[680px]">
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Factura</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Productos</TableHead>
                    <TableHead>Método</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sales.map((sale) => {
                    const isSelected = selectedSaleId === sale.id

                    return (
                      <TableRow
                        key={sale.id}
                        className={cn(
                          'transition-colors duration-150',
                          isSelected && 'bg-primary/5 dark:bg-primary/10 border-l-4 border-l-primary font-medium',
                        )}
                      >
                        <TableCell>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedSaleId((prev) => (prev === sale.id ? null : sale.id))
                            }}
                            className={cn(
                              'font-mono text-sm font-semibold hover:underline cursor-pointer text-left focus:outline-hidden',
                              isSelected ? 'text-primary' : 'text-foreground',
                            )}
                            title="Inspeccionar Factura"
                          >
                            {sale.invoiceNumber}
                          </button>
                        </TableCell>
                        <TableCell>
                          {sale.client ? (
                            <div>
                              <div className="text-sm font-medium">{sale.client.name}</div>
                              {sale.client.phone && (
                                <div className="text-xs text-muted-foreground font-mono">{sale.client.phone}</div>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {sale.items.length} {sale.items.length === 1 ? 'producto' : 'productos'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{getPaymentMethodLabel(sale.paymentMethod)}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium font-mono">{formatCurrency(sale.total)}</TableCell>
                        <TableCell>
                          <div className="flex flex-col items-start gap-1">
                            {sale.status === 'COMPLETED' ? (
                              <Badge variant="default" className="bg-emerald-600 dark:bg-emerald-500">
                                Completada
                              </Badge>
                            ) : (
                              <Badge variant="destructive">Anulada</Badge>
                            )}
                            {(() => {
                              const cs = getCreditStatus(sale)
                              return cs ? (
                                <Badge variant="outline" className={getCreditStatusColor(cs)}>
                                  {getCreditStatusLabel(cs)}
                                </Badge>
                              ) : null
                            })()}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(sale.saleDate).toLocaleDateString('es-CO')}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant={isSelected ? 'default' : 'outline'}
                              size="sm"
                              className={cn(
                                'h-8 gap-1 text-xs rounded-xl cursor-pointer transition-all',
                                isSelected && 'bg-primary text-primary-foreground shadow-xs',
                              )}
                              title="Inspeccionar Factura y Vista Previa DIAN"
                              onClick={() => {
                                setSelectedSaleId((prev) => (prev === sale.id ? null : sale.id))
                              }}
                            >
                              <Receipt className="h-3.5 w-3.5" />
                              Factura
                            </Button>
                            {sale.status === 'COMPLETED' && (
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                title="Anular venta"
                                onClick={() => {
                                  setSaleToCancel(sale)
                                  setCancelDialogOpen(true)
                                }}
                              >
                                <Ban className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>

            {sales.length === 0 && (
              <EmptyState
                icon={Receipt}
                title={search ? 'Sin resultados' : 'Sin ventas'}
                description={search ? 'No hay ventas que coincidan' : 'Registra tu primera venta'}
                action={search ? undefined : { label: 'Nueva Venta', href: '/sales/new' }}
              />
            )}

            {totalPages > 1 && (
              <Pagination
                page={page}
                totalPages={totalPages}
                total={totalSales}
                entity="ventas"
                onPageChange={(p) => setPage(p)}
              />
            )}
          </CardContent>
        </Card>
      </SalesInspectorLayout>

      {/* Diálogo de Confirmación para Anular Venta */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Eliminar venta?</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar la venta {saleToCancel?.invoiceNumber}? Se devolverá el stock y ya no
              se contará en las ventas del día.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={() => saleToCancel && handleDeleteSale(saleToCancel)}>
              Eliminar Venta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
