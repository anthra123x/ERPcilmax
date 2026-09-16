/**
 * Contrato de la API pública del storefront (/api/web/*).
 *
 * El ERP NO tiene variantes: cada producto visible en la web se expone como un
 * único artículo (variante "Único"). `amount` es el precio de venta en pesos
 * colombianos enteros (la moneda de negocio de Cilmax, 0 decimales).
 */

export interface WebVariant {
  id: string
  title: string
  sku: string | null
  amount: number
  currencyCode: string
  inventoryQuantity: number
}

export interface WebImage {
  url: string
}

export interface WebRating {
  avg: number
  count: number
}

export interface WebProduct {
  id: string
  title: string
  handle: string
  description: string
  thumbnail: string | null
  images: WebImage[]
  variants: WebVariant[]
  collectionTitle: string | null
  currencyCode: string
  featured: boolean
  categorySlug: string | null
  rating: WebRating | null
}

export interface WebCategory {
  id: string
  name: string
  slug: string | null
  color: string | null
}

export interface WebProductReview {
  id: string
  productId: string
  name: string
  email: string | null
  rating: number
  comment: string
  createdAt: string
}

export interface WebReviewInput {
  productId: string
  name: string
  email?: string | null
  rating: number
  comment: string
}

export interface WebContactInput {
  name: string
  phone?: string | null
  email?: string | null
  message: string
}

export interface WebOrderItemInput {
  productId: string
  quantity: number
}

export interface WebOrderInput {
  customerName: string
  customerPhone: string
  customerEmail?: string | null
  notes?: string | null
  items: WebOrderItemInput[]
}

export interface StoreThemeSettings {
  primaryColor: string
  goldColor: string
}

export interface WebSettings {
  storeName: string
  whatsapp: string | null
  email: string | null
  shippingInfo: string | null
  theme: StoreThemeSettings
}

export const DEFAULT_WEB_SETTINGS: WebSettings = {
  storeName: 'Cilmax',
  whatsapp: null,
  email: null,
  shippingInfo: null,
  theme: {
    primaryColor: '#008a93',
    goldColor: '#d4af37',
  },
}