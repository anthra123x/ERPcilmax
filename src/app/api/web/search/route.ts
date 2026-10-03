import { NextRequest } from 'next/server'
import { getCatalogProducts } from '@/modules/web/web.service'
import { catalogCacheHeaders, enforceRateLimit, handleApiError, json } from '@/lib/api-utils'

const MAX_SEARCH_LENGTH = 100

export async function GET(request: NextRequest) {
  const limited = enforceRateLimit(request)
  if (limited) return limited

  const query = (request.nextUrl.searchParams.get('q') ?? '').trim().slice(0, MAX_SEARCH_LENGTH)
  const rawLimit = Number(request.nextUrl.searchParams.get('limit') ?? 8)
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 50) : 8

  if (!query) return json({ products: [] }, { headers: catalogCacheHeaders })

  try {
    const products = await getCatalogProducts({
      search: query,
      limit,
    })
    return json({ products }, { headers: catalogCacheHeaders })
  } catch (error) {
    return handleApiError(error, 'GET /api/web/search')
  }
}
