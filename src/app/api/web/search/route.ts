import { NextRequest } from 'next/server'
import { getCatalogProducts } from '@/modules/web/web.service'
import { catalogCacheHeaders, enforceRateLimit, json } from '@/lib/api-utils'

export async function GET(request: NextRequest) {
  const limited = enforceRateLimit(request)
  if (limited) return limited

  const query = request.nextUrl.searchParams.get('q')?.trim() ?? ''
  const limit = Number(request.nextUrl.searchParams.get('limit') ?? 8)

  if (!query) return json({ products: [] }, { headers: catalogCacheHeaders })

  try {
    const products = await getCatalogProducts({
      search: query,
      limit: Number.isFinite(limit) ? limit : 8,
    })
    return json({ products }, { headers: catalogCacheHeaders })
  } catch (error) {
    console.error('GET /api/web/search', error)
    return json({ error: 'Error interno del servidor.' }, { status: 500 })
  }
}