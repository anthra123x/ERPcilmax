import { NextRequest } from 'next/server'
import { createWebOrder } from '@/modules/web/web.service'
import { enforceRateLimit, handleApiError, json, readJsonBody } from '@/lib/api-utils'
import { CreateWebOrderSchema } from '@/lib/validations'
import { getZodErrorMessage } from '@/lib/zod-error'

export async function POST(request: NextRequest) {
  const limited = enforceRateLimit(request, true)
  if (limited) return limited

  const read = await readJsonBody(request)
  if (!read.ok) return read.response

  const parsed = CreateWebOrderSchema.safeParse(read.body)
  if (!parsed.success) {
    return json({ error: getZodErrorMessage(parsed) }, { status: 400 })
  }

  try {
    const order = await createWebOrder(parsed.data)
    return json({ ok: true, order })
  } catch (error) {
    return handleApiError(error, 'POST /api/web/orders')
  }
}