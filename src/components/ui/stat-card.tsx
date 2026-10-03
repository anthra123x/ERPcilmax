'use client'

import { LucideIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import Link from 'next/link'

interface StatCardProps {
  title: string
  value: string | number
  change?: string
  icon: LucideIcon
  color?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple'
  className?: string
  href?: string
}

const colorMap = {
  default: 'bg-primary/10 text-primary',
  success: 'bg-emerald-500/10 text-emerald-600',
  warning: 'bg-amber-500/10 text-amber-600',
  danger: 'bg-red-500/10 text-red-600',
  info: 'bg-sky-500/10 text-sky-600',
  purple: 'bg-purple-500/10 text-purple-600',
}

export function StatCard({ title, value, change, icon: Icon, color = 'default', className, href }: StatCardProps) {
  const content = (
    <Card
      className={cn(
        'stat-card transition-all duration-200 card-shadow hover:card-shadow-warm-md active:scale-[0.98]',
        href && 'cursor-pointer',
        className,
      )}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1.5">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className="text-2xl font-bold tracking-tight tabular-nums">{value}</div>
            {change && <p className="text-xs text-muted-foreground/70 tabular-nums">{change}</p>}
          </div>
          <div className={cn('rounded-xl p-3 shrink-0 transition-transform duration-200', colorMap[color])}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )

  if (href) {
    return <Link href={href}>{content}</Link>
  }

  return content
}

interface MiniStatCardProps {
  icon: LucideIcon
  label: string
  value: string
  color?: 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'orange' | 'blue' | 'emerald'
}

const miniColorMap = {
  success: 'text-emerald-600',
  warning: 'text-amber-600',
  danger: 'text-red-600',
  info: 'text-sky-600',
  purple: 'text-purple-600',
  orange: 'text-orange-600',
  blue: 'text-sky-600',
  emerald: 'text-emerald-600',
}

export function MiniStatCard({ icon: Icon, label, value, color = 'info' }: MiniStatCardProps) {
  return (
    <div className="bg-muted/30 rounded-lg p-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <div className={cn('text-xl font-bold tabular-nums', miniColorMap[color])}>{value}</div>
    </div>
  )
}

interface StatCardGridProps {
  children: React.ReactNode
  columns?: 2 | 3 | 4
  className?: string
}

export function StatCardGrid({ children, columns = 4, className }: StatCardGridProps) {
  const gridCols = {
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-2 lg:grid-cols-3',
    4: 'md:grid-cols-2 lg:grid-cols-4',
  }

  return <div className={cn('grid gap-4 lg:gap-5', gridCols[columns], className)}>{children}</div>
}
