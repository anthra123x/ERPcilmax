import Link from 'next/link'
import { ArrowLeft, Star } from 'lucide-react'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { formatCurrency } from '@/lib/format'
import { getAdminWebProductById, updateWebProduct, addWebMedia, removeWebMedia } from '@/modules/web/web.actions'
import { WebProductEditor } from '@/components/web/web-product-editor'
import { WebMediaManager } from '@/components/web/web-media-manager'
import { WebReviewActions } from '@/components/web/web-review-actions'

export const dynamic = 'force-dynamic'

function Stars({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-0.5 text-amber-500" aria-label={`${value} de 5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className={`h-3.5 w-3.5 ${i < value ? 'fill-current' : 'opacity-25'}`} />
      ))}
    </span>
  )
}

function fmtDate(d: Date | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default async function WebProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const product = await getAdminWebProductById(id)
  if (!product) notFound()

  const validProduct = product

  async function handleProductSubmit(formData: FormData) {
    'use server'
    return await updateWebProduct(validProduct.id, formData)
  }

  async function handleAddMedia(formData: FormData) {
    'use server'
    return await addWebMedia(validProduct.id, formData)
  }

  async function handleRemoveMedia(mediaId: string) {
    'use server'
    return await removeWebMedia(mediaId)
  }

  const approvedReviews = validProduct.webReviews.filter((r) => r.approved)
  const pendingReviews = validProduct.webReviews.filter((r) => !r.approved)

  return (
    <div className="page-container py-6 space-y-6">
      <Link
        href="/web/products"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Volver a productos web
      </Link>

      <div className="grid gap-6 lg:grid-cols-2">
        <WebProductEditor product={product} onSubmit={handleProductSubmit} />

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Datos de inventario</CardTitle>
              <CardDescription>Precio, stock y categoría viven en inventario. Cámbialos ahí.</CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-muted-foreground">Precio de venta</dt>
                  <dd className="font-semibold">{formatCurrency(validProduct.salePrice)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Stock</dt>
                  <dd>{validProduct.stock}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Categoría</dt>
                  <dd>{validProduct.category?.name || '—'}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Referencia</dt>
                  <dd className="font-mono text-xs break-all">{validProduct.barcode || '—'}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <WebMediaManager
            productName={validProduct.name}
            media={validProduct.media}
            onAdd={handleAddMedia}
            onRemove={handleRemoveMedia}
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Reseñas</CardTitle>
          <CardDescription>
            {approvedReviews.length} publicadas · {pendingReviews.length} pendientes de moderación
          </CardDescription>
        </CardHeader>
        <CardContent>
          {validProduct.webReviews.length === 0 ? (
            <EmptyState title="Sin reseñas" description="Todavía no hay reseñas para este producto." />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Calificación</TableHead>
                    <TableHead>Comentario</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {validProduct.webReviews.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <p className="font-medium">{r.name}</p>
                        {r.email && <p className="text-xs text-muted-foreground">{r.email}</p>}
                      </TableCell>
                      <TableCell>
                        <Stars value={r.rating} />
                      </TableCell>
                      <TableCell className="max-w-sm">
                        <p className="line-clamp-2 text-sm text-muted-foreground">{r.comment}</p>
                      </TableCell>
                      <TableCell>{fmtDate(r.createdAt)}</TableCell>
                      <TableCell>
                        <Badge variant={r.approved ? 'default' : 'outline'}>
                          {r.approved ? 'Publicada' : 'Pendiente'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <WebReviewActions id={r.id} approved={r.approved} />
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
