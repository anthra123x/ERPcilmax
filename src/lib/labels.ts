export function getCategoryTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    INCOME: 'Ingreso',
    EXPENSE: 'Gasto',
    SAVING_GOAL: 'Meta de Ahorro',
  }
  return labels[type] || type
}

export function getTransactionTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    INCOME: 'Ingreso',
    EXPENSE: 'Gasto',
  }
  return labels[type] || type
}

export function getTransactionTypeColor(type: string): string {
  const colors: Record<string, string> = {
    INCOME: 'text-green-600 bg-green-50 border-green-200',
    EXPENSE: 'text-red-600 bg-red-50 border-red-200',
  }
  return colors[type] || 'default'
}

export function getCategoryColor(color: string | null): string {
  const colors: Record<string, string> = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    red: 'bg-red-500',
    yellow: 'bg-yellow-500',
    purple: 'bg-purple-500',
    pink: 'bg-pink-500',
    indigo: 'bg-indigo-500',
    orange: 'bg-orange-500',
    teal: 'bg-teal-500',
    cyan: 'bg-cyan-500',
  }
  return colors[color || ''] || 'bg-gray-500'
}

export function getNotificationTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    SYSTEM: 'Sistema',
    LOW_STOCK: 'Stock bajo',
  }
  return labels[type] || type
}

export function getPaymentMethodLabel(method: string): string {
  const labels: Record<string, string> = {
    CASH: 'Efectivo',
    CARD: 'Tarjeta',
    TRANSFER: 'Transferencia',
    CREDITO: 'Crédito',
  }
  return labels[method] || method
}

export type CreditCollectionStatus = 'PAID' | 'OVERDUE' | 'PENDING'

export function getCreditStatus(sale: {
  paymentMethod: string
  dueDate: Date | null | undefined
  status: string
  payments?: Array<{ amount: number }>
  total?: number
}): CreditCollectionStatus | null {
  if (sale.paymentMethod !== 'CREDITO' || sale.status === 'CANCELLED') return null
  const total = sale.total ?? 0
  const paid = (sale.payments ?? []).reduce((s, p) => s + p.amount, 0)
  const outstanding = total - paid
  if (outstanding <= 0.005) return 'PAID'
  if (sale.dueDate && sale.dueDate.getTime() < Date.now()) return 'OVERDUE'
  return 'PENDING'
}

export function getCreditStatusLabel(status: 'PAID' | 'OVERDUE' | 'PENDING'): string {
  const labels: Record<string, string> = {
    PAID: 'Pagado',
    OVERDUE: 'Vencido',
    PENDING: 'Pendiente',
  }
  return labels[status] || status
}

export function getCreditStatusColor(status: 'PAID' | 'OVERDUE' | 'PENDING'): string {
  const colors: Record<string, string> = {
    PAID: 'text-green-700 bg-green-50 border-green-200',
    OVERDUE: 'text-red-700 bg-red-50 border-red-200',
    PENDING: 'text-amber-700 bg-amber-50 border-amber-200',
  }
  return colors[status] || 'text-gray-700 bg-gray-50 border-gray-200'
}

export function getWebOrderStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    PENDING: 'Pendiente',
    CONFIRMED: 'Confirmado',
    CONVERTED: 'Convertido',
    CANCELLED: 'Cancelado',
  }
  return labels[status] || status
}

export function getWebOrderStatusColor(status: string): string {
  const colors: Record<string, string> = {
    PENDING: 'text-amber-700 bg-amber-50 border-amber-200',
    CONFIRMED: 'text-blue-700 bg-blue-50 border-blue-200',
    CONVERTED: 'text-green-700 bg-green-50 border-green-200',
    CANCELLED: 'text-red-700 bg-red-50 border-red-200',
  }
  return colors[status] || 'text-gray-700 bg-gray-50 border-gray-200'
}

export const round = (n: number): number => Math.round(n * 100) / 100

export function parseDateInput(value: string | null | undefined, endOfDay = false): Date | null {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed) return null
  const d = /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? new Date(`${trimmed}T00:00:00`) : new Date(trimmed)
  if (Number.isNaN(d.getTime())) return null
  if (endOfDay) d.setHours(23, 59, 59, 999)
  return d
}
