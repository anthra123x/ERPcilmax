import { toSlug } from '@/lib/slugify'

/**
 * Helpers puros del módulo Tienda online (sin I/O), reutilizados por el panel y
 * las acciones. Testeables de forma unitaria.
 */

export type WebStockStatus = 'OK' | 'LOW' | 'OUT'

export interface WebReadiness {
  hasSlug: boolean
  hasMedia: boolean
  hasDescription: boolean
  ready: boolean
}

export interface WebReadinessInput {
  slug: string | null
  description: string | null
  mediaCount: number
  hasImageUrl: boolean
}

/** Estado de stock de un producto según su propio umbral. */
export function computeStockStatus(stock: number, lowStockThreshold: number): WebStockStatus {
  if (stock <= 0) return 'OUT'
  if (stock <= lowStockThreshold) return 'LOW'
  return 'OK'
}

/**
 * ¿Está el producto "listo" para publicarse en la tienda?
 * Requiere slug y al menos una imagen (media o `imageUrl` legacy).
 * No exige stock a propósito: publicar agotado está permitido, se avisa en UI.
 */
export function computeWebReadiness(input: WebReadinessInput): WebReadiness {
  const hasSlug = Boolean(input.slug?.trim())
  const hasMedia = input.mediaCount > 0 || input.hasImageUrl
  const hasDescription = Boolean(input.description?.trim())
  return {
    hasSlug,
    hasMedia,
    hasDescription,
    ready: hasSlug && hasMedia,
  }
}

/**
 * Genera un slug único a partir de un nombre, probando sufijos numéricos hasta
 * encontrar uno libre (vía el callback `exists`). Útil al publicar productos
 * que nunca tuvieron slug.
 */
export async function buildUniqueSlug(
  base: string,
  exists: (candidate: string) => Promise<boolean>,
  maxAttempts = 100,
): Promise<string> {
  const slug = toSlug(base) || `producto-${Date.now()}`
  if (!(await exists(slug))) return slug
  for (let attempt = 2; attempt <= maxAttempts; attempt++) {
    const candidate = `${slug}-${attempt}`
    if (!(await exists(candidate))) return candidate
  }
  return `${slug}-${Date.now()}`
}

/** Fila serializable del listado admin de /web/products. */
export interface AdminWebProductRow {
  id: string
  name: string
  barcode: string | null
  salePrice: number
  stock: number
  lowStockThreshold: number
  slug: string | null
  webVisible: boolean
  webFeatured: boolean
  webSortOrder: number
  webDescription: string | null
  imageUrl: string | null
  category: { id: string; name: string; slug: string | null } | null
  media: { id: string; url: string }[]
  reviewCount: number
  readiness: WebReadiness
  stockStatus: WebStockStatus
}