import { NextRequest } from 'next/server'
import { getCatalogProducts } from '@/modules/web/web.service'
import { catalogCacheHeaders, enforceRateLimit, json } from '@/lib/api-utils'

export async function GET(request: NextRequest) {
  const limited = enforceRateLimit(request)
  if (limited) return limited

  const { searchParams } = request.nextUrl
  const limit = Number(searchParams.get('limit') ?? 36)
  const offset = Number(searchParams.get('offset') ?? 0)
  const category = searchParams.get('category')
  const search = searchParams.get('q')

  try {
    const products = await getCatalogProducts({
      limit: Number.isFinite(limit) ? limit : 36,
      offset: Number.isFinite(offset) ? offset : 0,
      categorySlug: category,
      search: search ?? undefined,
    })
    return json({ products }, { headers: catalogCacheHeaders })
  } catch (error) {
    console.error('GET /api/web/products', error)
    return json({ error: 'Error interno del servidor.' }, { status: 500 })
  }
}