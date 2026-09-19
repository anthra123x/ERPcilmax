'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/modules/auth/auth.actions'
import { parseError } from '@/lib/errors'
import { getBoolean, getNumber, getString } from '@/lib/form-data'
import {
  AddWebMediaSchema,
  BulkUpdateWebProductsSchema,
  UpdateWebProductSchema,
  UpdateWebSettingsSchema,
} from '@/lib/validations'
import { createSale } from '@/modules/sales/sales.actions'
import { getWebSettings } from './web.service'
import { buildUniqueSlug, computeStockStatus, computeWebReadiness } from './web.helpers'
import type { ProductWebStatus } from './web.types'
import type { Prisma } from '@prisma/client'

// ─────────────────────────────────────────────────────────────
// Resumen del panel "Tienda online"
// ─────────────────────────────────────────────────────────────

export async function getWebOverview() {
  await requireAuth()

  const [visibleProducts, totalProducts, pendingOrders, confirmedOrders, unreadMessages, pendingReviews, settings] =
    await Promise.all([
      prisma.product.count({ where: { webVisible: true, deletedAt: null } }),
      prisma.product.count({ where: { deletedAt: null } }),
      prisma.webOrder.count({ where: { status: 'PENDING' } }),
      prisma.webOrder.count({ where: { status: 'CONFIRMED' } }),
      prisma.contactMessage.count({ where: { read: false } }),
      prisma.productReview.count({ where: { approved: false } }),
      getWebSettings(),
    ])

  const [recentOrders, recentMessages] = await Promise.all([
    prisma.webOrder.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        customerName: true,
        customerPhone: true,
        total: true,
        status: true,
        createdAt: true,
        items: { select: { productName: true, quantity: true } },
      },
    }),
    prisma.contactMessage.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, name: true, message: true, read: true, createdAt: true },
    }),
  ])

  return {
    visibleProducts,
    totalProducts,
    pendingOrders,
    confirmedOrders,
    unreadMessages,
    pendingReviews,
    settings,
    recentOrders,
    recentMessages,
  }
}

// ─────────────────────────────────────────────────────────────
// Productos web (visibilidad, destacado, orden, slug, descripción)
// ─────────────────────────────────────────────────────────────

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

  revalidatePath('/web/products')
  revalidatePath(`/web/products/${id}`)
  revalidatePath('/api/ecommerce/products')
  revalidatePath('/web')
  return { success: visible ? 'Producto publicado en la tienda' : 'Producto oculto de la tienda' }
}

export async function setWebProductFeatured(id: string, featured: boolean) {
  await requireAuth()

  try {
    await prisma.product.update({ where: { id }, data: { webFeatured: featured } })
  } catch (error) {
    return { error: parseError(error, 'No se pudo actualizar el destacado').message }
  }

  revalidatePath('/web/products')
  revalidatePath(`/web/products/${id}`)
  revalidatePath('/api/ecommerce/products')
  revalidatePath('/web')
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

  revalidatePath('/web/products')
  revalidatePath('/api/ecommerce/products')
  revalidatePath('/web')
  return { success: `${count} ${count === 1 ? 'producto actualizado' : 'productos actualizados'}` }
}

/**
 * Reordena el catálogo: reubica el producto una posición arriba/abajo y
 * renumera todo el listado de productos vivos para evitar empates de orden.
 */
export async function moveWebProduct(id: string, direction: 'up' | 'down') {
  await requireAuth()

  const products = await prisma.product.findMany({
    where: { deletedAt: null },
    orderBy: [{ webSortOrder: 'asc' }, { name: 'asc' }],
    select: { id: true },
  })
  const index = products.findIndex((p) => p.id === id)
  if (index === -1) return { error: 'Producto no encontrado' }

  const target = direction === 'up' ? index - 1 : index + 1
  if (target < 0 || target >= products.length) {
    return { error: 'El producto ya está en el extremo del catálogo' }
  }

  const reordered = [...products]
  ;[reordered[index], reordered[target]] = [reordered[target], reordered[index]]

  try {
    await prisma.$transaction(
      reordered.map((p, i) => prisma.product.update({ where: { id: p.id }, data: { webSortOrder: i } })),
    )
  } catch (error) {
    return { error: parseError(error, 'No se pudo actualizar el orden').message }
  }

  revalidatePath('/web/products')
  revalidatePath('/api/ecommerce/products')
  revalidatePath('/web')
  return { success: 'Orden del catálogo actualizado' }
}

export async function getAdminWebProductById(id: string) {
  await requireAuth()

  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      category: { select: { id: true, name: true } },
      media: { orderBy: { position: 'asc' }, select: { id: true, url: true, alt: true, position: true } },
      webReviews: {
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          rating: true,
          comment: true,
          approved: true,
          createdAt: true,
        },
      },
    },
  })

  return product
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

  revalidatePath('/web/products')
  revalidatePath(`/web/products/${id}`)
  revalidatePath('/web')
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
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    })
    if (!product) return { error: 'Producto no encontrado' }

    const aggregate = await prisma.productMedia.aggregate({
      where: { productId },
      _max: { position: true },
    })
    const position = (aggregate._max.position ?? -1) + 1

    await prisma.productMedia.create({
      data: {
        productId,
        url: parsed.data.url,
        alt: parsed.data.alt || null,
        position,
      },
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

// ─────────────────────────────────────────────────────────────
// Pedidos web → venta POS
// ─────────────────────────────────────────────────────────────

export async function getAdminWebOrders(status: string = 'ALL', page = 1, take = 20, search = '') {
  await requireAuth()

  const allowed = ['PENDING', 'CONFIRMED', 'CONVERTED', 'CANCELLED']
  const statusWhere: Prisma.WebOrderWhereInput = allowed.includes(status)
    ? { status: status as 'PENDING' | 'CONFIRMED' | 'CONVERTED' | 'CANCELLED' }
    : {}
  const searchTerm = search.trim()
  const searchWhere: Prisma.WebOrderWhereInput = searchTerm
    ? {
        OR: [
          { reference: { contains: searchTerm } },
          { customerName: { contains: searchTerm, mode: 'insensitive' } },
          { customerPhone: { contains: searchTerm } },
        ],
      }
    : {}
  const where: Prisma.WebOrderWhereInput = { ...statusWhere, ...searchWhere }

  const [orders, total] = await Promise.all([
    prisma.webOrder.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * take,
      take,
      include: {
        items: { select: { id: true, productName: true, quantity: true, total: true } },
        convertedSale: { select: { id: true, invoiceNumber: true } },
      },
    }),
    prisma.webOrder.count({ where }),
  ])

  return { orders, total, page, totalPages: Math.ceil(total / take) }
}

export async function getAdminWebOrderById(id: string) {
  await requireAuth()

  const order = await prisma.webOrder.findUnique({
    where: { id },
    include: {
      items: {
        orderBy: { id: 'asc' },
        include: { product: { select: { id: true, name: true, slug: true, imageUrl: true } } },
      },
      convertedSale: {
        select: {
          id: true,
          invoiceNumber: true,
          total: true,
          saleDate: true,
          items: { select: { id: true, productId: true, quantity: true, unitPrice: true, total: true } },
        },
      },
    },
  })

  return order
}

/**
 * Convierte un pedido web en venta POS (CASH). Reusa `createSale` para que el
 * flujo sea idéntico al de ventas manuales: valida stock, descuenta inventario,
 * crea factura y transacción contable. El cliente se busca por teléfono o se crea.
 */
export async function convertWebOrderToSale(id: string) {
  await requireAuth()

  const order = await prisma.webOrder.findUnique({
    where: { id },
    include: { items: true },
  })
  if (!order) return { error: 'Pedido no encontrado' }
  if (order.status === 'CONVERTED' || order.status === 'CANCELLED') {
    return { error: 'El pedido ya no está pendiente' }
  }

  const items = order.items.map((item) => {
    if (!item.productId) {
      throw new Error(`"${item.productName}" ya no tiene referencia de producto en inventario`)
    }
    return { productId: item.productId, quantity: item.quantity }
  })

  try {
    let clientId: string | null = null
    if (order.customerPhone) {
      const existing = await prisma.client.findFirst({
        where: { phone: order.customerPhone, deletedAt: null },
        select: { id: true },
      })
      if (existing) {
        clientId = existing.id
      } else {
        const created = await prisma.client.create({
          data: {
            name: order.customerName,
            phone: order.customerPhone,
            email: order.customerEmail ?? null,
          },
        })
        clientId = created.id
      }
    }

    // Si el pedido estaba CONFIRMED, el stock ya fue descontado y no debe
    // volver a descontarse al crear la venta (solo se valida disponibilidad).
    const result = await createSale({
      clientId,
      items,
      discount: 0,
      paymentMethod: 'CASH',
      stockReserved: order.status === 'CONFIRMED',
    })

    if (!result.success) return { error: result.error }

    await prisma.webOrder.update({
      where: { id },
      data: { status: 'CONVERTED', convertedSaleId: result.sale.id },
    })

    revalidatePath('/web/orders')
    revalidatePath('/web/orders/' + id)
    revalidatePath('/web')
    revalidatePath('/sales')
    revalidatePath('/inventory')
    revalidatePath('/credits')
    revalidatePath('/finances')
    revalidatePath('/dashboard')
    return { success: `Pedido convertido a la venta ${result.sale.invoiceNumber}`, saleId: result.sale.id }
  } catch (error) {
    return { error: parseError(error, 'No se pudo convertir el pedido').message }
  }
}

/**
 * CONFIRMA un pedido web: descuenta el stock (reserva real, misma regla que los
 * pedidos de venta) y registra movimientos RESERVATION por item. Solo procede
 * desde PENDING. El stock se restaura al cancelar y no se descuenta de nuevo al
 * convertir a venta (createSale con stockReserved).
 */
export async function confirmWebOrder(id: string) {
  await requireAuth()

  const order = await prisma.webOrder.findUnique({
    where: { id },
    include: { items: true },
  })
  if (!order) return { error: 'Pedido no encontrado' }
  if (order.status !== 'PENDING') return { error: 'El pedido ya no está pendiente' }

  const ref = order.reference ?? order.id

  try {
    await prisma.$transaction(async (tx) => {
      for (const item of order.items) {
        if (!item.productId) {
          throw new Error(`"${item.productName}" ya no tiene referencia de producto en inventario`)
        }

        const reserved = await tx.product.updateMany({
          where: { id: item.productId, deletedAt: null, stock: { gte: item.quantity } },
          data: { stock: { decrement: item.quantity } },
        })
        if (reserved.count === 0) {
          const product = await tx.product.findUnique({
            where: { id: item.productId },
            select: { name: true, stock: true },
          })
          throw new Error(
            product
              ? `Stock insuficiente para "${product.name}": disponible ${product.stock}, solicitado ${item.quantity}`
              : `El producto "${item.productName}" ya no está disponible en inventario`,
          )
        }

        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            type: 'RESERVATION',
            quantity: item.quantity,
            reference: ref,
          },
        })
      }

      await tx.webOrder.update({
        where: { id },
        data: { status: 'CONFIRMED', confirmedAt: new Date() },
      })
    })
  } catch (error) {
    return { error: parseError(error, 'No se pudo confirmar el pedido').message }
  }

  revalidatePath('/web/orders')
  revalidatePath(`/web/orders/${id}`)
  revalidatePath('/inventory')
  revalidatePath('/web')
  return { success: `Pedido ${ref} confirmado. Stock reservado.` }
}

export async function cancelWebOrder(id: string) {
  await requireAuth()

  const order = await prisma.webOrder.findUnique({
    where: { id },
    include: { items: true },
  })
  if (!order) return { error: 'Pedido no encontrado' }
  if (order.status !== 'PENDING' && order.status !== 'CONFIRMED') {
    return { error: 'El pedido ya no puede cancelarse' }
  }

  const ref = order.reference ?? order.id

  try {
    await prisma.$transaction(async (tx) => {
      // Si estaba CONFIRMED, se restaura el stock reservado.
      if (order.status === 'CONFIRMED') {
        for (const item of order.items) {
          if (!item.productId) continue
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          })
          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              type: 'RELEASE',
              quantity: item.quantity,
              reference: ref,
            },
          })
        }
      }

      await tx.webOrder.update({
        where: { id },
        data: { status: 'CANCELLED' },
      })
    })
  } catch (error) {
    return { error: parseError(error, 'No se pudo cancelar el pedido').message }
  }

  revalidatePath('/web/orders')
  revalidatePath(`/web/orders/${id}`)
  revalidatePath('/inventory')
  revalidatePath('/web')
  return { success: 'Pedido cancelado' }
}

// ─────────────────────────────────────────────────────────────
// Mensajes de contacto
// ─────────────────────────────────────────────────────────────

export async function getAdminWebMessages() {
  await requireAuth()

  return await prisma.contactMessage.findMany({
    orderBy: { createdAt: 'desc' },
    select: { id: true, name: true, phone: true, email: true, message: true, read: true, createdAt: true },
  })
}

export async function setWebMessageRead(id: string, read: boolean) {
  await requireAuth()
  try {
    await prisma.contactMessage.update({ where: { id }, data: { read } })
    revalidatePath('/web/messages')
    revalidatePath('/web')
    return { success: read ? 'Mensaje marcado como leído' : 'Mensaje marcado como no leído' }
  } catch (error) {
    return { error: parseError(error).message }
  }
}

export async function deleteWebMessage(id: string) {
  await requireAuth()
  try {
    await prisma.contactMessage.delete({ where: { id } })
    revalidatePath('/web/messages')
    revalidatePath('/web')
    return { success: 'Mensaje eliminado' }
  } catch (error) {
    return { error: parseError(error).message }
  }
}

// ─────────────────────────────────────────────────────────────
// Reseñas
// ─────────────────────────────────────────────────────────────

export async function getAdminWebReviews() {
  await requireAuth()

  return await prisma.productReview.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      product: { select: { id: true, name: true, slug: true, webVisible: true, deletedAt: true } },
      name: true,
      email: true,
      rating: true,
      comment: true,
      approved: true,
      createdAt: true,
    },
  })
}

export async function setWebReviewApproved(id: string, approved: boolean) {
  await requireAuth()
  try {
    await prisma.productReview.update({ where: { id }, data: { approved } })
    revalidatePath('/web/reviews')
    revalidatePath('/web')
    return { success: approved ? 'Reseña publicada' : 'Reseña ocultada' }
  } catch (error) {
    return { error: parseError(error).message }
  }
}

export async function deleteWebReview(id: string) {
  await requireAuth()
  try {
    await prisma.productReview.delete({ where: { id } })
    revalidatePath('/web/reviews')
    revalidatePath('/web')
    return { success: 'Reseña eliminada' }
  } catch (error) {
    return { error: parseError(error).message }
  }
}

// ─────────────────────────────────────────────────────────────
// Ajustes de la tienda (tema, WhatsApp, contacto)
// ─────────────────────────────────────────────────────────────

export async function getAdminWebSettings() {
  await requireAuth()
  return await getWebSettings()
}

export async function updateWebSettings(formData: FormData) {
  await requireAuth()

  const parsed = UpdateWebSettingsSchema.safeParse({
    storeName: getString(formData, 'storeName') || '',
    whatsapp: getString(formData, 'whatsapp') || '',
    email: getString(formData, 'email') || '',
    shippingInfo: getString(formData, 'shippingInfo') || '',
    primaryColor: getString(formData, 'primaryColor') || '#008a93',
    goldColor: getString(formData, 'goldColor') || '#d4af37',
  })

  if (!parsed.success) {
    return { error: parsed.error.issues.map((e) => e.message).join(', ') }
  }

  const d = parsed.data

  try {
    await prisma.$transaction([
      prisma.storeSetting.upsert({
        where: { key: 'store' },
        create: { key: 'store', value: { storeName: d.storeName, shippingInfo: d.shippingInfo || null } },
        update: { value: { storeName: d.storeName, shippingInfo: d.shippingInfo || null } },
      }),
      prisma.storeSetting.upsert({
        where: { key: 'whatsapp' },
        create: { key: 'whatsapp', value: { number: d.whatsapp } },
        update: { value: { number: d.whatsapp } },
      }),
      prisma.storeSetting.upsert({
        where: { key: 'contact' },
        create: { key: 'contact', value: { email: d.email } },
        update: { value: { email: d.email } },
      }),
      prisma.storeSetting.upsert({
        where: { key: 'theme' },
        create: { key: 'theme', value: { primaryColor: d.primaryColor, goldColor: d.goldColor } },
        update: { value: { primaryColor: d.primaryColor, goldColor: d.goldColor } },
      }),
    ])
  } catch (error) {
    return { error: parseError(error, 'No se pudieron guardar los ajustes').message }
  }

  revalidatePath('/web/settings')
  revalidatePath('/web')
  return { success: 'Ajustes de la tienda guardados' }
}
