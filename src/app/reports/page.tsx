'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { FileText, Filter, Users, ShoppingCart, Package, Search, FileSpreadsheet } from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/format'
import { generateReportData } from '@/modules/reports/reports.actions'
import { exportSalesToExcel, exportInventoryToExcel, exportClientsToExcel } from '@/modules/export/export.actions'
import { getPaymentMethodLabel } from '@/lib/labels'

type SortDir = 'asc' | 'desc'

function sortData<T>(data: T[], sortKey: string, sortDir: SortDir, fn: (item: T) => number | string): T[] {
  if (!sortKey) return data
  return [...data].sort((a, b) => {
    const va = fn(a)
    const vb = fn(b)
    const cmp = typeof va === 'string' ? va.localeCompare(vb as string) : (va as number) - (vb as number)
    return sortDir === 'asc' ? cmp : -cmp
  })
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th
      className={`text-left px-3 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wider ${className || ''}`}
    >
      {children}
    </th>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-12">
      <Search className="mx-auto h-8 w-8 text-muted-foreground" />
      <p className="mt-2 text-sm text-muted-foreground">{message}</p>
    </div>
  )
}

function MetricCard({ title, value, className }: { title: string; value: unknown; className?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className={`text-2xl font-bold ${className || ''}`}>{String(value ?? 0)}</div>
        <p className="text-sm text-muted-foreground">{title}</p>
      </CardContent>
    </Card>
  )
}

export default function ReportsPage() {
  const [selectedReport, setSelectedReport] = useState<string>('sales')
  const [filters, setFilters] = useState<Record<string, string>>({ status: '' })
  const [reportData, setReportData] = useState<unknown>(null)
  const [loading, setLoading] = useState(false)
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' })
  const [sortKey, setSortKey] = useState<string>('')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [detailSearch, setDetailSearch] = useState('')

  function handleReportChange(value: string) {
    if (value !== selectedReport) {
      setSelectedReport(value)
      setReportData(null)
      setDetailSearch('')
      setSortKey('')
      setSortDir('desc')
    }
  }

  function buildFilters(): Record<string, unknown> {
    return {
      ...filters,
      ...(dateRange.startDate &&
        dateRange.endDate && {
          startDate: new Date(dateRange.startDate),
          endDate: new Date(dateRange.endDate + 'T23:59:59'),
        }),
    }
  }

  async function generateReport() {
    setLoading(true)
    try {
      const data = await generateReportData(selectedReport, buildFilters())
      setReportData(data)
    } catch (error) {
      console.error('Error generating report:', error)
      toast.error('Error al generar el reporte')
    } finally {
      setLoading(false)
    }
  }

  async function handleExport() {
    setLoading(true)
    try {
      let result
      if (selectedReport === 'sales' || selectedReport === 'channel') {
        result = await exportSalesToExcel()
      } else if (selectedReport === 'inventory') {
        result = await exportInventoryToExcel()
      } else {
        result = await exportClientsToExcel()
      }
      if (result && 'success' in result && (result as { success: boolean }).success) {
        const r = result as { data?: string; filename?: string }
        const link = document.createElement('a')
        const mime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        link.href = `data:${mime};base64,${r.data || ''}`
        link.download = r.filename || ''
        link.click()
        toast.success('Reporte exportado a Excel')
      } else {
        toast.error('Error al exportar')
      }
    } catch {
      toast.error('Error al exportar a Excel')
    } finally {
      setLoading(false)
    }
  }

  const reportTitle = useMemo(() => {
    if (selectedReport === 'sales') return 'Reporte de Ventas'
    if (selectedReport === 'inventory') return 'Reporte de Inventario'
    if (selectedReport === 'channel') return 'Ventas por Canal'
    return 'Reporte de Clientes'
  }, [selectedReport])

  const detailsContent = useMemo(() => {
    if (!reportData) return null
    if (selectedReport === 'sales') {
      return (
        <SalesDetails
          data={(reportData as { sales: unknown[] }).sales || []}
          sortKey={sortKey}
          sortDir={sortDir}
          detailSearch={detailSearch}
        />
      )
    }
    if (selectedReport === 'inventory') {
      return (
        <InventoryDetails
          data={(reportData as { products: unknown[] }).products || []}
          sortKey={sortKey}
          sortDir={sortDir}
          detailSearch={detailSearch}
        />
      )
    }
    if (selectedReport === 'channel') {
      return <ChannelDetails data={(reportData as { sales: unknown[] }).sales || []} />
    }
    return (
      <ClientsDetails
        data={(reportData as { clients: unknown[] }).clients || []}
        sortKey={sortKey}
        sortDir={sortDir}
        detailSearch={detailSearch}
      />
    )
  }, [reportData, selectedReport, sortKey, sortDir, detailSearch])

  return (
    <div className="container mx-auto py-6 min-h-screen space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Reportes</h1>
        <p className="text-muted-foreground">Genera y exporta reportes de la tienda</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Configuración
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="reportType">Tipo de Reporte</Label>
              <Select
                value={selectedReport}
                onValueChange={(value: string | null) => value && handleReportChange(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sales">Ventas</SelectItem>
                  <SelectItem value="inventory">Inventario</SelectItem>
                  <SelectItem value="clients">Clientes</SelectItem>
                  <SelectItem value="channel">Ventas por canal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(selectedReport === 'sales' || selectedReport === 'clients' || selectedReport === 'channel') && (
              <>
                <div>
                  <Label htmlFor="startDate">Fecha Inicio</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={dateRange.startDate}
                    onChange={(e) => setDateRange((prev) => ({ ...prev, startDate: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="endDate">Fecha Fin</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={dateRange.endDate}
                    onChange={(e) => setDateRange((prev) => ({ ...prev, endDate: e.target.value }))}
                  />
                </div>
              </>
            )}

            {selectedReport === 'sales' && (
              <div>
                <Label htmlFor="status">Estado</Label>
                <Select
                  value={filters.status}
                  onValueChange={(value) => setFilters((prev) => ({ ...prev, status: value || '' }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos</SelectItem>
                    <SelectItem value="COMPLETED">Completada</SelectItem>
                    <SelectItem value="CANCELLED">Anulada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Button onClick={generateReport} disabled={loading} className="w-full">
                {loading ? 'Generando...' : 'Generar Reporte'}
              </Button>
              {reportData !== null && (
                <Button onClick={handleExport} disabled={loading} variant="outline" size="sm" className="w-full">
                  <FileSpreadsheet className="h-4 w-4 mr-1.5" />
                  Exportar Excel
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              {selectedReport === 'sales' && <ShoppingCart className="h-5 w-5" />}
              {selectedReport === 'inventory' && <Package className="h-5 w-5" />}
              {selectedReport === 'clients' && <Users className="h-5 w-5" />}
              {reportTitle}
            </CardTitle>
            <CardDescription>
              {reportData ? 'Reporte generado exitosamente' : 'Selecciona un tipo de reporte y haz clic en generar'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!reportData ? (
              <div className="text-center py-12">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                <p className="mt-2 text-muted-foreground">
                  Configura los filtros y genera un reporte para ver los resultados
                </p>
              </div>
            ) : (
              <Tabs defaultValue="summary" className="space-y-6">
                <TabsList>
                  <TabsTrigger value="summary">Resumen</TabsTrigger>
                  <TabsTrigger value="details">Detalles</TabsTrigger>
                </TabsList>

                <TabsContent value="summary" className="space-y-6">
                  <ReportSummary reportType={selectedReport} data={reportData} />
                </TabsContent>

                <TabsContent value="details" className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Buscar en detalles..."
                      value={detailSearch}
                      onChange={(e) => setDetailSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  {detailsContent}
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function ReportSummary({ reportType, data }: { reportType: string; data: unknown }) {
  if (reportType === 'channel') {
    const summary = (
      data as {
        summary: {
          totalSales: number
          webSales: number
          posSales: number
          webRevenue: number
          posRevenue: number
          webPercentage: number
        }
      }
    ).summary
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard title="Total Ventas" value={summary.totalSales} />
          <MetricCard title="Ventas Web" value={summary.webSales} className="text-primary" />
          <MetricCard title="Ventas POS" value={summary.posSales} className="text-orange-600" />
          <MetricCard title="% Web" value={`${summary.webPercentage}%`} className="text-green-600" />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <MetricCard title="Ingresos por Web" value={formatCurrency(summary.webRevenue)} className="text-primary" />
          <MetricCard title="Ingresos por POS" value={formatCurrency(summary.posRevenue)} className="text-orange-600" />
        </div>
        <div>
          <div className="flex h-4 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="bg-primary transition-all"
              style={{ width: `${summary.webPercentage}%` }}
              title={`Web ${summary.webPercentage}%`}
            />
            <div
              className="bg-orange-400 transition-all"
              style={{ width: `${100 - summary.webPercentage}%` }}
              title={`POS ${100 - summary.webPercentage}%`}
            />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Distribución de ventas por canal</p>
        </div>
      </div>
    )
  }
  if (reportType === 'sales') {
    const summary = (
      data as { summary: { totalSales: number; totalRevenue: number; discountSum: number; averageSale: number } }
    ).summary
    return (
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard title="Total Ventas" value={summary.totalSales} />
        <MetricCard title="Ingresos" value={formatCurrency(summary.totalRevenue)} className="text-green-600" />
        <MetricCard title="Descuentos" value={formatCurrency(summary.discountSum)} className="text-orange-600" />
        <MetricCard title="Promedio por Venta" value={formatCurrency(summary.averageSale)} className="text-primary" />
      </div>
    )
  }
  if (reportType === 'inventory') {
    const summary = (
      data as {
        summary: {
          totalProducts: number
          inventoryValue: number
          saleValue: number
          totalUnits: number
          lowStockCount: number
        }
      }
    ).summary
    return (
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard title="Total Productos" value={summary.totalProducts} />
        <MetricCard title="Valor al Costo" value={formatCurrency(summary.inventoryValue)} className="text-orange-600" />
        <MetricCard title="Valor de Venta" value={formatCurrency(summary.saleValue)} className="text-green-600" />
        <MetricCard title="Unidades Totales" value={summary.totalUnits} />
        <MetricCard title="Stock Bajo" value={summary.lowStockCount} className="text-destructive" />
      </div>
    )
  }
  const summary = (
    data as { summary: { totalClients: number; totalSpent: number; averageSpent: number; newClients: number } }
  ).summary
  return (
    <div className="grid gap-4 md:grid-cols-4">
      <MetricCard title="Total Clientes" value={summary.totalClients} />
      <MetricCard title="Gasto Total" value={formatCurrency(summary.totalSpent)} className="text-green-600" />
      <MetricCard title="Gasto Promedio" value={formatCurrency(summary.averageSpent)} className="text-purple-600" />
      <MetricCard title="Nuevos Clientes" value={summary.newClients} className="text-primary" />
    </div>
  )
}

function ChannelDetails({ data }: { data: unknown[] }) {
  if (data.length === 0)
    return <EmptyState message="No hay ventas registradas en este período" />

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <Th>Factura</Th>
              <Th>Fecha</Th>
              <Th>Cliente</Th>
              <Th>Canal</Th>
              <Th className="text-right">Total</Th>
              <Th>Estado</Th>
            </tr>
          </thead>
          <tbody>
            {(data as Array<Record<string, unknown>>).map((sale) => (
              <tr key={sale.id as string} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                <td className="px-3 py-2.5 font-mono text-xs">{sale.invoiceNumber as string}</td>
                <td className="px-3 py-2.5 text-muted-foreground text-xs">
                  {new Date(sale.saleDate as string).toLocaleDateString('es-CO')}
                </td>
                <td className="px-3 py-2.5 font-medium">
                  {(sale.client as Record<string, string> | null)?.name || 'Mostrador'}
                </td>
                <td className="px-3 py-2.5">
                  <Badge variant={sale.channel === 'WEB' ? 'default' : 'outline'} className="text-xs">
                    {sale.channel === 'WEB' ? 'Web' : 'POS'}
                  </Badge>
                </td>
                <td className="px-3 py-2.5 text-right font-semibold">{formatCurrency(sale.total as number)}</td>
                <td className="px-3 py-2.5">
                  <Badge variant={sale.status === 'COMPLETED' ? 'default' : 'destructive'} className="text-xs">
                    {sale.status === 'COMPLETED' ? 'Completada' : 'Anulada'}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function SalesDetails({
  data,
  sortKey,
  sortDir,
  detailSearch,
}: {
  data: unknown[]
  sortKey: string
  sortDir: SortDir
  detailSearch: string
}) {
  const filtered = useMemo(() => {
    if (!detailSearch) return data
    const q = detailSearch.toLowerCase()
    return (data as Array<Record<string, unknown>>).filter(
      (r) =>
        String(r.invoiceNumber || '')
          .toLowerCase()
          .includes(q) || ((r.client as Record<string, string> | null)?.name || '').toLowerCase().includes(q),
    )
  }, [data, detailSearch])

  const sorted = useMemo(
    () =>
      sortData(filtered, sortKey, sortDir, (r) => {
        const rec = r as Record<string, unknown>
        switch (sortKey) {
          case 'invoice':
            return String(rec.invoiceNumber || '')
          case 'client':
            return (rec.client as Record<string, string> | null)?.name || ''
          case 'total':
            return rec.total as number
          case 'date':
            return new Date(rec.saleDate as string).getTime()
          default:
            return new Date(rec.saleDate as string).getTime()
        }
      }),
    [filtered, sortKey, sortDir],
  )

  if (filtered.length === 0)
    return (
      <EmptyState
        message={detailSearch ? 'No se encontraron ventas con ese filtro' : 'No hay ventas registradas en este período'}
      />
    )

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <Th>Factura</Th>
              <Th>Fecha</Th>
              <Th>Cliente</Th>
              <Th>Método</Th>
              <Th className="text-right">Total</Th>
              <Th>Estado</Th>
            </tr>
          </thead>
          <tbody>
            {(sorted as Array<Record<string, unknown>>).map((sale) => (
              <tr key={sale.id as string} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                <td className="px-3 py-2.5 font-mono text-xs">{sale.invoiceNumber as string}</td>
                <td className="px-3 py-2.5 text-muted-foreground text-xs">
                  {new Date(sale.saleDate as string).toLocaleDateString('es-CO')}
                </td>
                <td className="px-3 py-2.5 font-medium">
                  {(sale.client as Record<string, string> | null)?.name || 'Mostrador'}
                </td>
                <td className="px-3 py-2.5">
                  <Badge variant="outline" className="text-xs">
                    {getPaymentMethodLabel(sale.paymentMethod as string)}
                  </Badge>
                </td>
                <td className="px-3 py-2.5 text-right font-semibold">{formatCurrency(sale.total as number)}</td>
                <td className="px-3 py-2.5">
                  <Badge variant={sale.status === 'COMPLETED' ? 'default' : 'destructive'} className="text-xs">
                    {sale.status === 'COMPLETED' ? 'Completada' : 'Anulada'}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function InventoryDetails({
  data,
  sortKey,
  sortDir,
  detailSearch,
}: {
  data: unknown[]
  sortKey: string
  sortDir: SortDir
  detailSearch: string
}) {
  const filtered = useMemo(() => {
    if (!detailSearch) return data
    const q = detailSearch.toLowerCase()
    return (data as Array<Record<string, unknown>>).filter(
      (r) =>
        String(r.name || '')
          .toLowerCase()
          .includes(q) || ((r.category as Record<string, string> | null)?.name || '').toLowerCase().includes(q),
    )
  }, [data, detailSearch])

  const sorted = useMemo(
    () =>
      sortData(filtered, sortKey, sortDir, (r) => {
        const rec = r as Record<string, unknown>
        switch (sortKey) {
          case 'name':
            return String(rec.name || '')
          case 'stock':
            return rec.stock as number
          case 'value':
            return (rec.costPrice as number) * (rec.stock as number)
          default:
            return String(rec.name || '')
        }
      }),
    [filtered, sortKey, sortDir],
  )

  if (filtered.length === 0)
    return (
      <EmptyState
        message={detailSearch ? 'No se encontraron productos con ese filtro' : 'No hay productos registrados'}
      />
    )

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <Th>Producto</Th>
              <Th>Categoría</Th>
              <Th>Costo</Th>
              <Th>Precio</Th>
              <Th className="text-right">Stock</Th>
            </tr>
          </thead>
          <tbody>
            {(sorted as Array<Record<string, unknown>>).map((product) => (
              <tr key={product.id as string} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                <td className="px-3 py-2.5 font-medium">{product.name as string}</td>
                <td className="px-3 py-2.5 text-xs text-muted-foreground">
                  {(product.category as Record<string, string> | null)?.name || '—'}
                </td>
                <td className="px-3 py-2.5 text-orange-600">{formatCurrency(product.costPrice as number)}</td>
                <td className="px-3 py-2.5 font-semibold">{formatCurrency(product.salePrice as number)}</td>
                <td className="px-3 py-2.5 text-right">
                  <Badge
                    variant={
                      (product.stock as number) <= (product.lowStockThreshold as number) ? 'destructive' : 'outline'
                    }
                    className="text-xs"
                  >
                    {product.stock as number}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ClientsDetails({
  data,
  sortKey,
  sortDir,
  detailSearch,
}: {
  data: unknown[]
  sortKey: string
  sortDir: SortDir
  detailSearch: string
}) {
  const filtered = useMemo(() => {
    if (!detailSearch) return data
    const q = detailSearch.toLowerCase()
    return (data as Array<Record<string, unknown>>).filter(
      (c) =>
        String(c.name || '')
          .toLowerCase()
          .includes(q) ||
        String(c.phone || '')
          .toLowerCase()
          .includes(q) ||
        String(c.email || '')
          .toLowerCase()
          .includes(q),
    )
  }, [data, detailSearch])

  const sorted = useMemo(
    () =>
      sortData(filtered, sortKey, sortDir, (c) => {
        const cl = c as Record<string, unknown>
        switch (sortKey) {
          case 'name':
            return String(cl.name || '')
          case 'spent':
            return (cl.totalSpent as number) || 0
          default:
            return String(cl.name || '')
        }
      }),
    [filtered, sortKey, sortDir],
  )

  if (filtered.length === 0)
    return (
      <EmptyState
        message={detailSearch ? 'No se encontraron clientes con ese filtro' : 'No hay clientes registrados'}
      />
    )

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <Th>Nombre</Th>
              <Th>Teléfono</Th>
              <Th>Email</Th>
              <Th className="text-right">Total Gastado</Th>
              <Th className="text-right">Compras</Th>
            </tr>
          </thead>
          <tbody>
            {(sorted as Array<Record<string, unknown>>).map((client) => (
              <tr key={client.id as string} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                <td className="px-3 py-2.5 font-medium">{client.name as string}</td>
                <td className="px-3 py-2.5 text-xs text-muted-foreground">{String(client.phone || '—')}</td>
                <td className="px-3 py-2.5 text-xs text-muted-foreground max-w-32 truncate">
                  {String(client.email || '—')}
                </td>
                <td className="px-3 py-2.5 text-right font-semibold">
                  {formatCurrency((client.totalSpent as number) || 0)}
                </td>
                <td className="px-3 py-2.5 text-right">{(client.totalTransactions as number) || 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
