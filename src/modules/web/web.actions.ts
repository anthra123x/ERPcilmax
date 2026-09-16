'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/modules/auth/auth.actions'
import { parseError } from '@/lib/errors'
import { getBoolean, getNumber, getString } from '@/lib/form-data'
import { AddWebMediaSchema, UpdateWebProductSchema, UpdateWebSettingsSchema } from '@/lib/validations'
import { createSale } from '@/modules/sales/sales.actions'
import { getWebSettings } from './web.service'

// ─────────────────────────────────────────────────────────────
// Resumen del panel "Tienda online"
// ─────────────────────────────────────────────────────────────

export async function getWebOverview() {
  await requireAuth()

  const [visibleProducts, totalProducts, pendingOrders, unreadMessages, pendingReviews, settings] = await Promise.all([
    prisma.product.count({ where: { webVisible: true, deletedAt: null } }),
    prisma.product.count({ where: { deletedAt: null } }),
    prisma.webOrder.count({ where: { status: 'PENDING' } }),
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

export async function getAdminWebProducts() {
  await requireAuth()

  const products = await prisma.product.findMany({
    where: { deletedAt: null },
    orderBy: [{ webSortOrder: 'asc' }, { name: 'asc' }],
    select: {
      id: true,
      name: true,
      barcode: true,
      salePrice: true,
      stock: true,
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

  return products
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

export async function getAdminWebOrders(status: string = 'ALL', page = 1, take = 20) {
  await requireAuth()

  const where = status === 'ALL' ? {} : { status: status as 'PENDING' | 'CONVERTED' | 'CANCELLED' }

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
  if (order.status !== 'PENDING') return { error: 'El pedido ya no está pendiente' }

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

    const result = await createSale({
      clientId,
      items,
      discount: 0,
      paymentMethod: 'CASH',
      initialPayment: order.total,
      initialPaymentMethod: 'CASH',
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

export async function cancelWebOrder(id: string) {
  await requireAuth()

  try {
    const result = await prisma.webOrder.updateMany({
      where: { id, status: 'PENDING' },
      data: { status: 'CANCELLED' },
    })
    if (result.count === 0) return { error: 'El pedido ya no está pendiente' }
  } catch (error) {
    return { error: parseError(error, 'No se pudo cancelar el pedido').message }
  }

  revalidatePath('/web/orders')
  revalidatePath('/web/orders/' + id)
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
