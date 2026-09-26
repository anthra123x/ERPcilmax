import * as Sentry from '@sentry/nextjs'
import { AppError, handlePrismaError } from './errors'

/**
 * Tipo de retorno de `safeServerAction`: replica la inferencia normalizada de
 * TypeScript sobre literales de objeto (`{ error }` → `{ success?, sale? }`
 * como opcionales `undefined`), de modo que los call-sites puedan acceder a
 * `result.error` / `result.success` / `result.sale` sin narrowing explícito,
 * igual que con el patrón try/catch original.
 */
export type ServerActionResult<T> = (T & { error?: undefined }) | ({ error: string } & { [K in keyof T]?: undefined })

/**
 * Envuelve el patrón repetido de las acciones de servidor:
 *
 *   try { ... } catch { return { error: parseError(error).message } }
 *
 * con mensajes SEGUROS (sin filtrar `error.message` crudo de errores no
 * controlados):
 *
 * - `AppError` → usa su `message` (son errores intencionales del dominio).
 * - Error Prisma (P2002/P2025/P2003/...) → `handlePrismaError`.
 * - Cualquier otra cosa → `userMessage` genérico + `Sentry.captureException`.
 */
export function isPrismaError(error: unknown): error is { code?: string; message?: string } {
  return typeof error === 'object' && error !== null && 'code' in error
}

export async function safeServerAction<T>(
  fn: () => Promise<T>,
  userMessage = 'Error inesperado',
): Promise<ServerActionResult<T>> {
  try {
    // `await fn()` tipa como Awaited<T>; la asignación a ServerActionResult<T>
    // requiere el cast porque T es genérico (TS no puede probar la relación).
    return (await fn()) as unknown as ServerActionResult<T>
  } catch (error) {
    if (error instanceof AppError) {
      return { error: error.message }
    }
    if (isPrismaError(error)) {
      return { error: handlePrismaError(error).message }
    }
    Sentry.captureException(error, { tags: { context: 'server-action' } })
    return { error: userMessage }
  }
}