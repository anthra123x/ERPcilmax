import { describe, it, expect, vi } from 'vitest'
import { resolveSalesIncomeCategory } from './sales.helpers'

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
