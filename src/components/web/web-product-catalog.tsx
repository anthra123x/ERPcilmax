'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { ArrowDown, ArrowUp, Eye, EyeOff, Pencil, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { EmptyState } from '@/components/ui/empty-state'
import { formatCurrency } from '@/lib/format'
import {
  bulkUpdateWebProducts,
  moveWebProduct,
  setWebProductFeatured,
  setWebProductVisible,
} from '@/modules/web/web.actions'
import type { AdminWebProductRow, WebStockStatus } from '@/modules/web/web.helpers'

type ActionResult = { error?: string; success?: string }

const STOCK_LABEL: Record<WebStockStatus, string> = {
  OK: 'Con stock',
  LOW: 'Stock bajo',
  OUT: 'Agotado',
}

const STOCK_CLASS: Record<WebStockStatus, string> = {
  OK: 'text-emerald-600',
  LOW: 'text-amber-600',
  OUT: 'text-red-600',
}

export interface WebProductCatalogProps {
  products: AdminWebProductRow[]
  hasFilters: boolean
}

export function WebProductCatalog({ products, hasFilters }: WebProductCatalogProps) {
  const router = useRouter()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)

  const allSelected = products.length > 0 && selected.size === products.length

  async function act(fn: () => Promise<ActionResult>) {
    setBusy(true)
    const result = await fn()
    if (result?.error) {
      toast.error(result.error)
    } else {
      if (result?.success) toast.success(result.success)
      router.refresh()
    }
    setBusy(false)
  }

  async function bulk(patch: { webVisible?: boolean; webFeatured?: boolean }) {
    const ids = Array.from(selected)
    if (ids.length === 0) return
    setBusy(true)
    const result = await bulkUpdateWebProducts(ids, patch)
    if (result?.error) {
      toast.error(result.error)
    } else {
      if (result?.success) toast.success(result.success)
      setSelected(new Set())
      router.refresh()
    }
    setBusy(false)
  }

  function toggleSelectAll() {
    if (allSelected) {
      setSelected(new Set())
    } else {
      setSelected(new Set(products.map((p) => p.id)))
    }
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  return (
    <div className="space-y-3">
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2">
          <span className="text-sm font-medium">{selected.size} seleccionados</span>
          <div className="ml-auto flex flex-wrap gap-2">
            <Button size="sm" variant="outline" disabled={busy} onClick={() => bulk({ webVisible: true })}>
              <Eye className="h-3.5 w-3.5" /> Publicar
            </Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => bulk({ webVisible: false })}>
              <EyeOff className="h-3.5 w-3.5" /> Ocultar
            </Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => bulk({ webFeatured: true })}>
              <Star className="h-3.5 w-3.5" /> Destacar
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => bulk({ webFeatured: false })}
              title="Quitar el destacado de los seleccionados"
            >
              <Star className="h-3.5 w-3.5 text-muted-foreground" /> Quitar destacado
            </Button>
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => setSelected(new Set())}>
              Quitar selección
            </Button>
          </div>
        </div>
      )}

      {products.length === 0 ? (
        <EmptyState
          title="Sin productos"
          description={
            hasFilters
              ? 'Ningún producto coincide con los filtros aplicados.'
              : 'Agrega productos a inventario para poder publicarlos en la web.'
          }
        />
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox checked={allSelected} onCheckedChange={toggleSelectAll} disabled={busy || products.length === 0} aria-label="Seleccionar todos" />
                </TableHead>
                <TableHead>Producto</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Precio</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Publicación</TableHead>
                <TableHead>Orden</TableHead>
                <TableHead>Publicado</TableHead>
                <TableHead>Destacado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((p, index) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <Checkbox
                      checked={selected.has(p.id)}
                      onCheckedChange={() => toggleSelect(p.id)}
                      disabled={busy}
                      aria-label={`Seleccionar ${p.name}`}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md border">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={p.media[0]?.url || p.imageUrl || ''}
                          alt=""
                          className="h-full w-full object-cover"
                        />
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
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{p.stock} uds</span>
                      <span className={`text-xs ${STOCK_CLASS[p.stockStatus]}`}>{STOCK_LABEL[p.stockStatus]}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {p.readiness.ready ? (
                      <Badge variant="outline" className="border-emerald-300 text-emerald-700 dark:text-emerald-400">
                        Listo para publicar
                      </Badge>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {!p.readiness.hasSlug && (
                          <Badge variant="outline" className="border-amber-300 text-amber-700 dark:text-amber-400">
                            Sin slug
                          </Badge>
                        )}
                        {!p.readiness.hasMedia && (
                          <Badge variant="outline" className="border-amber-300 text-amber-700 dark:text-amber-400">
                            Sin imagen
                          </Badge>
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        title="Subir"
                        disabled={busy || index === 0}
                        onClick={() => act(() => moveWebProduct(p.id, 'up'))}
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        title="Bajar"
                        disabled={busy || index === products.length - 1}
                        onClick={() => act(() => moveWebProduct(p.id, 'down'))}
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      <Badge variant="outline" className="ml-1">
                        {p.webSortOrder}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={p.webVisible}
                      onCheckedChange={(next) => act(() => setWebProductVisible(p.id, next))}
                      disabled={busy}
                    />
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={p.webFeatured}
                      onCheckedChange={(next) => act(() => setWebProductFeatured(p.id, next))}
                      disabled={busy}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/web/products/${p.id}`} title="Editar ficha web">
                      <Button variant="outline" size="icon-sm">
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
    </div>
  )
}