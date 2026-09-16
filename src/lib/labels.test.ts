import { describe, it, expect } from 'vitest'
import {
  getCategoryTypeLabel,
  getTransactionTypeLabel,
  getTransactionTypeColor,
  getCategoryColor,
  getNotificationTypeLabel,
  getPaymentMethodLabel,
  getCreditStatus,
  getCreditStatusLabel,
  getCreditStatusColor,
  getWebOrderStatusLabel,
  getWebOrderStatusColor,
  round,
  parseDateInput,
} from './labels'

describe('getCategoryTypeLabel', () => {
  it('returns correct label for known types', () => {
    expect(getCategoryTypeLabel('INCOME')).toBe('Ingreso')
    expect(getCategoryTypeLabel('EXPENSE')).toBe('Gasto')
    expect(getCategoryTypeLabel('SAVING_GOAL')).toBe('Meta de Ahorro')
  })

  it('returns the input type for unknown values', () => {
    expect(getCategoryTypeLabel('UNKNOWN')).toBe('UNKNOWN')
  })
})

describe('getTransactionTypeLabel', () => {
  it('returns correct label for known types', () => {
    expect(getTransactionTypeLabel('INCOME')).toBe('Ingreso')
    expect(getTransactionTypeLabel('EXPENSE')).toBe('Gasto')
  })

  it('returns the input type for unknown values', () => {
    expect(getTransactionTypeLabel('UNKNOWN')).toBe('UNKNOWN')
  })
})

describe('getTransactionTypeColor', () => {
  it('returns ok for known types', () => {
    expect(getTransactionTypeColor('INCOME')).toContain('text-green-600')
    expect(getTransactionTypeColor('EXPENSE')).toContain('text-red-600')
  })

  it('returns default for unknown values', () => {
    expect(getTransactionTypeColor('UNKNOWN')).toBe('default')
  })
})

describe('getCategoryColor', () => {
  it('returns the mapped class for known colors', () => {
    expect(getCategoryColor('blue')).toBe('bg-blue-500')
    expect(getCategoryColor('red')).toBe('bg-red-500')
    expect(getCategoryColor('teal')).toBe('bg-teal-500')
  })

  it('returns gray fallback for null or unknown', () => {
    expect(getCategoryColor(null)).toBe('bg-gray-500')
    expect(getCategoryColor('neon')).toBe('bg-gray-500')
  })
})

describe('getNotificationTypeLabel', () => {
  it('returns correct label for known types', () => {
    expect(getNotificationTypeLabel('SYSTEM')).toBe('Sistema')
    expect(getNotificationTypeLabel('LOW_STOCK')).toBe('Stock bajo')
  })

  it('returns the input type for unknown values', () => {
    expect(getNotificationTypeLabel('OLD_TYPE')).toBe('OLD_TYPE')
  })
})

describe('getPaymentMethodLabel', () => {
  it('returns correct label for known methods', () => {
    expect(getPaymentMethodLabel('CASH')).toBe('Efectivo')
    expect(getPaymentMethodLabel('CARD')).toBe('Tarjeta')
    expect(getPaymentMethodLabel('TRANSFER')).toBe('Transferencia')
    expect(getPaymentMethodLabel('CREDITO')).toBe('Crédito')
  })

  it('returns the input for unknown values', () => {
    expect(getPaymentMethodLabel('CHEQUE')).toBe('CHEQUE')
  })
})

describe('getWebOrderStatusLabel', () => {
  it('returns correct label for known states', () => {
    expect(getWebOrderStatusLabel('PENDING')).toBe('Pendiente')
    expect(getWebOrderStatusLabel('CONVERTED')).toBe('Convertido')
    expect(getWebOrderStatusLabel('CANCELLED')).toBe('Cancelado')
  })

  it('returns the input for unknown values', () => {
    expect(getWebOrderStatusLabel('SHIPPED')).toBe('SHIPPED')
  })
})

describe('getWebOrderStatusColor', () => {
  it('returns tone classes for known states', () => {
    expect(getWebOrderStatusColor('PENDING')).toContain('text-amber-700')
    expect(getWebOrderStatusColor('CONVERTED')).toContain('text-green-700')
    expect(getWebOrderStatusColor('CANCELLED')).toContain('text-red-700')
  })

  it('returns default for unknown values', () => {
    expect(getWebOrderStatusColor('SHIPPED')).toContain('text-gray-700')
  })
})

describe('getCreditStatus', () => {
  it('returns null for non-credit or cancelled sales', () => {
    expect(getCreditStatus({ paymentMethod: 'CASH', dueDate: null, status: 'COMPLETED', total: 100 })).toBeNull()
    expect(getCreditStatus({ paymentMethod: 'CREDITO', dueDate: null, status: 'CANCELLED', total: 100 })).toBeNull()
  })

  it('returns PAID when fully paid', () => {
    const sale = {
      paymentMethod: 'CREDITO',
      dueDate: new Date('2020-01-01'),
      status: 'COMPLETED',
      total: 100,
      payments: [{ amount: 60 }, { amount: 40 }],
    }
    expect(getCreditStatus(sale)).toBe('PAID')
  })

  it('returns OVERDUE when balance > 0 and past due date', () => {
    const sale = {
      paymentMethod: 'CREDITO',
      dueDate: new Date('2020-01-01'),
      status: 'COMPLETED',
      total: 100,
      payments: [{ amount: 30 }],
    }
    expect(getCreditStatus(sale)).toBe('OVERDUE')
  })

  it('returns PENDING when balance > 0 and not due yet', () => {
    const sale = {
      paymentMethod: 'CREDITO',
      dueDate: new Date(Date.now() + 30 * 24 * 3600 * 1000),
      status: 'COMPLETED',
      total: 100,
      payments: [],
    }
    expect(getCreditStatus(sale)).toBe('PENDING')
  })

  it('returns PENDING when no due date set', () => {
    const sale = {
      paymentMethod: 'CREDITO',
      dueDate: null,
      status: 'COMPLETED',
      total: 100,
      payments: [{ amount: 10 }],
    }
    expect(getCreditStatus(sale)).toBe('PENDING')
  })
})

describe('getCreditStatusLabel', () => {
  it('returns correct labels', () => {
    expect(getCreditStatusLabel('PAID')).toBe('Pagado')
    expect(getCreditStatusLabel('OVERDUE')).toBe('Vencido')
    expect(getCreditStatusLabel('PENDING')).toBe('Pendiente')
  })
})

describe('getCreditStatusColor', () => {
  it('returns mapped classes for known statuses', () => {
    expect(getCreditStatusColor('PAID')).toContain('text-green-700')
    expect(getCreditStatusColor('OVERDUE')).toContain('text-red-700')
    expect(getCreditStatusColor('PENDING')).toContain('text-amber-700')
  })

  it('returns gray fallback for unknown statuses', () => {
    expect(getCreditStatusColor('NOPE' as 'PAID')).toContain('text-gray-700')
  })
})

describe('round', () => {
  it('rounds to 2 decimals', () => {
    expect(round(10.005)).toBe(10.01)
    expect(round(10.004)).toBe(10)
  })
})

describe('parseDateInput', () => {
  it('parses YYYY-MM-DD as midnight local', () => {
    const d = parseDateInput('2024-06-15')
    expect(d).not.toBeNull()
    expect(d!.getFullYear()).toBe(2024)
    expect(d!.getMonth()).toBe(5)
    expect(d!.getDate()).toBe(15)
  })

  it('applies end of day when requested', () => {
    const d = parseDateInput('2024-06-15', true)
    expect(d!.getHours()).toBe(23)
    expect(d!.getMinutes()).toBe(59)
    expect(d!.getSeconds()).toBe(59)
  })

  it('returns null for empty or invalid input', () => {
    expect(parseDateInput('')).toBeNull()
    expect(parseDateInput(null)).toBeNull()
    expect(parseDateInput('not-a-date')).toBeNull()
  })
})