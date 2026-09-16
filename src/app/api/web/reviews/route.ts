import { NextRequest } from 'next/server'
import { createProductReview, getProductReviews } from '@/modules/web/web.service'
import { enforceRateLimit, json } from '@/lib/api-utils'
import { CreateProductReviewSchema } from '@/lib/validations'
import { getZodErrorMessage } from '@/lib/zod-error'

export async function GET(request: NextRequest) {
  const limited = enforceRateLimit(request)
  if (limited) return limited

  const productId = request.nextUrl.searchParams.get('productId')?.trim() ?? ''
  if (!productId) return json({ error: 'Falta el parámetro productId' }, { status: 400 })

  try {
    const reviews = await getProductReviews(productId)
    return json({ reviews })
  } catch (error) {
    console.error('GET /api/web/reviews', error)
    return json({ error: 'Error interno del servidor.' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const limited = enforceRateLimit(request, true)
  if (limited) return limited

  const body = await request.json().catch(() => null)

  // Honeypot anti-spam: un bot rellena el campo oculto "website".
  if (body && typeof body === 'object' && (body as { website?: unknown }).website) {
    return json({ ok: true })
  }

  const parsed = CreateProductReviewSchema.safeParse(body)
  if (!parsed.success) {
    return json({ error: getZodErrorMessage(parsed) }, { status: 400 })
  }

  try {
    const review = await createProductReview(parsed.data)
    return json({ ok: true, review })
  } catch (error) {
    if (error instanceof Error && error.message === 'Producto inválido') {
      return json({ error: 'Producto inválido.' }, { status: 400 })
    }
    console.error('POST /api/web/reviews', error)
    return json({ error: 'No se pudo enviar la reseña. Intenta de nuevo.' }, { status: 500 })
  }
}