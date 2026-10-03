import * as Sentry from '@sentry/nextjs'
import { NextResponse, type NextRequest } from 'next/server'
import { createRateLimiter, RateLimitError } from './rate-limit'
import { AppError, handlePrismaError } from './errors'

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
const PDF_LIMITER = createRateLimiter({ limit: 30, windowMs: 60_000 })

const IPV4_RE = /^(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/
const IPV6_RE = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/

/** Valida que un valor sea una dirección IPv4 o IPv6 (regex simple). */
export function isValidIp(value: string): boolean {
  return IPV4_RE.test(value) || IPV6_RE.test(value)
}

/** IP del cliente respetando proxies (Vercel envía x-forwarded-for). */
export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim()
    if (first && isValidIp(first)) return first
  }
  const realIp = request.headers.get('x-real-ip')?.trim()
  if (realIp && isValidIp(realIp)) return realIp
  return 'unknown'
}

export const DEFAULT_LIMIT = 36
export const MAX_LIMIT = 100
export const MAX_OFFSET = 10_000

export type PaginationParams = { ok: true; limit: number; offset: number } | { ok: false; error: string }

/**
 * Normaliza y clampa los parámetros de paginación del catálogo web:
 * - `limit` inválido (NaN, 0 o negativo) → error 400 (no se acepta).
 * - `limit` válido → clamp a [1, MAX_LIMIT].
 * - `offset` inválido → 0; válido → clamp a [0, MAX_OFFSET].
 */
export function parsePagination(searchParams: URLSearchParams): PaginationParams {
  const rawLimit = searchParams.get('limit')
  let limit = DEFAULT_LIMIT
  if (rawLimit !== null) {
    const parsed = Number(rawLimit)
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return { ok: false, error: 'El parámetro limit debe ser un número mayor a 0' }
    }
    limit = Math.min(MAX_LIMIT, Math.floor(parsed))
  }

  const rawOffset = searchParams.get('offset')
  let offset = 0
  if (rawOffset !== null) {
    const parsed = Number(rawOffset)
    if (Number.isFinite(parsed) && parsed > 0) {
      offset = Math.min(MAX_OFFSET, Math.floor(parsed))
    }
  }

  return { ok: true, limit, offset }
}

export type ReadJsonResult = { ok: true; body: unknown } | { ok: false; response: NextResponse }

export const DEFAULT_MAX_BODY_SIZE = 64 * 1024 // 64 KB

/**
 * Lee el body JSON de una API pública verificando Content-Type y tamaño máximo del payload.
 * Devuelve 415 si no es `application/json`, 413 si excede el tamaño máximo permitido,
 * y 400 si el JSON es inválido.
 */
export async function readJsonBody(
  request: NextRequest,
  maxSizeBytes = DEFAULT_MAX_BODY_SIZE,
): Promise<ReadJsonResult> {
  const contentType = request.headers.get('content-type') ?? ''
  if (!contentType.toLowerCase().includes('application/json')) {
    return { ok: false, response: json({ error: 'Content-Type inválido' }, { status: 415 }) }
  }

  // Pre-validación mediante Content-Length si está presente
  const contentLength = request.headers.get('content-length')
  if (contentLength && Number(contentLength) > maxSizeBytes) {
    return { ok: false, response: json({ error: 'Payload demasiado grande' }, { status: 413 }) }
  }

  try {
    const rawText = await request.text()
    if (new TextEncoder().encode(rawText).length > maxSizeBytes) {
      return { ok: false, response: json({ error: 'Payload demasiado grande' }, { status: 413 }) }
    }
    const body = JSON.parse(rawText)
    return { ok: true, body }
  } catch {
    return { ok: false, response: json({ error: 'Body JSON inválido' }, { status: 400 }) }
  }
}

/**
 * Error handler centralizado para API routes: mapea AppError (status propio),
 * errores Prisma conocidos y errores inesperados (500 genérico + Sentry).
 */
export function handleApiError(error: unknown, context: string): NextResponse {
  if (error instanceof AppError) {
    return json({ error: error.message }, { status: error.status })
  }
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const appError = handlePrismaError(error as { code?: string; message?: string })
    return json({ error: appError.message }, { status: appError.status })
  }
  console.error(context, error)
  Sentry.captureException(error, { tags: { context } })
  return json({ error: 'Error interno del servidor.' }, { status: 500 })
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
      const resetUnixSeconds = error.resetAtMs
        ? Math.ceil(error.resetAtMs / 1000)
        : Math.ceil((Date.now() + 60_000) / 1000)
      return json(
        { error: error.message },
        {
          status: 429,
          headers: {
            'Retry-After': String(error.retryAfterSeconds),
            'X-RateLimit-Limit': String(error.limit || (write ? 15 : 120)),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(resetUnixSeconds),
          },
        },
      )
    }
    throw error
  }
}

/**
 * Rate limit específico para generación pesada de PDFs (30 req/min).
 */
export function enforcePdfRateLimit(request: NextRequest): NextResponse | null {
  try {
    PDF_LIMITER.check(getClientIp(request))
    return null
  } catch (error) {
    if (error instanceof RateLimitError) {
      return json(
        { error: 'Demasiadas solicitudes de PDF. Espera un momento.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(error.retryAfterSeconds),
            'X-RateLimit-Limit': String(error.limit || 30),
            'X-RateLimit-Remaining': '0',
          },
        },
      )
    }
    throw error
  }
}
