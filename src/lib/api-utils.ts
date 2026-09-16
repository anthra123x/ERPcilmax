import { NextResponse, type NextRequest } from 'next/server'
import { createRateLimiter, RateLimitError } from './rate-limit'

/** Respuesta JSON con NextResponse. */
export function json(data: unknown, init?: ResponseInit): NextResponse {
  return NextResponse.json(data, init)
}

/** Headers de caché para lecturas del catálogo (CDN Vercel + revalidación). */
export const catalogCacheHeaders = {
  'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
}

const DEFAULT_LIMITER = createRateLimiter({ limit: 120, windowMs: 60_000 })
const WRITE_LIMITER = createRateLimiter({ limit: 15, windowMs: 60_000 })

/** IP del cliente respetando proxies (Vercel envía x-forwarded-for). */
export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return request.headers.get('x-real-ip') ?? 'unknown'
}

/**
 * Aplica rate-limit por IP. Devuelve una respuesta 429 si la clave excede el
 * límite, o null para que el handler continúe.
 */
export function enforceRateLimit(request: NextRequest, write = false): NextResponse | null {
  const limiter = write ? WRITE_LIMITER : DEFAULT_LIMITER
  try {
    limiter.check(getClientIp(request))
    return null
  } catch (error) {
    if (error instanceof RateLimitError) {
      return json(
        { error: error.message },
        { status: 429, headers: { 'Retry-After': String(error.retryAfterSeconds) } },
      )
    }
    throw error
  }
}