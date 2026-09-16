export class RateLimitError extends Error {
  constructor(public readonly retryAfterSeconds: number) {
    super('Demasiadas solicitudes. Intenta nuevamente más tarde.')
    this.name = 'RateLimitError'
  }
}

type RateLimiterOptions = {
  /** Máximo de solicitudes permitidas dentro de la ventana. */
  limit: number
  /** Duración de la ventana en milisegundos. */
  windowMs: number
  /** Reloj inyectable para tests. */
  now?: () => number
}

type RateLimiter = {
  /** Lanza RateLimitError si la clave excede el límite de la ventana. */
  check: (key: string) => void
}

/**
 * Rate limiter en memoria con ventana fija. Suficiente para proteger las
 * rutas públicas del storefront (escrituras y lecturas pesadas). Se reinicia
 * con cada reinicio del proceso; en Vercel cada instancia lleva su propio
 * contador, lo que reduce la precisión pero mantiene la disuasión.
 */
export function createRateLimiter(options: RateLimiterOptions): RateLimiter {
  const { limit, windowMs } = options
  const now = options.now ?? (() => Date.now())
  const windowEntries = new Map<string, { count: number; resetAt: number }>()

  function prune(nowMs: number) {
    for (const [key, entry] of windowEntries) {
      if (nowMs > entry.resetAt) windowEntries.delete(key)
    }
  }

  function check(key: string) {
    const nowMs = now()
    prune(nowMs)

    const entry = windowEntries.get(key)
    if (!entry || nowMs > entry.resetAt) {
      windowEntries.set(key, { count: 1, resetAt: nowMs + windowMs })
      return
    }

    if (entry.count >= limit) {
      const retryAfterSeconds = Math.max(1, Math.ceil((entry.resetAt - nowMs) / 1000))
      throw new RateLimitError(retryAfterSeconds)
    }

    entry.count += 1
  }

  return { check }
}