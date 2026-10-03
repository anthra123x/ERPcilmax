export class RateLimitError extends Error {
  constructor(
    public readonly retryAfterSeconds: number,
    public readonly limit: number = 0,
    public readonly remaining: number = 0,
    public readonly resetAtMs: number = 0,
  ) {
    super('Demasiadas solicitudes. Intenta nuevamente más tarde.')
    this.name = 'RateLimitError'
  }
}

export type RateLimitResult = {
  limit: number
  remaining: number
  resetAt: number
}

type RateLimiterOptions = {
  /** Máximo de solicitudes permitidas dentro de la ventana. */
  limit: number
  /** Duración de la ventana en milisegundos. */
  windowMs: number
  /** Capacidad máxima de claves en memoria para evitar saturación (DDoS). */
  maxEntries?: number
  /** Reloj inyectable para tests. */
  now?: () => number
}

type RateLimiter = {
  /** Lanza RateLimitError si la clave excede el límite de la ventana, o devuelve información del límite. */
  check: (key: string) => RateLimitResult
}

/**
 * Rate limiter en memoria con ventana fija y capacidad acotada.
 * Protegido contra sobrecarga de memoria mediante límite de entradas (LRU/FIFO)
 * y poda por intervalos para no penalizar el rendimiento de peticiones concurrentes.
 */
export function createRateLimiter(options: RateLimiterOptions): RateLimiter {
  const { limit, windowMs, maxEntries = 5000 } = options
  const now = options.now ?? (() => Date.now())
  const windowEntries = new Map<string, { count: number; resetAt: number }>()
  let lastPruneAt = 0

  function prune(nowMs: number) {
    // Podar solo cada 5s o cuando el mapa supere la capacidad máxima
    if (nowMs - lastPruneAt < 5000 && windowEntries.size < maxEntries) {
      return
    }
    lastPruneAt = nowMs

    for (const [key, entry] of windowEntries) {
      if (nowMs > entry.resetAt) windowEntries.delete(key)
    }

    // Si aún excede la capacidad máxima, descartar las claves más antiguas
    if (windowEntries.size > maxEntries) {
      const keysToDrop = windowEntries.size - maxEntries
      let dropped = 0
      for (const key of windowEntries.keys()) {
        windowEntries.delete(key)
        dropped++
        if (dropped >= keysToDrop) break
      }
    }
  }

  function check(key: string): RateLimitResult {
    const nowMs = now()
    prune(nowMs)

    const entry = windowEntries.get(key)
    if (!entry || nowMs > entry.resetAt) {
      const resetAt = nowMs + windowMs
      windowEntries.set(key, { count: 1, resetAt })
      return { limit, remaining: limit - 1, resetAt }
    }

    if (entry.count >= limit) {
      const retryAfterSeconds = Math.max(1, Math.ceil((entry.resetAt - nowMs) / 1000))
      throw new RateLimitError(retryAfterSeconds, limit, 0, entry.resetAt)
    }

    entry.count += 1
    const remaining = Math.max(0, limit - entry.count)
    return { limit, remaining, resetAt: entry.resetAt }
  }

  return { check }
}
