import { describe, it, expect } from 'vitest'
import { toSlug } from './slugify'

describe('toSlug', () => {
  it('lowercases and replaces spaces', () => {
    expect(toSlug('Combo Olla')).toBe('combo-olla')
  })

  it('strips accents', () => {
    expect(toSlug('Hidrolavadora kárcher')).toBe('hidrolavadora-karcher')
  })

  it('handles mixed punctuation', () => {
    expect(toSlug("Caja fuerte '1200'")).toBe('caja-fuerte-1200')
  })

  it('trims leading and trailing dashes', () => {
    expect(toSlug(' --Bolso viajero-- ')).toBe('bolso-viajero')
  })

  it('caps the length and never leaves a trailing dash', () => {
    const slug = toSlug('a '.repeat(100), 80)
    expect(slug.length).toBeLessThanOrEqual(80)
    expect(slug.endsWith('-')).toBe(false)
  })
})