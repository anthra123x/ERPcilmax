'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { Globe, Pencil } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { setWebProductFeatured, setWebProductVisible } from '@/modules/web/web.actions'
import type { ProductWebStatus } from '@/modules/web/web.types'

interface InventoryWebPublishProps {
  productId: string
  status: ProductWebStatus
}

export function InventoryWebPublish({ productId, status }: InventoryWebPublishProps) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function toggle(field: 'visible' | 'featured', next: boolean) {
    setBusy(true)
    const result =
      field === 'visible'
        ? await setWebProductVisible(productId, next)
        : await setWebProductFeatured(productId, next)
    if (result?.error) {
      toast.error(result.error)
    } else {
      if (result?.success) toast.success(result.success)
      router.refresh()
    }
    setBusy(false)
  }

  const stockNote =
    status.stockStatus === 'OUT' ? (
      <span className="text-red-600">Agotado — se mostrará como sin stock en la tienda</span>
    ) : status.stockStatus === 'LOW' ? (
      <span className="text-amber-600">Stock bajo ({status.stock} uds)</span>
    ) : (
      <span>Con stock ({status.stock} uds)</span>
    )

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Tienda online</h3>
          </div>
          <Badge
            variant={status.webVisible ? 'default' : 'outline'}
            className={status.webVisible ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400' : undefined}
          >
            {status.webVisible ? 'Publicado' : 'Oculto'}
          </Badge>
        </div>

        <p className="truncate font-mono text-xs text-muted-foreground">
          {status.slug ? `/${status.slug}` : status.webVisible ? 'sin slug' : 'sin slug · se generará al publicar'}
        </p>

        <p className="text-xs">
          {!status.readiness.hasMedia && <span className="text-amber-600">Sin imagen en la ficha web · </span>}
          {stockNote}
        </p>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <div className="flex items-center gap-2">
            <Switch
              checked={status.webVisible}
              onCheckedChange={(next) => toggle('visible', next)}
              disabled={busy}
              aria-label="Publicar en la tienda"
            />
            <span className="text-xs text-muted-foreground">Publicado</span>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={status.webFeatured}
              onCheckedChange={(next) => toggle('featured', next)}
              disabled={busy}
              aria-label="Destacar en la tienda"
            />
            <span className="text-xs text-muted-foreground">Destacado</span>
          </div>
        </div>

        <Link href={`/web/products/${productId}`}>
          <Button variant="outline" size="sm">
            <Pencil className="h-3.5 w-3.5" /> Editar ficha web
          </Button>
        </Link>
      </CardContent>
    </Card>
  )
}