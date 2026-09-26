import { NextRequest } from 'next/server'
import { createProductReview, getProductReviews } from '@/modules/web/web.service'
import { enforceRateLimit, handleApiError, json, readJsonBody } from '@/lib/api-utils'
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
    return handleApiError(error, 'GET /api/web/reviews')
  }
}

export async function POST(request: NextRequest) {
  const limited = enforceRateLimit(request, true)
  if (limited) return limited

  const read = await readJsonBody(request)
  if (!read.ok) return read.response

  // Honeypot anti-spam: un bot rellena el campo oculto "website".
  const body = read.body
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
    return handleApiError(error, 'POST /api/web/reviews')
  }
}