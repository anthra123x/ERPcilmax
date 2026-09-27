'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ShoppingCart,
  TrendingUp,
  ShoppingBag,
  Package,
  AlertTriangle,
  ArrowRight,
  HandCoins,
  Bot,
  PlusCircle,
  Clock,
  Sparkles,
  Phone,
  Wallet,
  RefreshCw,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { formatCurrency, formatNumber } from '@/lib/format'
import { getPaymentMethodLabel } from '@/lib/labels'
import { getDashboardStats } from '@/modules/dashboard/dashboard.actions'
import type { DashboardOverview } from '@/modules/dashboard/dashboard.service'
import { PaymentDonut, SalesMonthlyBar, TopProductsBar, LowStockList } from './charts'

export default function DashboardPage() {
  const [data, setData] = useState<DashboardOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

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
        <div className="h-12 w-80 bg-muted" />
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-28 bg-muted border border-border" />
          ))}
        </div>
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
          <div className="h-64 bg-muted border border-border" />
          <div className="h-64 bg-muted border border-border" />
        </div>
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
    incomeToday,
    pendingCreditTotal,
    pendingCreditClientsCount,
    webOrdersSummary,
    inventorySummary,
    recentSales,
  } = data

  const hasPendingOrders = webOrdersSummary.pendingCount > 0
  const hasLowStock = inventorySummary.lowStockCount > 0
  const hasOutOfStock = inventorySummary.outOfStockCount > 0

  return (
    <div className="space-y-6">
      {/* 1. Header Estratégico y Acciones Rápidas */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Dashboard Operativo & Comercial
            </h1>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20 font-mono">
              <span className="h-1.5 w-1.5 bg-primary animate-pulse" />
              EN VIVO
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Métricas consolidadas de ventas, recaudo en caja, catálogo e integración e-commerce
          </p>
        </div>

        {/* Botones de acción directos */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="text-xs font-mono"
            title="Actualizar datos"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refrescar
          </Button>

          <Button
            render={<Link href="/sales" />}
            size="sm"
            className="font-semibold shadow-sm"
          >
            <PlusCircle className="h-4 w-4 mr-1.5" />
            Nueva Venta
          </Button>

          <Button
            render={<Link href="/web/orders" className="relative" />}
            variant="outline"
            size="sm"
            className="font-medium"
          >
            <ShoppingBag className="h-4 w-4 mr-1.5" />
            Pedidos Web
            {hasPendingOrders && (
              <span className="ml-1.5 px-1.5 py-0.2 bg-destructive text-destructive-foreground text-[10px] font-bold font-mono">
                {webOrdersSummary.pendingCount}
              </span>
            )}
          </Button>

          <Button
            render={<Link href="/assistant" />}
            variant="outline"
            size="sm"
            className="font-medium border-primary/40 text-primary bg-primary/5 hover:bg-primary/15"
          >
            <Bot className="h-4 w-4 mr-1.5" />
            Asistente IA
          </Button>
        </div>
      </div>

      {/* 2. Grid de 6 KPIs Estratégicos */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {/* KPI 1: Facturación Hoy */}
        <Card className="border border-border bg-card">
          <CardContent className="p-3.5 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Ventas Hoy
              </span>
              <div className="p-1 bg-primary/10 text-primary border border-primary/20">
                <ShoppingCart className="h-3.5 w-3.5" />
              </div>
            </div>
            <div>
              <div className="text-xl font-bold tracking-tight text-foreground font-mono">
                {formatCurrency(salesToday.total)}
              </div>
              <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-1">
                <span>{salesToday.count} {salesToday.count === 1 ? 'venta' : 'ventas'}</span>
                <span>Prom: {formatCurrency(salesToday.averageTicket)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPI 2: Recaudo Efectivo en Caja */}
        <Card className="border border-border bg-card">
          <CardContent className="p-3.5 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Caja Hoy
              </span>
              <div className="p-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <Wallet className="h-3.5 w-3.5" />
              </div>
            </div>
            <div>
              <div className="text-xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 font-mono">
                {formatCurrency(incomeToday)}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Contado + abonos recibidos
              </p>
            </div>
          </CardContent>
        </Card>

        {/* KPI 3: Margen y Ganancia Estimada */}
        <Card className="border border-border bg-card">
          <CardContent className="p-3.5 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Utilidad Hoy
              </span>
              <div className="p-1 bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
                <TrendingUp className="h-3.5 w-3.5" />
              </div>
            </div>
            <div>
              <div className="text-xl font-bold tracking-tight text-teal-600 dark:text-teal-400 font-mono">
                {formatCurrency(salesToday.profit)}
              </div>
              <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-1">
                <span>Margen est.</span>
                <span className="font-semibold text-foreground font-mono">
                  {salesToday.profitMarginPercent}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPI 4: Cartera por Cobrar */}
        <Card className="border border-border bg-card">
          <CardContent className="p-3.5 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Cartera Crédito
              </span>
              <div className="p-1 bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                <HandCoins className="h-3.5 w-3.5" />
              </div>
            </div>
            <div>
              <div className="text-xl font-bold tracking-tight text-sky-600 dark:text-sky-400 font-mono">
                {formatCurrency(pendingCreditTotal)}
              </div>
              <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-1">
                <span>{pendingCreditClientsCount} clientes deudores</span>
                <Link href="/credits" className="text-primary hover:underline font-medium">
                  Cobrar
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPI 5: Pedidos Web */}
        <Card className="border border-border bg-card">
          <CardContent className="p-3.5 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Tienda Online
              </span>
              <div
                className={`p-1 border ${
                  hasPendingOrders
                    ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                    : 'bg-muted text-muted-foreground border-border'
                }`}
              >
                <ShoppingBag className="h-3.5 w-3.5" />
              </div>
            </div>
            <div>
              <div className="text-xl font-bold tracking-tight font-mono flex items-center gap-1.5">
                <span>{webOrdersSummary.pendingCount}</span>
                <span className="text-xs font-normal text-muted-foreground">pendientes</span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-1">
                <span>{formatCurrency(webOrdersSummary.pendingOrdersTotal)}</span>
                <Link href="/web/orders" className="text-primary hover:underline font-medium">
                  Ver
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPI 6: Catálogo & Stock Crítico */}
        <Card className="border border-border bg-card">
          <CardContent className="p-3.5 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Inventario
              </span>
              <div
                className={`p-1 border ${
                  hasOutOfStock || hasLowStock
                    ? 'bg-destructive/15 text-destructive border-destructive/30'
                    : 'bg-primary/10 text-primary border-primary/20'
                }`}
              >
                <Package className="h-3.5 w-3.5" />
              </div>
            </div>
            <div>
              <div className="text-xl font-bold tracking-tight font-mono text-foreground">
                {formatNumber(inventorySummary.totalProducts)}
                <span className="text-xs font-normal text-muted-foreground ml-1">ítems</span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-1">
                <span className={hasOutOfStock ? 'text-destructive font-semibold' : ''}>
                  {inventorySummary.outOfStockCount} agotados
                </span>
                <Link href="/inventory" className="text-primary hover:underline font-medium">
                  Revisar
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. Fila de Gráficos y Métricas Principales */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        {/* Gráfico 1: Facturación Histórica Mensual */}
        <SalesMonthlyBar data={data.salesByMonth || []} />

        {/* Gráfico 2: Métodos de Pago */}
        <PaymentDonut data={data.salesByPayment || []} />
      </div>

      {/* 4. Fila Secundaria: Top Productos y Reposición de Stock */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        {/* Top Productos Más Vendidos */}
        <TopProductsBar data={data.topProducts || []} />

        {/* Stock Bajo y Agotados */}
        <LowStockList data={inventorySummary.lowStockProducts || []} />
      </div>

      {/* 5. Fila Operativa: Pedidos Web y Ventas Recientes */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        {/* Tarjeta de Pedidos Web Pendientes */}
        <Card className="border border-border bg-card">
          <CardHeader className="pb-3 border-b border-border/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className={`p-1.5 border ${
                    hasPendingOrders
                      ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                      : 'bg-muted text-muted-foreground border-border'
                  }`}
                >
                  <ShoppingBag className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-sm font-semibold">Pedidos Tienda Online</CardTitle>
                  <CardDescription className="text-xs">
                    {hasPendingOrders
                      ? `${webOrdersSummary.pendingCount} órdenes esperando confirmación y despacho`
                      : 'Todos los pedidos web han sido atendidos'}
                  </CardDescription>
                </div>
              </div>
              <Button
                render={<Link href="/web/orders" />}
                variant="ghost"
                size="sm"
                className="text-xs text-primary"
              >
                Gestionar <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            {webOrdersSummary.pendingOrders.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                <p>No hay pedidos pendientes de confirmación.</p>
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {webOrdersSummary.pendingOrders.map((order) => (
                  <div key={order.id} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-foreground">
                          {order.reference || 'ORD'}
                        </span>
                        <span className="text-xs font-medium text-foreground truncate">
                          {order.customerName}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                        <Phone className="h-3 w-3" />
                        <span>{order.customerPhone}</span>
                        <span>·</span>
                        <span className="font-mono">
                          {new Date(order.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-mono font-semibold text-xs text-foreground">
                        {formatCurrency(order.total)}
                      </div>
                      <Button
                        render={<Link href="/web/orders" />}
                        size="sm"
                        variant="outline"
                        className="h-6 text-[10px] px-2 mt-1"
                      >
                        Atender
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tarjeta de Ventas Recientes */}
        <Card className="border border-border bg-card">
          <CardHeader className="pb-3 border-b border-border/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-primary/10 text-primary border border-primary/20">
                  <Clock className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-sm font-semibold">Últimas Ventas Registradas</CardTitle>
                  <CardDescription className="text-xs">Movimientos recientes en mostrador y web</CardDescription>
                </div>
              </div>
              <Button
                render={<Link href="/sales/history" />}
                variant="ghost"
                size="sm"
                className="text-xs text-primary"
              >
                Historial <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            {recentSales.length === 0 ? (
              <div className="text-center py-8 text-xs text-muted-foreground">
                No hay ventas registradas todavía.
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {recentSales.map((sale) => (
                  <Link
                    key={sale.id}
                    href={`/sales/${sale.id}`}
                    className="py-2 px-1 flex items-center justify-between hover:bg-muted/50 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-foreground">
                          {sale.invoiceNumber}
                        </span>
                        <span className="text-xs font-medium text-foreground truncate">
                          {sale.client?.name || 'Cliente general'}
                        </span>
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        {getPaymentMethodLabel(sale.paymentMethod)} ·{' '}
                        {new Date(sale.saleDate).toLocaleDateString([], {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-bold text-sm text-foreground">
                        {formatCurrency(sale.total)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 6. Centro de Inteligencia Artificial para Reportes y Finanzas */}
      <div className="p-4 bg-card border border-border flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold flex items-center gap-1.5 text-foreground">
              Asistente IA para Reportes y Finanzas Integradas
              <Sparkles className="h-3.5 w-3.5 text-primary" />
            </h4>
            <p className="text-xs text-muted-foreground">
              Pídele al agente: &quot;Reporte ejecutivo&quot;, &quot;Reporte de ventas de este mes&quot;, &quot;Balance financiero&quot; o &quot;Compras sugeridas de inventario&quot;.
            </p>
          </div>
        </div>

        <Button
          render={<Link href="/assistant" />}
          size="sm"
          className="shrink-0 font-medium shadow-sm"
        >
          Abrir Asistente IA
          <ArrowRight className="h-4 w-4 ml-1.5" />
        </Button>
      </div>
    </div>
  )
}