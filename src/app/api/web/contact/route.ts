import { NextRequest } from 'next/server'
import { createContactMessage } from '@/modules/web/web.service'
import { enforceRateLimit, json } from '@/lib/api-utils'
import { CreateContactMessageSchema } from '@/lib/validations'
import { getZodErrorMessage } from '@/lib/zod-error'

export async function POST(request: NextRequest) {
  const limited = enforceRateLimit(request, true)
  if (limited) return limited

  const body = await request.json().catch(() => null)

  // Honeypot anti-spam.
  if (body && typeof body === 'object' && (body as { website?: unknown }).website) {
    return json({ ok: true })
  }

  const parsed = CreateContactMessageSchema.safeParse(body)
  if (!parsed.success) {
    return json({ error: getZodErrorMessage(parsed) }, { status: 400 })
  }

  try {
    await createContactMessage(parsed.data)
    return json({ ok: true })
  } catch (error) {
    console.error('POST /api/web/contact', error)
    return json({ error: 'No se pudo enviar el mensaje. Intenta de nuevo.' }, { status: 500 })
  }
}