import { describe, it, expect } from 'vitest'
import { formatCurrency, formatNumber, formatCurrencyInWords, generateCufe } from './format'

describe('formatCurrency', () => {
  it('formats a number as COP', () => {
    const result = formatCurrency(1500000)
    expect(result).toContain('$')
    expect(result).toContain('1')
    expect(result).toContain('500')
  })

  it('returns $0 for null', () => {
    expect(formatCurrency(null)).toBe('$0')
  })

  it('returns $0 for undefined', () => {
    expect(formatCurrency(undefined)).toBe('$0')
  })

  it('parses string numbers', () => {
    const result = formatCurrency('50000')
    expect(result).toContain('50')
  })

  it('returns $0 for NaN string', () => {
    expect(formatCurrency('not-a-number')).toBe('$0')
  })

  it('formats zero', () => {
    const result = formatCurrency(0)
    expect(result).toContain('$')
    expect(result).toContain('0')
  })

  it('formats large numbers with thousands separator', () => {
    const result = formatCurrency(1000000)
    expect(result).toContain('$')
    expect(result).toContain('1')
  })

  it('formats negative numbers', () => {
    const result = formatCurrency(-5000)
    expect(result).toContain('-')
    expect(result).toContain('$')
  })
})

describe('formatNumber', () => {
  it('formats a number with locale separators', () => {
    const result = formatNumber(1500)
    expect(result).toBe('1.500')
  })

  it('returns 0 for null', () => {
    expect(formatNumber(null)).toBe('0')
  })

  it('returns 0 for undefined', () => {
    expect(formatNumber(undefined)).toBe('0')
  })

  it('parses string numbers', () => {
    expect(formatNumber('50000')).toBe('50.000')
  })

  it('returns 0 for NaN string', () => {
    expect(formatNumber('not-a-number')).toBe('0')
  })

  it('formats zero', () => {
    expect(formatNumber(0)).toBe('0')
  })

  it('formats large numbers', () => {
    expect(formatNumber(1000000)).toBe('1.000.000')
  })
})

describe('formatCurrencyInWords', () => {
  it('formats zero', () => {
    expect(formatCurrencyInWords(0)).toBe('CERO PESOS M/CTE')
  })

  it('formats thousands', () => {
    expect(formatCurrencyInWords(20000)).toBe('VEINTE MIL PESOS M/CTE')
    expect(formatCurrencyInWords(150000)).toBe('CIENTO CINCUENTA MIL PESOS M/CTE')
  })

  it('formats pure millions with DE PESOS M/CTE', () => {
    expect(formatCurrencyInWords(1000000)).toBe('UN MILLÓN DE PESOS M/CTE')
    expect(formatCurrencyInWords(2000000)).toBe('DOS MILLONES DE PESOS M/CTE')
  })

  it('formats millions and thousands with PESOS M/CTE', () => {
    expect(formatCurrencyInWords(1500000)).toBe('UN MILLÓN QUINIENTOS MIL PESOS M/CTE')
  })
})

describe('generateCufe', () => {
  it('generates a 96-character hex string', () => {
    const cufe = generateCufe('CIL-001', new Date('2026-01-01'), 150000)
    expect(cufe).toHaveLength(96)
    expect(/^[0-9a-f]{96}$/.test(cufe)).toBe(true)
  })

  it('is deterministic for the same parameters', () => {
    const c1 = generateCufe('CIL-001', '2026-01-01', 150000)
    const c2 = generateCufe('CIL-001', '2026-01-01', 150000)
    expect(c1).toBe(c2)
  })
})
