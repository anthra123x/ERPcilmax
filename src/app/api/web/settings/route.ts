import { NextRequest } from 'next/server'
import { getWebSettings } from '@/modules/web/web.service'
import { catalogCacheHeaders, enforceRateLimit, handleApiError, json } from '@/lib/api-utils'

export async function GET(request: NextRequest) {
  const limited = enforceRateLimit(request)
  if (limited) return limited

  try {
    const settings = await getWebSettings()
    return json({ settings }, { headers: catalogCacheHeaders })
  } catch (error) {
    return handleApiError(error, 'GET /api/web/settings')
  }
}
