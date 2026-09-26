import { describe, it, expect, vi } from 'vitest'
import { resolveSaleUnitPrice, resolveSalesIncomeCategory } from './sales.helpers'

describe('resolveSaleUnitPrice', () => {
  const product = { costPrice: 100, salePrice: 150 }

  it('uses the product salePrice when no custom price is sent', () => {
    expect(resolveSaleUnitPrice(undefined, product)).toEqual({ ok: true, unitPrice: 150 })
  })

  it('uses the product salePrice for negative requested prices', () => {
    expect(resolveSaleUnitPrice(-5, product)).toEqual({ ok: true, unitPrice: 150 })
  })

  it('accepts a custom price within [costPrice, salePrice*2]', () => {
    expect(resolveSaleUnitPrice(130, product)).toEqual({ ok: true, unitPrice: 130 })
    expect(resolveSaleUnitPrice(100, product)).toEqual({ ok: true, unitPrice: 100 })
    expect(resolveSaleUnitPrice(300, product)).toEqual({ ok: true, unitPrice: 300 })
  })

  it('rejects prices below costPrice (hard rule #2)', () => {
    const result = resolveSaleUnitPrice(99, product)
    expect(result).toEqual({ ok: false, error: expect.stringContaining('costo') })
  })

  it('rejects prices above salePrice * 2 (sanity check)', () => {
    const result = resolveSaleUnitPrice(301, product)
    expect(result).toEqual({ ok: false, error: expect.stringContaining('doble') })
  })
})

describe('resolveSalesIncomeCategory', () => {
  it('returns the existing income category id when one exists', async () => {
    const tx = { category: { findFirst: vi.fn().mockResolvedValue({ id: 'cat-1' }), create: vi.fn() } }

    const id = await resolveSalesIncomeCategory(tx as never)

    expect(id).toBe('cat-1')
    expect(tx.category.create).not.toHaveBeenCalled()
  })

  it('creates a default income category when none exists (evita FK transactions_categoryId_fkey)', async () => {
    const tx = {
      category: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ id: 'cat-new' }),
      },
    }

    const id = await resolveSalesIncomeCategory(tx as never)

    expect(id).toBe('cat-new')
    expect(tx.category.create).toHaveBeenCalledWith({
      data: { name: 'Ventas Tienda', type: 'INCOME', color: 'green', icon: 'store' },
    })
  })
})
