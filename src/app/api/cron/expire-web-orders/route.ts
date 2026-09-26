import { NextRequest } from 'next/server'
import { json } from '@/lib/api-utils'
import { cancelExpiredWebOrders } from '@/modules/web/web.service'
import { timingSafeEqual } from 'node:crypto'

/**
 * Cron de Vercel (ver vercel.json): expira pedidos web PENDING vencidos.
 *
 * Protegido con `CRON_SECRET` (Bearer token). Si la variable no está definida
 * responde 404 silencioso para no exponer el endpoint.
 *
 * La comparación usa `timingSafeEqual` para evitar timing attacks.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) return json({ error: 'Not found' }, { status: 404 })

  const auth = request.headers.get('authorization')
  const expected = `Bearer ${secret}`
  if (
    !auth ||
    auth.length !== expected.length ||
    !timingSafeEqual(Buffer.from(auth), Buffer.from(expected))
  ) {
    return json({ error: 'No autorizado' }, { status: 401 })
  }

  const { count } = await cancelExpiredWebOrders()
  return json({ ok: true, count })
}