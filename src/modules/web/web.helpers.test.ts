import { describe, it, expect } from 'vitest'
import { computeStockStatus, computeWebReadiness, buildUniqueSlug } from './web.helpers'

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