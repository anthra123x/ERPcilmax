import { describe, it, expect, beforeEach, vi } from 'vitest'

const prismaMocks = vi.hoisted(() => ({
  product: { findMany: vi.fn(), findFirst: vi.fn() },
  productReview: { groupBy: vi.fn(), findMany: vi.fn(), create: vi.fn() },
  productCategory: { findMany: vi.fn() },
  contactMessage: { create: vi.fn() },
  storeSetting: { findMany: vi.fn() },
  $transaction: vi.fn((fn: (tx: unknown) => unknown) => fn(prismaMockData.transaction)),
}))

const prismaMockData = {
  transaction: {
    webOrder: { create: vi.fn() },
    systemSettings: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
  },
}

vi.mock('@/lib/prisma', () => ({
  prisma: {
    product: prismaMocks.product,
    productReview: prismaMocks.productReview,
    productCategory: prismaMocks.productCategory,
    contactMessage: prismaMocks.contactMessage,
    storeSetting: prismaMocks.storeSetting,
    $transaction: prismaMocks.$transaction,
  },
}))

import {
  getCatalogProductByHandle,
  getCatalogCategories,
  getCatalogProducts,
  getProductReviews,
  createProductReview,
  createContactMessage,
  createWebOrder,
  getWebSettings,
  toWebVariant,
  toWebProduct,
} from './web.service'

const productRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'prod-1',
  name: 'Olla a presión',
  description: 'Combo 5L + válvula',
  barcode: '7701001',
  imageUrl: null,
  salePrice: 189900,
  stock: 5,
  slug: 'olla-presion',
  webFeatured: true,
  category: { name: 'Hogar', slug: 'hogar' },
  media: [{ url: 'https://x/img.webp' }],
  webReviews: [{ rating: 5 }, { rating: 4 }],
  ...overrides,
})

describe('toWebVariant / toWebProduct', () => {
  it('maps an ERP product to a single web variant', () => {
    const variant = toWebVariant({ id: 'prod-1', barcode: '7701', salePrice: 99.9, stock: 3 })
    expect(variant).toEqual({
      id: 'prod-1',
      title: 'Único',
      sku: '7701',
      amount: 100,
      currencyCode: 'COP',
      inventoryQuantity: 3,
    })
  })

  it('maps a product row to the storefront DTO with rating average', () => {
    const dto = toWebProduct(productRow())
    expect(dto).toMatchObject({
      id: 'prod-1',
      title: 'Olla a presión',
      handle: 'olla-presion',
      description: 'Combo 5L + válvula',
      thumbnail: 'https://x/img.webp',
      images: [{ url: 'https://x/img.webp' }],
      collectionTitle: 'Hogar',
      categorySlug: 'hogar',
      currencyCode: 'COP',
      featured: true,
      rating: { avg: 4.5, count: 2 },
    })
    expect(dto!.variants).toHaveLength(1)
  })

  it('returns null when the product has no web slug', () => {
    expect(toWebProduct(productRow({ slug: null }))).toBeNull()
  })

  it('falls back to a legacy http image when there is no media', () => {
    const dto = toWebProduct(productRow({ media: [], imageUrl: 'https://legacy/img.png' }))
    expect(dto!.images).toEqual([{ url: 'https://legacy/img.png' }])
  })

  it('ignores base64 images from the ERP panel', () => {
    const dto = toWebProduct(productRow({ media: [], imageUrl: 'data:image/png;base64,AAAA' }))
    expect(dto!.images).toEqual([])
    expect(dto!.thumbnail).toBeNull()
  })

  it('keeps the provided rating override', () => {
    const dto = toWebProduct(productRow(), { avg: 5, count: 1 })
    expect(dto!.rating).toEqual({ avg: 5, count: 1 })
  })
})

describe('getCatalogProducts', () => {
  beforeEach(() => vi.clearAllMocks())

  it('queries only visible, non-deleted products and attaches ratings', async () => {
    prismaMocks.product.findMany.mockResolvedValue([productRow()])
    prismaMocks.productReview.groupBy.mockResolvedValue([
      { productId: 'prod-1', _avg: { rating: 4.5 }, _count: { rating: 2 } },
    ])

    const result = await getCatalogProducts({ categorySlug: 'hogar', search: 'olla' })

    expect(result).toHaveLength(1)
    expect(result[0].rating).toEqual({ avg: 4.5, count: 2 })
    expect(prismaMocks.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ webVisible: true, deletedAt: null }),
      }),
    )
  })

  it('returns an empty list when rating grouping yields nothing', async () => {
    prismaMocks.product.findMany.mockResolvedValue([productRow()])
    prismaMocks.productReview.groupBy.mockResolvedValue([])

    const result = await getCatalogProducts()

    expect(result[0].rating).toBeNull()
  })
})

describe('getCatalogProductByHandle', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns null when the handle does not exist', async () => {
    prismaMocks.product.findFirst.mockResolvedValue(null)
    expect(await getCatalogProductByHandle('nope')).toBeNull()
  })

  it('returns the DTO with rating computed from approved reviews', async () => {
    prismaMocks.product.findFirst.mockResolvedValue(productRow({ webReviews: [] }))
    prismaMocks.productReview.findMany.mockResolvedValue([{ rating: 5 }, { rating: 3 }])

    const result = await getCatalogProductByHandle('olla-presion')

    expect(result!.rating).toEqual({ avg: 4, count: 2 })
  })
})

describe('getCatalogCategories', () => {
  it('returns visible categories only', async () => {
    prismaMocks.productCategory.findMany.mockResolvedValue([
      { id: 'c1', name: 'Hogar', slug: 'hogar', color: '#fff' },
    ])

    const result = await getCatalogCategories()

    expect(result).toEqual([{ id: 'c1', name: 'Hogar', slug: 'hogar', color: '#fff' }])
    expect(prismaMocks.productCategory.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ products: { some: { webVisible: true, deletedAt: null } } }),
      }),
    )
  })
})

describe('getProductReviews / createProductReview', () => {
  beforeEach(() => vi.clearAllMocks())

  it('lists approved reviews newest first', async () => {
    prismaMocks.productReview.findMany.mockResolvedValue([
      { id: 'r1', productId: 'p1', name: 'Ana', email: null, rating: 5, comment: 'genial', createdAt: new Date('2026-01-01T00:00:00Z') },
    ])

    const result = await getProductReviews('p1')

    expect(result[0]).toMatchObject({ id: 'r1', rating: 5 })
    expect(result[0].createdAt).toBe('2026-01-01T00:00:00.000Z')
    expect(prismaMocks.productReview.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { productId: 'p1', approved: true } }),
    )
  })

  it('creates a review for an existing product', async () => {
    prismaMocks.product.findFirst.mockResolvedValue({ id: 'p1', webVisible: true })
    prismaMocks.productReview.create.mockResolvedValue({
      id: 'r1', productId: 'p1', name: 'Ana', email: null, rating: 5, comment: 'genial', createdAt: new Date('2026-01-01T00:00:00Z'),
    })

    const result = await createProductReview({ productId: 'p1', name: 'Ana', rating: 5, comment: 'genial' })

    expect(result.rating).toBe(5)
    expect(prismaMocks.productReview.create).toHaveBeenCalledOnce()
  })

  it('throws when the product does not exist', async () => {
    prismaMocks.product.findFirst.mockResolvedValue(null)
    await expect(createProductReview({ productId: 'fake', name: 'Ana', rating: 5, comment: 'x' })).rejects.toThrow('Producto inválido')
  })
})

describe('createContactMessage', () => {
  it('creates the message with trimmed inputs', async () => {
    prismaMocks.contactMessage.create.mockResolvedValue({ id: 'm1' })

    await createContactMessage({ name: 'Ana', email: 'ana@x.co', message: 'Hola' })

    expect(prismaMocks.contactMessage.create).toHaveBeenCalledWith({
      data: { name: 'Ana', phone: null, email: 'ana@x.co', message: 'Hola' },
    })
  })
})

describe('createWebOrder', () => {
  beforeEach(() => vi.clearAllMocks())

  it('re-prices items from the DB and persists inside a transaction', async () => {
    prismaMocks.product.findMany.mockResolvedValue([
      { id: 'p1', name: 'Olla', slug: 'olla', salePrice: 189900, webVisible: true },
    ])
    const createdOrder = { id: 'w1', total: 189900, items: [] }
    prismaMockData.transaction.webOrder.create.mockResolvedValue(createdOrder)
    prismaMockData.transaction.systemSettings.findFirst.mockResolvedValue({
      id: 's1',
      nextWebOrderNumber: 1000,
    })

    const result = await createWebOrder({
      customerName: 'Ana',
      customerPhone: '3001234567',
      items: [{ productId: 'p1', quantity: 1 }],
    })

    expect(result).toEqual(createdOrder)
    expect(prismaMocks.product.findMany).toHaveBeenCalledTimes(1)
    expect(prismaMockData.transaction.webOrder.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        total: 189900,
        reference: 'ORD-1000',
        items: {
          create: [
            { productId: 'p1', productName: 'Olla', handle: 'olla', unitPrice: 189900, quantity: 1, total: 189900 },
          ],
        },
      }),
      include: { items: true },
    })
    expect(prismaMockData.transaction.systemSettings.update).toHaveBeenCalledWith({
      where: { id: 's1' },
      data: { nextWebOrderNumber: 1001 },
    })
  })

  it('rejects orders referencing unavailable products', async () => {
    prismaMocks.product.findMany.mockResolvedValue([])
    await expect(
      createWebOrder({ customerName: 'Ana', customerPhone: '3001234567', items: [{ productId: 'ghost', quantity: 1 }] }),
    ).rejects.toThrow('ya no está disponible')
    expect(prismaMockData.transaction.webOrder.create).not.toHaveBeenCalled()
  })
})

describe('getWebSettings', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns defaults when no settings exist', async () => {
    prismaMocks.storeSetting.findMany.mockResolvedValue([])
    const settings = await getWebSettings()
    expect(settings).toEqual({
      storeName: 'Cilmax',
      whatsapp: null,
      email: null,
      shippingInfo: null,
      theme: { primaryColor: '#008a93', goldColor: '#d4af37' },
    })
  })

  it('overrides settings from stored keys', async () => {
    prismaMocks.storeSetting.findMany.mockResolvedValue([
      { key: 'store', value: { storeName: 'Cilmax Online', shippingInfo: 'Envío gratis' } },
      { key: 'whatsapp', value: { number: '573001112233' } },
      { key: 'contact', value: { email: 'ventas@cilmax.co' } },
      { key: 'theme', value: { primaryColor: '#123456', goldColor: '#abcdef' } },
    ])

    const settings = await getWebSettings()

    expect(settings.storeName).toBe('Cilmax Online')
    expect(settings.whatsapp).toBe('573001112233')
    expect(settings.email).toBe('ventas@cilmax.co')
    expect(settings.shippingInfo).toBe('Envío gratis')
    expect(settings.theme).toEqual({ primaryColor: '#123456', goldColor: '#abcdef' })
  })
})