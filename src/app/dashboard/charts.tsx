'use client'

import React from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Banknote, Package, ShoppingCart, TrendingUp } from 'lucide-react'
import { formatCurrency, formatNumber } from '@/lib/format'
import { getPaymentMethodLabel } from '@/lib/labels'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

interface TooltipPayloadEntry {
  name?: string
  value?: number
  color?: string
  payload?: Record<string, unknown>
}

function CustomChartTooltip({
  active,
  payload,
  label,
  formatter,
}: {
  active?: boolean
  payload?: TooltipPayloadEntry[]
  label?: string
  formatter?: (v: number) => string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-popover text-popover-foreground border border-border p-2.5 rounded-xl shadow-xl text-xs space-y-1">
      {label && <p className="font-semibold text-foreground border-b border-border/60 pb-1">{label}</p>}
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center justify-between gap-4 font-mono">
          <span style={{ color: entry.color }} className="font-sans font-medium">
            {entry.name}:
          </span>
          <span className="font-bold text-foreground">
            {formatter ? formatter(Number(entry.value ?? 0)) : entry.value}
          </span>
        </div>
      ))}
    </div>
  )
}

function SectionHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType
  title: string
  description: string
}) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="bg-primary/10 text-primary p-2 rounded-xl border border-primary/20 shrink-0">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <h3 className="text-sm font-semibold tracking-tight text-foreground">{title}</h3>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  )
}

// 1. Matriz Contable de Recaudo por Métodos de Pago
export function PaymentDonut({
  data,
}: {
  data: { paymentMethod: string; _count: { id: number }; _sum: { total: number | null } }[]
}) {
  const chartData = data.map((d) => ({
    name: getPaymentMethodLabel(d.paymentMethod),
    rawMethod: d.paymentMethod,
    amount: d._sum.total || 0,
    count: d._count.id || 0,
  }))

  const totalRevenue = chartData.reduce((s, d) => s + d.amount, 0)
  const totalTransactions = chartData.reduce((s, d) => s + d.count, 0)

  const immediateLiquidity = chartData.filter((d) => d.rawMethod !== 'CREDITO').reduce((s, d) => s + d.amount, 0)
  const creditReceivables = chartData.filter((d) => d.rawMethod === 'CREDITO').reduce((s, d) => s + d.amount, 0)

  const METHOD_ACCOUNT_META: Record<string, { account: string; badge: string; colorClass: string; barColor: string }> =
    {
      CASH: {
        account: 'Caja General (Disponible)',
        badge: 'Inmediata',
        colorClass: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
        barColor: 'bg-emerald-600 dark:bg-emerald-500',
      },
      TRANSFER: {
        account: 'Bancos / Transferencia',
        badge: 'Bancos',
        colorClass: 'text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20',
        barColor: 'bg-blue-600 dark:bg-blue-500',
      },
      CARD: {
        account: 'Datáfono / Tarjetas',
        badge: 'Por Liquidar',
        colorClass: 'text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
        barColor: 'bg-indigo-600 dark:bg-indigo-500',
      },
      CREDITO: {
        account: 'Cuentas por Cobrar (CxC)',
        badge: 'Cartera a Plazo',
        colorClass: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20',
        barColor: 'bg-amber-600 dark:bg-amber-500',
      },
    }

  return (
    <Card className="border border-border/80 bg-card h-full flex flex-col rounded-2xl shadow-2xs">
      <CardHeader className="pb-3 border-b border-border/60">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <SectionHeader
            icon={Banknote}
            title="Tesorería & Métodos de Pago"
            description="Distribución de recaudo y liquidez según canal de cobro"
          />
          {totalRevenue > 0 && (
            <div className="flex items-center gap-3 text-right">
              <div>
                <span className="text-[10px] uppercase font-mono text-muted-foreground block">Liquidez Inmediata</span>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                  {formatCurrency(immediateLiquidity)}
                </span>
              </div>
              {creditReceivables > 0 && (
                <div className="border-l border-border pl-3">
                  <span className="text-[10px] uppercase font-mono text-muted-foreground block">Cartera / Crédito</span>
                  <span className="text-xs font-bold text-amber-600 dark:text-amber-400 font-mono">
                    {formatCurrency(creditReceivables)}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-4 flex-1 flex flex-col justify-center">
        {totalRevenue === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-xs text-muted-foreground">
            <Banknote className="h-8 w-8 mb-2 text-muted-foreground/30" />
            <p>No hay recaudos registrados en el sistema</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="border border-border/70 rounded-xl overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs min-w-[460px] sm:min-w-0">
                <thead>
                  <tr className="bg-muted/40 border-b border-border/60 text-muted-foreground uppercase text-[10px] font-semibold tracking-wider">
                    <th className="py-2 px-3">Cuenta / Canal</th>
                    <th className="py-2 px-3 text-center">Operaciones</th>
                    <th className="py-2 px-3 text-right">Ticket Prom.</th>
                    <th className="py-2 px-3 text-right">Monto Recaudado</th>
                    <th className="py-2 px-3 text-right w-24">Participación</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 font-normal">
                  {chartData.map((d) => {
                    const percent = totalRevenue > 0 ? Math.round((d.amount / totalRevenue) * 100) : 0
                    const avgTicket = d.count > 0 ? Math.round(d.amount / d.count) : 0
                    const meta = METHOD_ACCOUNT_META[d.rawMethod] || {
                      account: d.name,
                      badge: 'General',
                      colorClass: 'text-muted-foreground bg-muted border-border',
                      barColor: 'bg-primary',
                    }

                    return (
                      <tr key={d.name} className="hover:bg-muted/30 transition-colors">
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            <span className={`h-2 w-2 rounded-full shrink-0 ${meta.barColor}`} />
                            <div>
                              <div className="font-semibold text-foreground text-xs">{d.name}</div>
                              <div className="text-[10px] text-muted-foreground">{meta.account}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono text-xs text-muted-foreground">
                          {d.count}{' '}
                          <span className="text-[10px]">
                            ({totalTransactions > 0 ? Math.round((d.count / totalTransactions) * 100) : 0}%)
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-xs text-muted-foreground">
                          {formatCurrency(avgTicket)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-xs font-bold text-foreground">
                          {formatCurrency(d.amount)}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-2 font-mono text-xs font-semibold text-foreground">
                            <span>{percent}%</span>
                            <div className="w-10 h-1.5 bg-muted rounded-full overflow-hidden shrink-0">
                              <div className={`h-full ${meta.barColor}`} style={{ width: `${percent}%` }} />
                            </div>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// 2. Gráfico de Facturación Mensual (Últimos 6 meses)
export function SalesMonthlyBar({ data }: { data: { month: string; total: number; count: number }[] }) {
  const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

  const chartData = data.map((d) => {
    const parts = d.month.split('-')
    const mIndex = parseInt(parts[1] || '1', 10) - 1
    const yearShort = parts[0]?.slice(-2) || ''
    return {
      month: `${monthNames[mIndex]} '${yearShort}`,
      Total: d.total,
      Transacciones: d.count,
    }
  })

  const totalPeriod = data.reduce((sum, d) => sum + d.total, 0)

  return (
    <Card className="border border-border/80 bg-card h-full flex flex-col rounded-2xl shadow-2xs">
      <CardHeader className="pb-3 border-b border-border/60">
        <div className="flex items-center justify-between">
          <SectionHeader
            icon={TrendingUp}
            title="Facturación Mensual"
            description="Histórico de ingresos de los últimos 6 meses"
          />
          <div className="text-right">
            <span className="text-[10px] text-muted-foreground uppercase font-mono block">Total Período</span>
            <span className="text-xs font-bold text-foreground font-mono">{formatCurrency(totalPeriod)}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4 flex-1 flex flex-col justify-center">
        {chartData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-xs text-muted-foreground">
            <TrendingUp className="h-8 w-8 mb-2 text-muted-foreground/30" />
            <p>Sin datos históricos de ventas</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 4 }}>
              <XAxis
                dataKey="month"
                tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                axisLine={{ stroke: 'var(--border)' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `$${Math.round(v / 1000)}k`}
                width={48}
              />
              <Tooltip content={<CustomChartTooltip formatter={(v: number) => formatCurrency(v)} />} />
              <Bar dataKey="Total" radius={[6, 6, 0, 0]} maxBarSize={32}>
                {chartData.map((_, i) => (
                  <Cell key={i} fill="var(--color-primary)" fillOpacity={0.75 + 0.25 * ((i + 1) / chartData.length)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}

// 3. Top Productos Más Vendidos
export interface TopProductData {
  productId: string
  name: string
  quantity: number
  total: number
}

export function TopProductsBar({ data }: { data: TopProductData[] }) {
  const topFive = data.slice(0, 5)
  const totalRevenueTop = topFive.reduce((sum, item) => sum + item.total, 0)
  const totalUnitsTop = topFive.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <Card className="border border-border/80 bg-card h-full flex flex-col rounded-2xl shadow-2xs">
      <CardHeader className="pb-3 border-b border-border/60">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <SectionHeader
            icon={TrendingUp}
            title="Rotación de Inventario & Pareto"
            description="Líderes de facturación y unidades despachadas (últimos 30 días)"
          />
          {topFive.length > 0 && (
            <div className="text-right">
              <span className="text-[10px] uppercase font-mono text-muted-foreground block">Facturación Top 5</span>
              <span className="text-xs font-bold text-foreground font-mono">
                {formatCurrency(totalRevenueTop)} &bull; {formatNumber(totalUnitsTop)} uds
              </span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-4 flex-1 flex flex-col justify-center">
        {data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-xs text-muted-foreground">
            <Package className="h-8 w-8 mb-2 text-muted-foreground/30" />
            <p>No hay ventas registradas en los últimos 30 días</p>
          </div>
        ) : (
          <div className="border border-border/70 rounded-xl overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs min-w-[500px] sm:min-w-0">
              <thead>
                <tr className="bg-muted/40 border-b border-border/60 text-muted-foreground uppercase text-[10px] font-semibold tracking-wider">
                  <th className="py-2 px-3 w-10 text-center">#</th>
                  <th className="py-2 px-3">Producto / Referencia</th>
                  <th className="py-2 px-3 text-center">Volumen</th>
                  <th className="py-2 px-3 text-right">Precio Prom.</th>
                  <th className="py-2 px-3 text-right">Total Facturado</th>
                  <th className="py-2 px-3 text-right w-24">Contribución</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 font-normal">
                {topFive.map((item, index) => {
                  const percentOfTop = totalRevenueTop > 0 ? Math.round((item.total / totalRevenueTop) * 100) : 0
                  const avgPrice = item.quantity > 0 ? Math.round(item.total / item.quantity) : 0

                  return (
                    <tr key={item.productId || index} className="hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 px-3 text-center font-mono text-xs font-bold text-muted-foreground">
                        <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-muted border border-border/80 text-[10px]">
                          {index + 1}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-foreground text-xs line-clamp-1" title={item.name}>
                          {item.name}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono text-xs text-muted-foreground">
                        {formatNumber(item.quantity)} uds
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-xs text-muted-foreground">
                        {formatCurrency(avgPrice)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-xs font-bold text-foreground">
                        {formatCurrency(item.total)}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-2 font-mono text-xs font-semibold text-foreground">
                          <span>{percentOfTop}%</span>
                          <div className="w-10 h-1.5 bg-muted rounded-full overflow-hidden shrink-0">
                            <div className="h-full bg-primary" style={{ width: `${percentOfTop}%` }} />
                          </div>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// 4. Lista de Stock Bajo y Agotados
export function LowStockList({
  data,
}: {
  data: { id: string; name: string; stock: number; lowStockThreshold: number; salePrice?: number }[]
}) {
  return (
    <Card className="border border-border/80 bg-card h-full flex flex-col rounded-2xl shadow-2xs">
      <CardHeader className="pb-3 border-b border-border/60">
        <SectionHeader
          icon={ShoppingCart}
          title="Reposición de Stock"
          description="Productos que alcanzaron o superaron el nivel mínimo"
        />
      </CardHeader>
      <CardContent className="pt-2 flex-1">
        {data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-xs text-muted-foreground">
            <ShoppingCart className="h-8 w-8 mb-2 text-muted-foreground/30" />
            <p>Todos los productos cuentan con existencias óptimas</p>
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {data.slice(0, 5).map((p) => {
              const isOut = p.stock <= 0
              return (
                <div key={p.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground truncate" title={p.name}>
                      {p.name}
                    </p>
                    <p className="text-[11px] text-muted-foreground font-mono">
                      Mínimo requerido: {p.lowStockThreshold} uds
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span
                      className={`inline-block px-2.5 py-0.5 font-mono text-[11px] font-bold rounded-lg border ${
                        isOut
                          ? 'bg-destructive/15 text-destructive border-destructive/30'
                          : 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30'
                      }`}
                    >
                      {isOut ? 'AGOTADO (0)' : `${p.stock} uds`}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
