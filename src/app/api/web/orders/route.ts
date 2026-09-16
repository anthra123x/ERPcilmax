import { NextRequest } from 'next/server'
import { createWebOrder } from '@/modules/web/web.service'
import { enforceRateLimit, json } from '@/lib/api-utils'
import { CreateWebOrderSchema } from '@/lib/validations'
import { getZodErrorMessage } from '@/lib/zod-error'

export async function POST(request: NextRequest) {
  const limited = enforceRateLimit(request, true)
  if (limited) return limited

  const body = await request.json().catch(() => null)

  const parsed = CreateWebOrderSchema.safeParse(body)
  if (!parsed.success) {
    return json({ error: getZodErrorMessage(parsed) }, { status: 400 })
  }

  try {
    const order = await createWebOrder(parsed.data)
    return json({ ok: true, order })
  } catch (error) {
    if (error instanceof Error && /ya no está disponible/i.test(error.message)) {
      return json({ error: 'Uno de los productos ya no está disponible.' }, { status: 400 })
    }
    console.error('POST /api/web/orders', error)
    return json({ error: 'No se pudo registrar el pedido. Intenta de nuevo.' }, { status: 500 })
  }
}