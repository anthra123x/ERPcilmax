import { NextRequest } from 'next/server'
import { getCatalogProducts } from '@/modules/web/web.service'
import { catalogCacheHeaders, enforceRateLimit, handleApiError, json, parsePagination } from '@/lib/api-utils'

const MAX_SEARCH_LENGTH = 120

export async function GET(request: NextRequest) {
  const limited = enforceRateLimit(request)
  if (limited) return limited

  const { searchParams } = request.nextUrl
  const pagination = parsePagination(searchParams)
  if (!pagination.ok) return json({ error: pagination.error }, { status: 400 })

  const category = searchParams.get('category')?.trim() || undefined
  const search = (searchParams.get('q') ?? '').trim().slice(0, MAX_SEARCH_LENGTH) || undefined

  try {
    const products = await getCatalogProducts({
      limit: pagination.limit,
      offset: pagination.offset,
      categorySlug: category,
      search,
    })
    return json({ products }, { headers: catalogCacheHeaders })
  } catch (error) {
    return handleApiError(error, 'GET /api/web/products')
  }
}