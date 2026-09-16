import Link from 'next/link'
import { Star } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/ui/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { getAdminWebReviews } from '@/modules/web/web.actions'
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

export default async function WebReviewsPage({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
  const sp = await searchParams
  const estado = (sp.estado as 'ALL' | 'APPROVED' | 'PENDING') || 'ALL'
  const reviews = await getAdminWebReviews()
  const filtered =
    estado === 'ALL' ? reviews : reviews.filter((r) => (estado === 'APPROVED' ? r.approved : !r.approved))
  const pending = reviews.filter((r) => !r.approved).length

  const filterHref = (e: string) => `/web/reviews?${new URLSearchParams({ estado: e }).toString()}`

  return (
    <div className="page-container py-6 space-y-6">
      <PageHeader
        title="Reseñas"
        description={pending > 0 ? `${pending} pendientes de moderación` : 'Sin reseñas pendientes'}
      />

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {[
              { key: 'ALL', label: 'Todas' },
              { key: 'PENDING', label: 'Pendientes' },
              { key: 'APPROVED', label: 'Publicadas' },
            ].map((f) => (
              <Link key={f.key} href={filterHref(f.key)}>
                <Badge variant={estado === f.key ? 'default' : 'outline'} className="cursor-pointer">
                  {f.label}
                </Badge>
              </Link>
            ))}
          </div>

          {filtered.length === 0 ? (
            <EmptyState title="Sin reseñas" description="No hay reseñas que coincidan con el filtro." />
          ) : (
            <ul className="divide-y divide-border">
              {filtered.map((r) => (
                <li key={r.id} className="flex items-start justify-between gap-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium">{r.name}</p>
                      <Stars value={r.rating} />
                      <Badge variant={r.approved ? 'default' : 'outline'}>
                        {r.approved ? 'Publicada' : 'Pendiente'}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{fmtDate(r.createdAt)}</span>
                    </div>
                    <Link href={`/web/products/${r.product.id}`} className="text-xs text-primary hover:underline">
                      {r.product.name}
                    </Link>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{r.comment}</p>
                  </div>
                  <WebReviewActions id={r.id} approved={r.approved} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
