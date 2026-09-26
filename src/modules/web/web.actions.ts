'use server'

/**
 * web.actions.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Barrel de re-exportaciones para compatibilidad con imports existentes.
 *
 * La lógica fue dividida en archivos especializados:
 *   - web-overview.actions.ts   → resumen del panel
 *   - web-products.actions.ts   → visibilidad, slug, orden, imágenes
 *   - web-orders.actions.ts     → pedidos web → venta POS
 *   - web-content.actions.ts    → mensajes, reseñas, settings de la tienda
 * ─────────────────────────────────────────────────────────────────────────────
 */

export { getWebOverview } from './web-overview.actions'

export type { AdminWebProductFilters } from './web-products.actions'
export {
  getAdminWebProducts,
  getWebCategoryOptions,
  getProductWebStatus,
  setWebProductVisible,
  setWebProductFeatured,
  bulkUpdateWebProducts,
  moveWebProduct,
  getAdminWebProductById,
  updateWebProduct,
  addWebMedia,
  removeWebMedia,
} from './web-products.actions'

export {
  getAdminWebOrders,
  getAdminWebOrderById,
  convertWebOrderToSale,
  confirmWebOrder,
  cancelWebOrder,
  cancelExpiredWebOrders,
} from './web-orders.actions'

export {
  getAdminWebMessages,
  setWebMessageRead,
  deleteWebMessage,
  getAdminWebReviews,
  setWebReviewApproved,
  deleteWebReview,
  getAdminWebSettings,
  updateWebSettings,
} from './web-content.actions'
