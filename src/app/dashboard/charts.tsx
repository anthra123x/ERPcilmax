'use client'

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Banknote, Package, ShoppingCart, TrendingUp } from 'lucide-react'
import { formatCurrency, formatNumber } from '@/lib/format'
import { getPaymentMethodLabel } from '@/lib/labels'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart as RePieChart,
  Pie,
} from 'recharts'

const PAYMENT_METHOD_COLORS: Record<string, string> = {
  CASH: 'oklch(0.6 0.16 150)',
  CARD: 'oklch(0.55 0.14 210)',
  TRANSFER: 'oklch(0.65 0.15 65)',
  CREDITO: 'oklch(0.6 0.18 25)',
}

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
    <div className="bg-popover text-popover-foreground border border-border p-2.5 shadow-xl text-xs space-y-1">
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

// 1. Gráfico de Ingresos por Método de Pago
export function PaymentDonut({
  data,
}: {
  data: { paymentMethod: string; _count: { id: number }; _sum: { total: number | null } }[]
}) {
  const chartData = data.map((d) => ({
    name: getPaymentMethodLabel(d.paymentMethod),
    rawMethod: d.paymentMethod,
    value: d._sum.total || 0,
    count: d._count.id || 0,
    color: PAYMENT_METHOD_COLORS[d.paymentMethod] || 'oklch(0.55 0.05 180)',
  }))

  const total = chartData.reduce((s, d) => s + d.value, 0)

  return (
    <Card className="border border-border/80 bg-card h-full flex flex-col rounded-2xl shadow-sm">
      <CardHeader className="pb-3 border-b border-border/60">
        <SectionHeader
          icon={Banknote}
          title="Métodos de Pago"
          description="Distribución de ingresos por canal de recaudo"
        />
      </CardHeader>
      <CardContent className="pt-4 flex-1 flex flex-col justify-center">
        {total === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-xs text-muted-foreground">
            <Banknote className="h-8 w-8 mb-2 text-muted-foreground/30" />
            <p>No hay ventas registradas aún</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
            <div className="flex justify-center items-center">
              <ResponsiveContainer width={150} height={150}>
                <RePieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={42}
                    outerRadius={66}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="var(--color-card)"
                    strokeWidth={2}
                  >
                    {chartData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomChartTooltip formatter={(v: number) => formatCurrency(v)} />} />
                </RePieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2 min-w-0">
              {chartData.map((d) => {
                const percent = total > 0 ? Math.round((d.value / total) * 100) : 0
                return (
                  <div key={d.name} className="flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="h-2.5 w-2.5 shrink-0" style={{ backgroundColor: d.color }} />
                      <span className="text-muted-foreground truncate">{d.name}</span>
                    </div>
                    <div className="text-right shrink-0 font-mono">
                      <span className="font-semibold text-foreground">{formatCurrency(d.value)}</span>
                      <span className="text-[10px] text-muted-foreground ml-1.5 font-normal">({percent}%)</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// 2. Gráfico de Facturación Mensual (Últimos 6 meses)
export function SalesMonthlyBar({
  data,
}: {
  data: { month: string; total: number; count: number }[]
}) {
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
    <Card className="border border-border/80 bg-card h-full flex flex-col rounded-2xl shadow-sm">
      <CardHeader className="pb-3 border-b border-border/60">
        <div className="flex items-center justify-between">
          <SectionHeader
            icon={TrendingUp}
            title="Facturación Mensual"
            description="Histórico de ingresos de los últimos 6 meses"
          />
          <div className="text-right">
            <span className="text-[10px] text-muted-foreground uppercase font-mono block">Total Semestre</span>
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
          <ResponsiveContainer width="100%" height={170}>
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
              <Tooltip
                content={
                  <CustomChartTooltip
                    formatter={(v: number) => formatCurrency(v)}
                  />
                }
              />
              <Bar dataKey="Total" radius={[6, 6, 0, 0]} maxBarSize={32}>
                {chartData.map((_, i) => (
                  <Cell
                    key={i}
                    fill="var(--color-primary)"
                    fillOpacity={0.7 + 0.3 * ((i + 1) / chartData.length)}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}

// 3. Top Productos Más Vendidos (Diseño premium, redondeado y con ranking visual)
export interface TopProductData {
  productId: string
  name: string
  quantity: number
  total: number
}

const RANK_BADGES = [
  { label: '1', bg: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 font-bold' },
  { label: '2', bg: 'bg-slate-400/15 text-slate-600 dark:text-slate-300 border-slate-400/30 font-semibold' },
  { label: '3', bg: 'bg-amber-700/15 text-amber-700 dark:text-amber-500 border-amber-700/30 font-semibold' },
  { label: '4', bg: 'bg-muted text-muted-foreground border-border font-medium' },
  { label: '5', bg: 'bg-muted text-muted-foreground border-border font-medium' },
]

export function TopProductsBar({ data }: { data: TopProductData[] }) {
  const maxQty = Math.max(...data.map((d) => d.quantity), 1)
  const topFive = data.slice(0, 5)
  const totalRevenueTop = topFive.reduce((sum, item) => sum + item.total, 0)

  return (
    <Card className="border border-border/80 bg-card h-full flex flex-col rounded-2xl shadow-sm">
      <CardHeader className="pb-3.5 border-b border-border/60">
        <div className="flex items-center justify-between">
          <SectionHeader
            icon={TrendingUp}
            title="Productos Más Vendidos"
            description="Líderes de rotación en los últimos 30 días"
          />
          {topFive.length > 0 && (
            <div className="text-right">
              <span className="text-[10px] uppercase font-mono text-muted-foreground block">Recaudo Top</span>
              <span className="text-xs font-bold text-foreground font-mono">{formatCurrency(totalRevenueTop)}</span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-3.5 flex-1 flex flex-col justify-center">
        {data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-xs text-muted-foreground">
            <Package className="h-8 w-8 mb-2 text-muted-foreground/30" />
            <p>No hay ventas registradas en los últimos 30 días</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {topFive.map((item, index) => {
              const progressPercent = Math.round((item.quantity / maxQty) * 100)
              const badgeStyle = RANK_BADGES[index] || RANK_BADGES[3]

              return (
                <div
                  key={item.productId || index}
                  className="group rounded-xl p-2.5 transition-all duration-200 hover:bg-muted/40 border border-transparent hover:border-border/60 space-y-2"
                >
                  <div className="flex items-center justify-between text-xs gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={`flex h-6 w-6 items-center justify-center rounded-lg text-[11px] font-mono border shrink-0 ${badgeStyle.bg}`}
                      >
                        #{badgeStyle.label}
                      </span>
                      <span className="font-semibold text-foreground truncate text-sm" title={item.name}>
                        {item.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 font-mono">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20">
                        {formatNumber(item.quantity)} uds
                      </span>
                      <span className="font-bold text-foreground text-xs min-w-[70px] text-right">
                        {formatCurrency(item.total)}
                      </span>
                    </div>
                  </div>

                  {/* Barra de progreso suave con gradiente y extremos redondeados */}
                  <div className="h-2 w-full bg-muted/80 rounded-full overflow-hidden p-0.5">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-teal-400 rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${progressPercent}%` }}
                    />
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

// 4. Lista de Stock Bajo y Agotados
export function LowStockList({
  data,
}: {
  data: { id: string; name: string; stock: number; lowStockThreshold: number; salePrice?: number }[]
}) {
  return (
    <Card className="border border-border/80 bg-card h-full flex flex-col rounded-2xl shadow-sm">
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
