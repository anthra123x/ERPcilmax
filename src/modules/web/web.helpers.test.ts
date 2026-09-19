import { describe, it, expect } from 'vitest'
import {
  computeStockStatus,
  computeWebReadiness,
  buildUniqueSlug,
  buildWhatsAppOrderMessage,
  buildWhatsAppHref,
} from './web.helpers'
import { formatCurrency } from '@/lib/format'
import type { WhatsAppOrderMessageInput } from './web.helpers'

describe('computeStockStatus', () => {
  it('returns OUT when stock is 0 or negative', () => {
    expect(computeStockStatus(0, 5)).toBe('OUT')
    expect(computeStockStatus(-3, 5)).toBe('OUT')
  })

  it('returns LOW when stock is at or below the per-product threshold', () => {
    expect(computeStockStatus(5, 5)).toBe('LOW')
    expect(computeStockStatus(1, 5)).toBe('LOW')
  })

  it('returns OK above the threshold', () => {
    expect(computeStockStatus(6, 5)).toBe('OK')
    expect(computeStockStatus(100, 0)).toBe('OK')
  })
})

describe('computeWebReadiness', () => {
  const base = { slug: 'olla', mediaCount: 1, hasImageUrl: false, description: 'x' }

  it('is ready when it has slug and media', () => {
    expect(computeWebReadiness(base)).toEqual({
      hasSlug: true,
      hasMedia: true,
      hasDescription: true,
      ready: true,
    })
  })

  it('is not ready without a slug', () => {
    const r = computeWebReadiness({ ...base, slug: '' })
    expect(r.hasSlug).toBe(false)
    expect(r.ready).toBe(false)
  })

  it('is not ready without media', () => {
    const r = computeWebReadiness({ ...base, mediaCount: 0, hasImageUrl: false })
    expect(r.hasMedia).toBe(false)
    expect(r.ready).toBe(false)
  })

  it('counts a legacy imageUrl as media', () => {
    const r = computeWebReadiness({ ...base, mediaCount: 0, hasImageUrl: true })
    expect(r.hasMedia).toBe(true)
    expect(r.ready).toBe(true)
  })
})

describe('buildUniqueSlug', () => {
  it('returns the base slug when it is free', async () => {
    const slug = await buildUniqueSlug('Ollas de Presión', async () => false)
    expect(slug).toBe('ollas-de-presion')
  })

  it('appends a numeric suffix until a candidate is free', async () => {
    const taken = new Set(['olla', 'olla-2'])
    const slug = await buildUniqueSlug('Olla', async (c) => taken.has(c))
    expect(slug).toBe('olla-3')
  })

  it('falls back to a timestamp when suffix attempts are exhausted', async () => {
    const slug = await buildUniqueSlug('Olla', async () => true, 3)
    expect(slug).toMatch(/^olla-/)
  })

  it('returns a fallback when the name produces an empty slug', async () => {
    const slug = await buildUniqueSlug('###', async () => false)
    expect(slug).toMatch(/^producto-/)
  })
})

describe('buildWhatsAppOrderMessage', () => {
  const base: WhatsAppOrderMessageInput = {
    storeName: 'Cilmax',
    customerName: 'Ana',
    reference: 'ORD-1042',
    status: 'PENDING',
    items: [
      { productName: 'Olla', quantity: 2 },
      { productName: 'Juego de cubiertos', quantity: 1 },
    ],
    total: 579700,
  }

  it('includes reference, items and total', () => {
    const message = buildWhatsAppOrderMessage(base)
    expect(message).toContain('ORD-1042')
    expect(message).toContain('Olla ×2')
    expect(message).toContain('Juego de cubiertos ×1')
    expect(message).toContain(formatCurrency(579700))
    expect(message).toContain('Cilmax')
  })

  it('adapts the note for a pending order', () => {
    const message = buildWhatsAppOrderMessage({ ...base, status: 'PENDING' })
    expect(message).toContain('confirmando disponibilidad')
  })

  it('adapts the note for a confirmed order', () => {
    const message = buildWhatsAppOrderMessage({ ...base, status: 'CONFIRMED' })
    expect(message).toContain('confirmado')
    expect(message).toContain('apartados')
  })
})

describe('buildWhatsAppHref', () => {
  it('builds a wa.me link with the encoded message', () => {
    const href = buildWhatsAppHref('+57 300 123 45 67', 'Hola')
    expect(href).toBe('https://wa.me/573001234567?text=Hola')
  })

  it('returns an empty string when the phone has no digits', () => {
    expect(buildWhatsAppHref('', 'Hola')).toBe('')
    expect(buildWhatsAppHref('abc', 'Hola')).toBe('')
  })
})