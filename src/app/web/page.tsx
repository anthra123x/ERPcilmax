import Link from 'next/link'
import { Package, ShoppingBag, MessageSquare, Star, Globe, ArrowRight, Store } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/ui/page-header'
import { formatCurrency } from '@/lib/format'
import { getWebOverview } from '@/modules/web/web.actions'
import { getWebOrderStatusLabel, getWebOrderStatusColor } from '@/lib/labels'

export const dynamic = 'force-dynamic'

function fmtDate(d: Date | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export default async function WebOverviewPage() {
  const overview = await getWebOverview()
  const s = overview.settings

  return (
    <div className="page-container py-6 space-y-6">
      <PageHeader
        title="Tienda online"
        description="Gestión de la tienda que ven tus clientes en cilmax.com.co"
        actions={
          <Link href="/web/products">
            <Button>
              <Package className="h-4 w-4" />
              Productos web
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Productos visibles</p>
            <p className="text-2xl font-bold">
              {overview.visibleProducts}
              <span className="text-sm font-normal text-muted-foreground"> / {overview.totalProducts}</span>
            </p>
            <p className="text-xs text-muted-foreground">en inventario</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Pedidos pendientes</p>
            <p className="text-2xl font-bold text-amber-600">{overview.pendingOrders}</p>
            <p className="text-xs text-muted-foreground">por convertir a venta</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Mensajes sin leer</p>
            <p className="text-2xl font-bold text-blue-600">{overview.unreadMessages}</p>
            <p className="text-xs text-muted-foreground">de contacto</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Reseñas por publicar</p>
            <p className="text-2xl font-bold text-violet-600">{overview.pendingReviews}</p>
            <p className="text-xs text-muted-foreground">pendientes de moderación</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Últimos pedidos web</h2>
              <Link href="/web/orders" className="text-xs text-primary hover:underline inline-flex items-center gap-1">
                Ver todos <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            {overview.recentOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">Sin pedidos web todavía.</p>
            ) : (
              <ul className="divide-y divide-border">
                {overview.recentOrders.map((o) => (
                  <li key={o.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{o.customerName}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {o.items.map((i) => `${i.productName} ×${i.quantity}`).join(', ')}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge className={getWebOrderStatusColor(o.status)} variant="outline">
                        {getWebOrderStatusLabel(o.status)}
                      </Badge>
                      <span className="text-sm font-semibold">{formatCurrency(o.total)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Últimos mensajes</h2>
              <Link
                href="/web/messages"
                className="text-xs text-primary hover:underline inline-flex items-center gap-1"
              >
                Ver todos <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            {overview.recentMessages.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">Sin mensajes de contacto.</p>
            ) : (
              <ul className="divide-y divide-border">
                {overview.recentMessages.map((m) => (
                  <li key={m.id} className="flex items-start justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {m.name} {!m.read && <span className="ml-1 inline-block h-2 w-2 rounded-full bg-primary" />}
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-2">{m.message}</p>
                      <p className="text-[11px] text-muted-foreground/70">{fmtDate(m.createdAt)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Store className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">{s.storeName}</p>
              <p className="text-xs text-muted-foreground">
                WhatsApp {s.whatsapp || '—'} · Email {s.email || '—'}
              </p>
              <div className="mt-1 inline-flex items-center gap-2 rounded-md border px-2 py-1">
                <span
                  className="h-3 w-3 rounded-full border border-black/10"
                  style={{ backgroundColor: s.theme.primaryColor }}
                />
                <span
                  className="h-3 w-3 rounded-full border border-black/10"
                  style={{ backgroundColor: s.theme.goldColor }}
                />
                <span className="text-[11px] text-muted-foreground">
                  {s.theme.primaryColor} / {s.theme.goldColor}
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/web/orders">
              <Button variant="outline" size="sm">
                <ShoppingBag className="h-4 w-4" /> Pedidos
              </Button>
            </Link>
            <Link href="/web/messages">
              <Button variant="outline" size="sm">
                <MessageSquare className="h-4 w-4" /> Mensajes
              </Button>
            </Link>
            <Link href="/web/reviews">
              <Button variant="outline" size="sm">
                <Star className="h-4 w-4" /> Reseñas
              </Button>
            </Link>
            <Link href="/web/settings">
              <Button variant="outline" size="sm">
                <Globe className="h-4 w-4" /> Ajustes
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
