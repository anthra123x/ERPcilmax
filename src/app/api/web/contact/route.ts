import { NextRequest } from 'next/server'
import { createContactMessage } from '@/modules/web/web.service'
import { enforceRateLimit, handleApiError, json, readJsonBody } from '@/lib/api-utils'
import { CreateContactMessageSchema } from '@/lib/validations'
import { getZodErrorMessage } from '@/lib/zod-error'

export async function POST(request: NextRequest) {
  const limited = enforceRateLimit(request, true)
  if (limited) return limited

  const read = await readJsonBody(request)
  if (!read.ok) return read.response

  // Honeypot anti-spam.
  const body = read.body
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
    return handleApiError(error, 'POST /api/web/contact')
  }
}