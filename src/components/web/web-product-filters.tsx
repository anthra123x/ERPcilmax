'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { SearchInput } from '@/components/ui/search-input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Eraser } from 'lucide-react'

export interface WebProductFiltersProps {
  search: string
  categoryId: string
  status: string
  stock: string
  categories: { id: string; name: string }[]
}

export function WebProductFilters({ search, categoryId, status, stock, categories }: WebProductFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [searchValue, setSearchValue] = useState(search)

  function applyFilters(overrides: Partial<{ search: string; categoria: string; estado: string; stock: string }>) {
    const params = new URLSearchParams()
    const s = overrides.search ?? searchValue
    const c = overrides.categoria ?? categoryId
    const e = overrides.estado ?? status
    const st = overrides.stock ?? stock
    if (s.trim()) params.set('search', s.trim())
    if (c) params.set('categoria', c)
    if (e && e !== 'ALL') params.set('estado', e)
    if (st && st !== 'ALL') params.set('stock', st)
    const qs = params.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname)
  }

  function clearFilters() {
    setSearchValue('')
    router.push(pathname)
  }

  const hasFilters = Boolean(search || categoryId || (status && status !== 'ALL') || (stock && stock !== 'ALL'))

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="w-full sm:w-72">
        <SearchInput
          value={searchValue}
          onChange={(s) => applyFilters({ search: s })}
          placeholder="Buscar por nombre, slug o referencia..."
        />
      </div>

      <Select value={categoryId || ''} onValueChange={(v) => applyFilters({ categoria: v || '' })}>
        <SelectTrigger className="min-w-44">
          <SelectValue placeholder="Todas las categorías" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">Todas las categorías</SelectItem>
          {categories.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={status} onValueChange={(v) => applyFilters({ estado: v || 'ALL' })}>
        <SelectTrigger className="min-w-36">
          <SelectValue placeholder="Estado" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">Todos los estados</SelectItem>
          <SelectItem value="VISIBLE">Publicados</SelectItem>
          <SelectItem value="HIDDEN">Ocultos</SelectItem>
          <SelectItem value="FEATURED">Destacados</SelectItem>
        </SelectContent>
      </Select>

      <Select value={stock} onValueChange={(v) => applyFilters({ stock: v || 'ALL' })}>
        <SelectTrigger className="min-w-36">
          <SelectValue placeholder="Stock" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">Todo el stock</SelectItem>
          <SelectItem value="OK">Con stock</SelectItem>
          <SelectItem value="LOW">Stock bajo</SelectItem>
          <SelectItem value="OUT">Agotados</SelectItem>
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters}>
          <Eraser className="h-3.5 w-3.5" /> Limpiar filtros
        </Button>
      )}
    </div>
  )
}