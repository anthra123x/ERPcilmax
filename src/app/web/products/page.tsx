import Link from 'next/link'
import { Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { PageHeader } from '@/components/ui/page-header'
import { getAdminWebProducts, getWebCategoryOptions } from '@/modules/web/web.actions'
import { WebProductFilters } from '@/components/web/web-product-filters'
import { WebProductCatalog } from '@/components/web/web-product-catalog'

export const dynamic = 'force-dynamic'

const STATUS_VALUES = ['ALL', 'VISIBLE', 'HIDDEN', 'FEATURED'] as const
const STOCK_VALUES = ['ALL', 'OK', 'LOW', 'OUT'] as const

function stringParam(sp: Record<string, string | string[] | undefined>, key: string): string {
  const value = sp[key]
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '')
}

function statCard(label: string, value: string | number, className?: string) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-2xl font-bold ${className ?? ''}`}>{value}</p>
      </CardContent>
    </Card>
  )
}

interface WebProductsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function WebProductsPage({ searchParams }: WebProductsPageProps) {
  const sp = await searchParams
  const search = stringParam(sp, 'search')
  const categoryId = stringParam(sp, 'categoria')
  const estado = stringParam(sp, 'estado')
  const stockParam = stringParam(sp, 'stock')

  const status = (STATUS_VALUES as readonly string[]).includes(estado)
    ? (estado as (typeof STATUS_VALUES)[number])
    : 'ALL'
  const stock = (STOCK_VALUES as readonly string[]).includes(stockParam)
    ? (stockParam as (typeof STOCK_VALUES)[number])
    : 'ALL'

  const [products, categories] = await Promise.all([
    getAdminWebProducts({ search, categoryId, status, stock }),
    getWebCategoryOptions(),
  ])

  const published = products.filter((p) => p.webVisible).length
  const featured = products.filter((p) => p.webFeatured).length
  const outOfStock = products.filter((p) => p.stockStatus === 'OUT').length
  const ready = products.filter((p) => p.readiness.ready && !p.webVisible).length

  const hasFilters = Boolean(search || categoryId || status !== 'ALL' || stock !== 'ALL')

  return (
    <div className="page-container py-6 space-y-6">
      <PageHeader
        title="Productos web"
        description="Selecciona, publica y ordena los productos de tu inventario que verán tus clientes en la tienda"
        actions={
          <Link href="/inventory">
            <Button variant="outline">
              <Package className="h-4 w-4" /> Ir a inventario
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statCard('Productos en la lista', products.length)}
        {statCard('Publicados', published, 'text-emerald-600')}
        {statCard('Destacados', featured, 'text-amber-600')}
        {statCard('Agotados', outOfStock, 'text-red-600')}
      </div>

      <Card>
        <CardContent className="space-y-4 p-4">
          <WebProductFilters
            search={search}
            categoryId={categoryId}
            status={status}
            stock={stock}
            categories={categories}
          />
          {ready > 0 && (
            <p className="text-xs text-muted-foreground">
              {ready} {ready === 1 ? 'producto listo' : 'productos listos'} para publicar en la tienda.
            </p>
          )}
          <WebProductCatalog products={products} hasFilters={hasFilters} />
        </CardContent>
      </Card>
    </div>
  )
}