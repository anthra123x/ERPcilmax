import Link from 'next/link'
import { Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/ui/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { formatCurrency } from '@/lib/format'
import { getAdminWebProducts } from '@/modules/web/web.actions'
import { WebProductToggle } from '@/components/web/web-product-toggle'

export const dynamic = 'force-dynamic'

export default async function WebProductsPage() {
  const products = await getAdminWebProducts()

  return (
    <div className="page-container py-6 space-y-6">
      <PageHeader
        title="Productos web"
        description="Marca qué productos se muestran en la tienda, su orden y los destacados"
      />

      <Card>
        <CardContent className="p-4">
          {products.length === 0 ? (
            <EmptyState title="Sin productos" description="Agrega productos a inventario para publicarlos en la web." />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Precio</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Orden</TableHead>
                    <TableHead>Visible</TableHead>
                    <TableHead>Destacado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md border">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={p.media[0]?.url || p.imageUrl!} alt="" className="h-full w-full object-cover" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{p.name}</p>
                            <p className="truncate font-mono text-xs text-muted-foreground">
                              {p.slug ? `/${p.slug}` : 'sin slug'}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{p.category?.name || '—'}</TableCell>
                      <TableCell>{formatCurrency(p.salePrice)}</TableCell>
                      <TableCell>{p.stock}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{p.webSortOrder}</Badge>
                      </TableCell>
                      <TableCell>
                        <WebProductToggle product={p} field="webVisible" />
                      </TableCell>
                      <TableCell>
                        <WebProductToggle product={p} field="webFeatured" />
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/web/products/${p.id}`}>
                          <Button variant="outline" size="icon-sm" title="Editar web del producto">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
