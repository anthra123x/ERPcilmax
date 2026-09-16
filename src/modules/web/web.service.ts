import { prisma } from '@/lib/prisma'
import type { WebCategory, WebContactInput, WebOrderInput, WebProduct, WebProductReview, WebRating, WebReviewInput, WebSettings, WebVariant } from './web.types'
import { DEFAULT_WEB_SETTINGS } from './web.types'

// ─────────────────────────────────────────────────────────────
// Mapeo de producto ERP → DTO de tienda (puro, testeable)
// ─────────────────────────────────────────────────────────────

type WebProductRow = {
  id: string
  name: string
  description: string | null
  barcode: string | null
  imageUrl: string | null
  salePrice: number
  stock: number
  slug: string | null
  webFeatured: boolean
  category: { name: string; slug: string | null } | null
  media: { url: string }[]
  webReviews?: { rating: number }[]
}

function isHttpUrl(value: string | null): value is string {
  return typeof value === 'string' && /^https?:\/\//i.test(value)
}

/** Variante única derivada del producto ERP (el ERP no tiene variantes). */
export function toWebVariant(product: Pick<WebProductRow, 'id' | 'barcode' | 'salePrice' | 'stock'>): WebVariant {
  return {
    id: product.id,
    title: 'Único',
    sku: product.barcode,
    amount: Math.round(product.salePrice),
    currencyCode: 'COP',
    inventoryQuantity: product.stock,
  }
}

function averageRating(reviews: { rating: number }[] = []): WebRating | null {
  if (reviews.length === 0) return null
  const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
  return { avg: Math.round(avg * 10) / 10, count: reviews.length }
}

/** Convierte una fila de producto (con media + categoría) en el DTO de tienda. */
export function toWebProduct(product: WebProductRow, ratingOverride?: WebRating | null): WebProduct | null {
  if (!product.slug) return null

  const variant = toWebVariant(product)
  const mediaImages = product.media.map((img) => ({ url: img.url }))
  const legacyImages = isHttpUrl(product.imageUrl) ? [{ url: product.imageUrl }] : []
  const images = mediaImages.length > 0 ? mediaImages : legacyImages

  const rating = ratingOverride === undefined ? averageRating(product.webReviews) : ratingOverride

  return {
    id: product.id,
    title: product.name,
    handle: product.slug,
    description: product.description ?? '',
    thumbnail: images[0]?.url ?? null,
    images,
    variants: [variant],
    collectionTitle: product.category?.name ?? null,
    currencyCode: 'COP',
    featured: product.webFeatured,
    categorySlug: product.category?.slug ?? null,
    rating,
  }
}

// ─────────────────────────────────────────────────────────────
// Lectura del catálogo web
// ─────────────────────────────────────────────────────────────

const MEDIA_ORDER = { position: 'asc' as const }

export async function getCatalogProducts(options?: {
  limit?: number
  offset?: number
  categorySlug?: string | null
  search?: string
}) {
  const limit = Math.min(options?.limit ?? 36, 100)
  const offset = Math.max(options?.offset ?? 0, 0)
  const categorySlug = options?.categorySlug?.trim() || undefined
  const search = options?.search?.trim() || undefined

  const products = await prisma.product.findMany({
    where: {
      webVisible: true,
      deletedAt: null,
      slug: { not: null },
      ...(categorySlug && { category: { slug: categorySlug } }),
      ...(search && { name: { contains: search, mode: 'insensitive' } }),
    },
    orderBy: [{ webSortOrder: 'asc' }, { name: 'asc' }],
    include: {
      media: { orderBy: MEDIA_ORDER, select: { url: true } },
      category: { select: { name: true, slug: true } },
    },
    skip: offset,
    take: limit,
  })

  const ids = products.map((p) => p.id)
  const ratings = await ratingByProductIds(ids)

  return products
    .map((p) => toWebProduct(p, ratings.get(p.id) ?? null))
    .filter((p): p is WebProduct => p !== null)
}

export async function getCatalogProductByHandle(handle: string): Promise<WebProduct | null> {
  const product = await prisma.product.findFirst({
    where: { slug: handle, webVisible: true, deletedAt: null },
    include: {
      media: { orderBy: MEDIA_ORDER, select: { url: true } },
      category: { select: { name: true, slug: true } },
    },
  })
  if (!product) return null

  const reviews = await prisma.productReview.findMany({
    where: { productId: product.id, approved: true },
    select: { rating: true },
  })

  return toWebProduct(product, averageRating(reviews))
}

export async function getCatalogCategories(): Promise<WebCategory[]> {
  const categories = await prisma.productCategory.findMany({
    where: { deletedAt: null, slug: { not: null }, products: { some: { webVisible: true, deletedAt: null } } },
    orderBy: { name: 'asc' },
    select: { id: true, name: true, slug: true, color: true },
  })
  return categories
}

// ─────────────────────────────────────────────────────────────
// Reseñas (lectura para SSR + creación)
// ─────────────────────────────────────────────────────────────

export async function getProductReviews(productId: string, limit = 50): Promise<WebProductReview[]> {
  const reviews = await prisma.productReview.findMany({
    where: { productId, approved: true },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
  return reviews.map((r) => ({
    id: r.id,
    productId: r.productId,
    name: r.name,
    email: r.email,
    rating: r.rating,
    comment: r.comment,
    createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
  }))
}

export async function createProductReview(input: WebReviewInput): Promise<WebProductReview> {
  const product = await prisma.product.findFirst({
    where: { id: input.productId, deletedAt: null },
    select: { id: true, webVisible: true },
  })
  if (!product) throw new Error('Producto inválido')

  const review = await prisma.productReview.create({
    data: {
      productId: product.id,
      name: input.name,
      email: input.email ?? null,
      rating: input.rating,
      comment: input.comment,
    },
  })
  return {
    id: review.id,
    productId: review.productId,
    name: review.name,
    email: review.email,
    rating: review.rating,
    comment: review.comment,
    createdAt: review.createdAt instanceof Date ? review.createdAt.toISOString() : String(review.createdAt),
  }
}

// ─────────────────────────────────────────────────────────────
// Mensajes de contacto
// ─────────────────────────────────────────────────────────────

export async function createContactMessage(input: WebContactInput) {
  return await prisma.contactMessage.create({
    data: {
      name: input.name,
      phone: input.phone ?? null,
      email: input.email ?? null,
      message: input.message,
    },
  })
}

// ─────────────────────────────────────────────────────────────
// Pedidos web
// ─────────────────────────────────────────────────────────────

export async function createWebOrder(input: WebOrderInput) {
  // Los precios/clientes NO se confían: se re-leen desde la BD.
  const productIds = input.items.map((item) => item.productId)
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, deletedAt: null, webVisible: true, stock: { gte: 0 } },
    select: { id: true, name: true, slug: true, salePrice: true, webVisible: true },
  })
  const byId = new Map(products.map((p) => [p.id, p]))
  if (products.length !== productIds.length) throw new Error('Uno de los productos ya no está disponible')

  const items = input.items.map((item) => {
    const product = byId.get(item.productId)!
    if (!product.webVisible || !product.slug) throw new Error('Uno de los productos ya no está disponible')
    const total = Math.round(product.salePrice) * item.quantity
    return {
      productId: product.id,
      productName: product.name,
      handle: product.slug,
      unitPrice: Math.round(product.salePrice),
      quantity: item.quantity,
      total,
    }
  })

  const total = items.reduce((sum, item) => sum + item.total, 0)

  return await prisma.$transaction(async (tx) => {
    return await tx.webOrder.create({
      data: {
        customerName: input.customerName,
        customerPhone: input.customerPhone,
        customerEmail: input.customerEmail ?? null,
        notes: input.notes ?? null,
        total,
        currency: 'COP',
        items: { create: items },
      },
      include: { items: true },
    })
  })
}

// ─────────────────────────────────────────────────────────────
// Ajustes de la tienda (tema, WhatsApp, contacto)
// ─────────────────────────────────────────────────────────────

export async function getWebSettings(): Promise<WebSettings> {
  const rows = await prisma.storeSetting.findMany()
  const settings: WebSettings = { ...DEFAULT_WEB_SETTINGS }

  for (const row of rows) {
    if (row.key === 'store' && typeof row.value === 'object' && row.value !== null) {
      const value = row.value as Record<string, unknown>
      settings.storeName = typeof value.storeName === 'string' ? value.storeName : settings.storeName
      settings.shippingInfo = typeof value.shippingInfo === 'string' ? value.shippingInfo : null
    }
    if (row.key === 'whatsapp' && typeof row.value === 'object' && row.value !== null) {
      const value = row.value as Record<string, unknown>
      settings.whatsapp = typeof value.number === 'string' && value.number ? value.number : null
    }
    if (row.key === 'contact' && typeof row.value === 'object' && row.value !== null) {
      const value = row.value as Record<string, unknown>
      settings.email = typeof value.email === 'string' && value.email ? value.email : null
    }
    if (row.key === 'theme' && typeof row.value === 'object' && row.value !== null) {
      const value = row.value as Record<string, unknown>
      settings.theme.primaryColor = typeof value.primaryColor === 'string' ? value.primaryColor : settings.theme.primaryColor
      settings.theme.goldColor = typeof value.goldColor === 'string' ? value.goldColor : settings.theme.goldColor
    }
  }

  return settings
}

// ─────────────────────────────────────────────────────────────
// Auxiliares
// ─────────────────────────────────────────────────────────────

async function ratingByProductIds(ids: string[]): Promise<Map<string, WebRating>> {
  if (ids.length === 0) return new Map()

  const groups = await prisma.productReview.groupBy({
    by: ['productId'],
    where: { productId: { in: ids }, approved: true },
    _avg: { rating: true },
    _count: { rating: true },
  })
  const map = new Map<string, WebRating>()
  for (const group of groups) {
    const avg = group._avg.rating ?? 0
    map.set(group.productId, {
      avg: Math.round(avg * 10) / 10,
      count: group._count.rating,
    })
  }
  return map
}