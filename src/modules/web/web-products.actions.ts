'use server'

/**
 * web-products.actions.ts
 * Gestión de productos web: visibilidad, orden, slug, imágenes.
 */
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/modules/auth/auth.actions'
import { parseError } from '@/lib/errors'
import { getBoolean, getNumber, getString } from '@/lib/form-data'
import { AddWebMediaSchema, BulkUpdateWebProductsSchema, UpdateWebProductSchema } from '@/lib/validations'
import { buildUniqueSlug, computeStockStatus, computeWebReadiness } from './web.helpers'
import { revalidateWebCatalogPaths } from '@/lib/revalidation'
import type { ProductWebStatus } from './web.types'
import type { Prisma } from '@prisma/client'

export interface AdminWebProductFilters {
  search?: string
  categoryId?: string
  status?: 'ALL' | 'VISIBLE' | 'HIDDEN' | 'FEATURED'
  stock?: 'ALL' | 'OK' | 'LOW' | 'OUT'
}

export async function getAdminWebProducts(filters: AdminWebProductFilters = {}) {
  await requireAuth()

  const search = filters.search?.trim() || undefined
  const categoryId = filters.categoryId?.trim() || undefined

  const where: Prisma.ProductWhereInput = {
    deletedAt: null,
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
        { barcode: { contains: search, mode: 'insensitive' } },
      ],
    }),
    ...(categoryId && { categoryId }),
    ...(filters.status === 'VISIBLE' && { webVisible: true }),
    ...(filters.status === 'HIDDEN' && { webVisible: false }),
    ...(filters.status === 'FEATURED' && { webFeatured: true }),
  }

  const products = await prisma.product.findMany({
    where,
    orderBy: [{ webSortOrder: 'asc' }, { name: 'asc' }],
    select: {
      id: true,
      name: true,
      barcode: true,
      description: true,
      salePrice: true,
      stock: true,
      lowStockThreshold: true,
      slug: true,
      webVisible: true,
      webFeatured: true,
      webSortOrder: true,
      webDescription: true,
      imageUrl: true,
      category: { select: { id: true, name: true, slug: true } },
      media: { orderBy: { position: 'asc' }, select: { id: true, url: true } },
      _count: { select: { webReviews: true } },
    },
  })

  const rows = products.filter((p) => {
    if (!filters.stock || filters.stock === 'ALL') return true
    return computeStockStatus(p.stock, p.lowStockThreshold) === filters.stock
  })

  return rows.map((p) => {
    const stockStatus = computeStockStatus(p.stock, p.lowStockThreshold)
    return {
      id: p.id,
      name: p.name,
      barcode: p.barcode,
      salePrice: p.salePrice,
      stock: p.stock,
      lowStockThreshold: p.lowStockThreshold,
      slug: p.slug,
      webVisible: p.webVisible,
      webFeatured: p.webFeatured,
      webSortOrder: p.webSortOrder,
      webDescription: p.webDescription,
      imageUrl: p.imageUrl,
      category: p.category,
      media: p.media,
      reviewCount: p._count.webReviews,
      stockStatus,
      readiness: computeWebReadiness({
        slug: p.slug,
        description: p.description,
        mediaCount: p.media.length,
        hasImageUrl: Boolean(p.imageUrl),
      }),
    }
  })
}

export async function getWebCategoryOptions() {
  await requireAuth()

  return await prisma.productCategory.findMany({
    where: { deletedAt: null, products: { some: { deletedAt: null } } },
    orderBy: { name: 'asc' },
    select: { id: true, name: true },
  })
}

/** Estado del producto para la tarjeta "Tienda online" de la ficha de inventario. */
export async function getProductWebStatus(id: string): Promise<ProductWebStatus | null> {
  await requireAuth()

  const product = await prisma.product.findUnique({
    where: { id },
    select: {
      webVisible: true,
      webFeatured: true,
      slug: true,
      webSortOrder: true,
      description: true,
      imageUrl: true,
      stock: true,
      lowStockThreshold: true,
      _count: { select: { media: true } },
    },
  })
  if (!product) return null

  const readiness = computeWebReadiness({
    slug: product.slug,
    description: product.description,
    mediaCount: product._count.media,
    hasImageUrl: Boolean(product.imageUrl),
  })

  return {
    webVisible: product.webVisible,
    webFeatured: product.webFeatured,
    slug: product.slug,
    webSortOrder: product.webSortOrder,
    stock: product.stock,
    lowStockThreshold: product.lowStockThreshold,
    mediaCount: product._count.media,
    readiness,
    stockStatus: computeStockStatus(product.stock, product.lowStockThreshold),
  }
}

export async function setWebProductVisible(id: string, visible: boolean) {
  await requireAuth()

  try {
    let slug: string | null = null
    if (visible) {
      const product = await prisma.product.findUnique({ where: { id }, select: { name: true, slug: true } })
      if (!product) return { error: 'Producto no encontrado' }

      if (!product.slug) {
        slug = await buildUniqueSlug(product.name, async (candidate) => {
          const existing = await prisma.product.findUnique({ where: { slug: candidate }, select: { id: true } })
          return existing !== null
        })
      }
    }

    await prisma.product.update({
      where: { id },
      data: visible
        ? { webVisible: true, ...(slug ? { slug } : {}) }
        : { webVisible: false },
    })
  } catch (error) {
    return { error: parseError(error, 'No se pudo actualizar la publicación').message }
  }

  revalidateWebCatalogPaths()
  revalidatePath(`/web/products/${id}`)
  return { success: visible ? 'Producto publicado en la tienda' : 'Producto oculto de la tienda' }
}

export async function setWebProductFeatured(id: string, featured: boolean) {
  await requireAuth()

  try {
    await prisma.product.update({ where: { id }, data: { webFeatured: featured } })
  } catch (error) {
    return { error: parseError(error, 'No se pudo actualizar el destacado').message }
  }

  revalidateWebCatalogPaths()
  revalidatePath(`/web/products/${id}`)
  return { success: featured ? 'Producto marcado como destacado' : 'Producto quitado de destacados' }
}

export async function bulkUpdateWebProducts(ids: string[], patch: { webVisible?: boolean; webFeatured?: boolean }) {
  await requireAuth()

  const parsed = BulkUpdateWebProductsSchema.safeParse({ ids, ...patch })
  if (!parsed.success) {
    return { error: parsed.error.issues.map((e) => e.message).join(', ') }
  }

  const data: { webVisible?: boolean; webFeatured?: boolean } = {}
  if (parsed.data.webVisible !== undefined) data.webVisible = parsed.data.webVisible
  if (parsed.data.webFeatured !== undefined) data.webFeatured = parsed.data.webFeatured

  let count = 0
  try {
    count = (await prisma.product.updateMany({ where: { id: { in: ids }, deletedAt: null }, data })).count
    if (count === 0) return { error: 'Ningún producto fue actualizado' }
  } catch (error) {
    return { error: parseError(error, 'No se pudieron actualizar los productos').message }
  }

  revalidateWebCatalogPaths()
  return { success: `${count} ${count === 1 ? 'producto actualizado' : 'productos actualizados'}` }
}

export async function moveWebProduct(id: string, direction: 'up' | 'down') {
  await requireAuth()

  const products = await prisma.product.findMany({
    where: { deletedAt: null },
    orderBy: [{ webSortOrder: 'asc' }, { name: 'asc' }],
    select: { id: true, webSortOrder: true },
  })
  const index = products.findIndex((p) => p.id === id)
  if (index === -1) return { error: 'Producto no encontrado' }

  const target = direction === 'up' ? index - 1 : index + 1
  if (target < 0 || target >= products.length) {
    return { error: 'El producto ya está en el extremo del catálogo' }
  }

  const current = products[index]
  const neighbor = products[target]

  try {
    await prisma.$transaction([
      prisma.product.update({ where: { id: current.id }, data: { webSortOrder: neighbor.webSortOrder } }),
      prisma.product.update({ where: { id: neighbor.id }, data: { webSortOrder: current.webSortOrder } }),
    ])
  } catch (error) {
    return { error: parseError(error, 'No se pudo actualizar el orden').message }
  }

  revalidateWebCatalogPaths()
  return { success: 'Orden del catálogo actualizado' }
}

export async function getAdminWebProductById(id: string) {
  await requireAuth()

  return await prisma.product.findUnique({
    where: { id },
    include: {
      category: { select: { id: true, name: true } },
      media: { orderBy: { position: 'asc' }, select: { id: true, url: true, alt: true, position: true } },
      webReviews: {
        orderBy: { createdAt: 'desc' },
        select: { id: true, name: true, email: true, rating: true, comment: true, approved: true, createdAt: true },
      },
    },
  })
}

export async function updateWebProduct(id: string, formData: FormData) {
  await requireAuth()

  const parsed = UpdateWebProductSchema.safeParse({
    slug: getString(formData, 'slug') || '',
    webDescription: getString(formData, 'webDescription') || '',
    webSortOrder: getNumber(formData, 'webSortOrder') ?? 0,
    webVisible: getBoolean(formData, 'webVisible'),
    webFeatured: getBoolean(formData, 'webFeatured'),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues.map((e) => e.message).join(', ') }
  }

  try {
    await prisma.product.update({
      where: { id },
      data: {
        slug: parsed.data.slug,
        webDescription: parsed.data.webDescription || null,
        webSortOrder: parsed.data.webSortOrder,
        webVisible: parsed.data.webVisible,
        webFeatured: parsed.data.webFeatured,
      },
    })
  } catch (error) {
    const { code } = parseError(error)
    if (code === 'P2002') return { error: 'El slug ya está en uso por otro producto' }
    return { error: parseError(error, 'No se pudo actualizar el producto').message }
  }

  revalidateWebCatalogPaths()
  revalidatePath(`/web/products/${id}`)
  return { success: 'Producto web actualizado' }
}

export async function addWebMedia(productId: string, formData: FormData) {
  await requireAuth()

  const parsed = AddWebMediaSchema.safeParse({
    url: getString(formData, 'url') || '',
    alt: getString(formData, 'alt') || '',
  })

  if (!parsed.success) {
    return { error: parsed.error.issues.map((e) => e.message).join(', ') }
  }

  try {
    const product = await prisma.product.findUnique({ where: { id: productId }, select: { id: true } })
    if (!product) return { error: 'Producto no encontrado' }

    const aggregate = await prisma.productMedia.aggregate({ where: { productId }, _max: { position: true } })
    const position = (aggregate._max.position ?? -1) + 1

    await prisma.productMedia.create({
      data: { productId, url: parsed.data.url, alt: parsed.data.alt || null, position },
    })
  } catch (error) {
    return { error: parseError(error, 'No se pudo agregar la imagen').message }
  }

  revalidatePath(`/web/products/${productId}`)
  return { success: 'Imagen agregada' }
}

export async function removeWebMedia(id: string) {
  await requireAuth()

  const media = await prisma.productMedia.findUnique({ where: { id }, select: { productId: true } })
  if (!media) return { error: 'Imagen no encontrada' }

  await prisma.productMedia.delete({ where: { id } })
  revalidatePath(`/web/products/${media.productId}`)
  return { success: 'Imagen eliminada' }
}
