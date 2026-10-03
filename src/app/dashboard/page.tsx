'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  PlusCircle,
  RefreshCw,
  Calendar,
  ChevronDown,
  Search,
  MoreHorizontal,
  Eye,
  AlertTriangle,
  Info,
  FileSpreadsheet,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { EmptyState } from '@/components/ui/empty-state'
import { formatCurrency } from '@/lib/format'
import { getPaymentMethodLabel } from '@/lib/labels'
import { getDashboardStats } from '@/modules/dashboard/dashboard.actions'
import type { DashboardOverview } from '@/modules/dashboard/dashboard.service'
import { MiniSparkline, SalesTrendCard, RevenueBreakdownCard } from './charts'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

export default function DashboardPage() {
  const [data, setData] = useState<DashboardOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchTx, setSearchTx] = useState('')

  async function loadData(showRefresh = false) {
    if (showRefresh) setRefreshing(true)
    try {
      const res = await getDashboardStats()
      setData(res)
    } catch (err) {
      console.error('Error al cargar datos del dashboard:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        {/* Header skeleton */}
        <div className="flex justify-between items-center">
          <div className="h-8 w-64 bg-muted rounded-xl" />
          <div className="flex gap-2">
            <div className="h-9 w-28 bg-muted rounded-xl" />
            <div className="h-9 w-32 bg-muted rounded-xl" />
            <div className="h-9 w-28 bg-muted rounded-xl" />
          </div>
        </div>

        {/* 4 KPI cards skeleton */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-card rounded-2xl border border-border/80 p-4" />
          ))}
        </div>

        {/* 2 Middle cards skeleton */}
        <div className="grid gap-5 grid-cols-1 lg:grid-cols-12">
          <div className="h-96 lg:col-span-8 bg-card rounded-2xl border border-border/80" />
          <div className="h-96 lg:col-span-4 bg-card rounded-2xl border border-border/80" />
        </div>

        {/* Bottom table skeleton */}
        <div className="h-64 bg-card rounded-2xl border border-border/80" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="py-12">
        <EmptyState
          icon={AlertTriangle}
          title="Error al cargar el Dashboard"
          description="No se pudo obtener el estado operativo actual. Por favor verifica tu conexión y recarga."
          action={{ label: 'Recargar Datos', onClick: () => loadData(true) }}
        />
      </div>
    )
  }

  const {
    salesToday,
    salesThisMonth,
    incomeToday,
    pendingCreditTotal,
    pendingCreditClientsCount,
    webOrdersSummary,
    recentSales,
    salesByMonth,
    salesByPayment,
  } = data

  const todayFormatted = new Date().toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  // Filtrado de transacciones
  const filteredSales = recentSales.filter((sale) => {
    if (!searchTx.trim()) return true
    const q = searchTx.toLowerCase()
    return (
      sale.invoiceNumber.toLowerCase().includes(q) ||
      (sale.client?.name || '').toLowerCase().includes(q) ||
      sale.paymentMethod.toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-6">
      {/* ======================================================== */}
      {/* 1. HEADER SUPERIOR (Estilo 'Welcome back, Salung') */}
      {/* ======================================================== */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Bienvenido de nuevo</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Resumen comercial, liquidez operativa e inventario omnicanal en tiempo real.
          </p>
        </div>

        {/* Controles superiores (Pills y Botones estilo SaaS de la imagen) */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Selector de Periodo */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border/80 bg-card text-xs font-semibold text-foreground shadow-2xs cursor-default">
            <span>Hoy</span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </div>

          {/* Badge de Fecha */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border/80 bg-card text-xs font-medium text-muted-foreground shadow-2xs">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground/70" />
            <span className="font-mono">{todayFormatted}</span>
          </div>

          {/* Refrescar Datos */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="rounded-xl h-8.5 px-2.5 text-xs text-muted-foreground hover:text-foreground shadow-2xs"
            title="Refrescar datos"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>

          {/* Botón Principal Negro (+ Nueva Venta / Export CSV en la referencia) */}
          <Link
            href="/sales"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gray-950 text-white dark:bg-white dark:text-gray-950 text-xs font-semibold shadow-xs hover:bg-black transition-all active:scale-[0.98]"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            <span>Nueva Venta</span>
          </Link>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. FILA DE 4 KPI CARDS (Con Micro Sparklines estilo referencia) */}
      {/* ======================================================== */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {/* KPI 1: TOTAL REVENUE */}
        <Card className="rounded-2xl border border-border/80 bg-card p-4 shadow-2xs hover:shadow-sm transition-shadow">
          <CardContent className="p-0 space-y-2">
            <div className="flex items-start justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
                Facturación Hoy
              </span>
              <MiniSparkline values={[25, 40, 35, 65, 80, 50, 95]} />
            </div>

            <div>
              <div className="text-2xl font-bold tracking-tight font-mono text-foreground">
                {formatCurrency(salesToday.total)}
              </div>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-mono">
                  +{salesToday.count} ventas
                </span>
                <span className="text-[11px] text-muted-foreground font-mono">
                  Prom: {formatCurrency(salesToday.averageTicket)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPI 2: TOTAL ORDERS */}
        <Card className="rounded-2xl border border-border/80 bg-card p-4 shadow-2xs hover:shadow-sm transition-shadow">
          <CardContent className="p-0 space-y-2">
            <div className="flex items-start justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
                Tienda Online
              </span>
              <MiniSparkline values={[15, 30, 20, 45, 60, 40, 75]} />
            </div>

            <div>
              <div className="text-2xl font-bold tracking-tight font-mono text-foreground">
                {webOrdersSummary.pendingCount}{' '}
                <span className="text-sm font-normal text-muted-foreground">Órdenes</span>
              </div>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 font-mono">
                  {formatCurrency(webOrdersSummary.pendingOrdersTotal)}
                </span>
                <Link href="/web/orders" className="text-[11px] text-primary hover:underline font-medium">
                  Ver pedidos
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPI 3: NEW CUSTOMERS / RECAUDO EN CAJA */}
        <Card className="rounded-2xl border border-border/80 bg-card p-4 shadow-2xs hover:shadow-sm transition-shadow">
          <CardContent className="p-0 space-y-2">
            <div className="flex items-start justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
                Recaudo en Caja
              </span>
              <MiniSparkline values={[35, 55, 40, 70, 85, 65, 90]} />
            </div>

            <div>
              <div className="text-2xl font-bold tracking-tight font-mono text-emerald-600 dark:text-emerald-400">
                {formatCurrency(incomeToday)}
              </div>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-mono">
                  Disponible
                </span>
                <span className="text-[11px] text-muted-foreground">Contado y transferencias</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPI 4: CARTERA & CRÉDITOS */}
        <Card className="rounded-2xl border border-border/80 bg-card p-4 shadow-2xs hover:shadow-sm transition-shadow">
          <CardContent className="p-0 space-y-2">
            <div className="flex items-start justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
                Cartera por Cobrar
              </span>
              <MiniSparkline values={[45, 35, 50, 40, 60, 45, 55]} />
            </div>

            <div>
              <div className="text-2xl font-bold tracking-tight font-mono text-foreground">
                {formatCurrency(pendingCreditTotal)}
              </div>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-mono">
                  {pendingCreditClientsCount} clientes
                </span>
                <Link href="/credits" className="text-[11px] text-primary hover:underline font-medium">
                  Cobrar saldo
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ======================================================== */}
      {/* 3. FILA CENTRAL: SALES TREND Y REVENUE BREAKDOWN */}
      {/* ======================================================== */}
      <div className="grid gap-5 grid-cols-1 lg:grid-cols-12">
        {/* Columna Izquierda: Tendencia de Ventas (Sales Trend) */}
        <div className="lg:col-span-8 flex flex-col">
          <SalesTrendCard data={salesByMonth || []} totalRevenue={salesThisMonth?.total || salesToday.total || 0} />
        </div>

        {/* Columna Derecha: Revenue Breakdown & AI Insight */}
        <div className="lg:col-span-4 flex flex-col">
          <RevenueBreakdownCard
            paymentData={salesByPayment || []}
            totalRevenue={salesThisMonth?.total || salesToday.total || 0}
          />
        </div>
      </div>

      {/* ======================================================== */}
      {/* 4. TABLA INFERIOR: RECENT TRANSACTIONS (Estilo de la referencia) */}
      {/* ======================================================== */}
      <Card className="rounded-2xl border border-border/80 bg-card shadow-2xs overflow-hidden">
        {/* Header de la tabla */}
        <div className="p-5 pb-3 border-b border-border/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80 flex items-center gap-1.5">
              Transacciones Recientes
              <Info className="h-3 w-3 text-muted-foreground/50" />
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative w-48 sm:w-60">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/70" />
              <Input
                type="search"
                placeholder="Buscar por cliente o factura..."
                value={searchTx}
                onChange={(e) => setSearchTx(e.target.value)}
                className="h-8.5 pl-8 pr-3 text-xs rounded-xl bg-muted/40 border-border/70"
              />
            </div>

            <Button
              render={<Link href="/sales" />}
              size="sm"
              className="h-8.5 rounded-xl px-3 text-xs font-semibold bg-gray-950 text-white dark:bg-white dark:text-gray-950 hover:bg-black shadow-2xs"
            >
              <PlusCircle className="h-3.5 w-3.5 mr-1" />
              Nueva Venta
            </Button>
          </div>
        </div>

        {/* Cuerpo de la tabla */}
        <div className="overflow-x-auto">
          {filteredSales.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              No se encontraron transacciones registradas.
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs min-w-[760px]">
              <thead>
                <tr className="bg-muted/30 border-b border-border/60 text-muted-foreground uppercase text-[10px] font-bold tracking-wider">
                  <th className="py-2.5 px-4 w-10">
                    <input
                      type="checkbox"
                      aria-label="Seleccionar todo"
                      className="rounded border-border text-primary focus:ring-primary/20 cursor-pointer"
                    />
                  </th>
                  <th className="py-2.5 px-4">Factura ID</th>
                  <th className="py-2.5 px-4">Cliente</th>
                  <th className="py-2.5 px-4">Método / Canal</th>
                  <th className="py-2.5 px-4">Estado</th>
                  <th className="py-2.5 px-4">Fecha</th>
                  <th className="py-2.5 px-4 text-right">Total</th>
                  <th className="py-2.5 px-4 text-center w-16">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 font-normal">
                {filteredSales.map((sale) => {
                  const isCredit = sale.paymentMethod === 'CREDITO'
                  const statusLabel = isCredit ? 'En Crédito' : 'Completada'
                  const statusDotColor = isCredit ? 'bg-amber-500' : 'bg-emerald-500'
                  const statusBadgeColor = isCredit
                    ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20'
                    : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'

                  return (
                    <tr key={sale.id} className="hover:bg-muted/30 transition-colors group">
                      <td className="py-3 px-4">
                        <input
                          type="checkbox"
                          aria-label={`Seleccionar factura ${sale.invoiceNumber}`}
                          className="rounded border-border text-primary focus:ring-primary/20 cursor-pointer"
                        />
                      </td>

                      <td className="py-3 px-4 font-mono font-bold text-foreground">
                        <Link href={`/sales/${sale.id}`} className="hover:underline">
                          {sale.invoiceNumber}
                        </Link>
                      </td>

                      <td className="py-3 px-4 font-medium text-foreground">
                        {sale.client?.name || 'Cliente Mostrador'}
                      </td>

                      <td className="py-3 px-4 text-muted-foreground">{getPaymentMethodLabel(sale.paymentMethod)}</td>

                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusBadgeColor}`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${statusDotColor}`} />
                          {statusLabel}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-muted-foreground font-mono text-[11px]">
                        {new Date(sale.saleDate).toLocaleDateString('es-CO', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>

                      <td className="py-3 px-4 text-right font-mono font-bold text-foreground">
                        {formatCurrency(sale.total)}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer outline-none">
                            <MoreHorizontal className="h-4 w-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-36 rounded-xl border-border shadow-lg p-1">
                            <DropdownMenuItem
                              render={<Link href={`/sales/${sale.id}`} />}
                              className="cursor-pointer text-xs rounded-lg py-1.5"
                            >
                              <Eye className="mr-2 h-3.5 w-3.5" />
                              Ver Detalle
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              render={<Link href={`/sales/${sale.id}/invoice`} />}
                              className="cursor-pointer text-xs rounded-lg py-1.5"
                            >
                              <FileSpreadsheet className="mr-2 h-3.5 w-3.5" />
                              Factura PDF
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  )
}
