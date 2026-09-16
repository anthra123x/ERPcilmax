import { NextRequest } from 'next/server'
import { getCatalogCategories } from '@/modules/web/web.service'
import { catalogCacheHeaders, enforceRateLimit, json } from '@/lib/api-utils'

export async function GET(request: NextRequest) {
  const limited = enforceRateLimit(request)
  if (limited) return limited

  try {
    const categories = await getCatalogCategories()
    return json({ categories }, { headers: catalogCacheHeaders })
  } catch (error) {
    console.error('GET /api/web/categories', error)
    return json({ error: 'Error interno del servidor.' }, { status: 500 })
  }
}