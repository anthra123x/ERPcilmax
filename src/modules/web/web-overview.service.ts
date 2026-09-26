import { prisma } from '@/lib/prisma'
import { cancelExpiredWebOrders, getWebSettings } from './web.service'

/**
 * Datos del panel de la tienda online.
 *
 * Vive en el service (no en la action) para mantener la frontera de capas del
 * monolito modular: `*.actions.ts` = auth + validación + delegate;
 * `*.service.ts` = lógica de negocio y acceso a datos.
 */
export async function getWebOverviewStats() {
  // Fallback sin cron (útil en dev/local): expira pedidos PENDING vencidos una
  // vez por request. updateMany barato con índice en createdAt.
  await cancelExpiredWebOrders()

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

export type WebOverviewStats = Awaited<ReturnType<typeof getWebOverviewStats>>
