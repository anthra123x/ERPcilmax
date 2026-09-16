import { NextRequest } from 'next/server'
import { getCatalogProductByHandle } from '@/modules/web/web.service'
import { catalogCacheHeaders, enforceRateLimit, json } from '@/lib/api-utils'

export async function GET(request: NextRequest, { params }: { params: Promise<{ handle: string }> }) {
  const limited = enforceRateLimit(request)
  if (limited) return limited

  const { handle } = await params

  try {
    const product = await getCatalogProductByHandle(handle)
    if (!product) {
      return json({ error: 'Producto no encontrado' }, { status: 404 })
    }
    return json({ product }, { headers: catalogCacheHeaders })
  } catch (error) {
    console.error(`GET /api/web/products/${handle}`, error)
    return json({ error: 'Error interno del servidor.' }, { status: 500 })
  }
}