'use client'

import { useRef, useState, useEffect } from 'react'
import {
  Search,
  LogOut,
  User,
  Menu,
  Package,
  Users,
  Receipt,
  PackageSearch,
  Loader2,
  ArrowRight,
  Settings,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useRouter } from 'next/navigation'
import { NotificationsDropdown } from '@/components/layout/notifications-dropdown'
import { globalSearch } from '@/modules/search/search.actions'
import { formatCurrency } from '@/lib/format'

interface HeaderProps {
  user: {
    name: string
    email: string
  }
  onMenuClick?: () => void
}

interface SearchResults {
  products: Array<{
    id: string
    name: string
    barcode: string | null
    salePrice: number
    stock: number
    category: { name: string } | null
  }>
  clients: Array<{ id: string; name: string; phone: string | null }>
  sales: Array<{ id: string; invoiceNumber: string; total: number }>
}

const EMPTY_RESULTS: SearchResults = { products: [], clients: [], sales: [] }

export function Header({ user, onMenuClick }: HeaderProps) {
  const router = useRouter()

  function handleLogout() {
    router.push('/auth/logout')
  }

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResults>(EMPTY_RESULTS)
  const [open, setOpen] = useState(false)
  const [searching, setSearching] = useState(false)
  const searchBoxRef = useRef<HTMLDivElement>(null)
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const hasResults = results.products.length > 0 || results.clients.length > 0 || results.sales.length > 0

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
    }
  }, [])

  function handleSearchChange(value: string) {
    setQuery(value)
    if (debounceTimer.current) clearTimeout(debounceTimer.current)

    if (value.trim().length < 2) {
      setResults(EMPTY_RESULTS)
      setOpen(false)
      setSearching(false)
      return
    }

    setOpen(true)
    setSearching(true)
    debounceTimer.current = setTimeout(async () => {
      try {
        const data = await globalSearch(value)
        setResults(data)
      } catch {
        setResults(EMPTY_RESULTS)
      } finally {
        setSearching(false)
      }
    }, 250)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      setOpen(false)
      return
    }
    if (e.key === 'Enter') {
      const first = results.products[0]
      if (first) {
        e.preventDefault()
        router.push(`/inventory/${first.id}`)
        setOpen(false)
      } else if (hasResults) {
        e.preventDefault()
        router.push('/sales')
        setOpen(false)
      } else if (query.trim().length >= 2) {
        e.preventDefault()
        router.push('/inventory')
        setOpen(false)
      }
    }
  }

  function goToInventory() {
    setOpen(false)
    setQuery('')
    router.push('/inventory')
  }

  function navigate(path: string) {
    setOpen(false)
    setQuery('')
    router.push(path)
  }

  const userInitial = user.name ? user.name.charAt(0).toUpperCase() : 'A'

  return (
    <header className="flex h-16 items-center justify-between border-b border-border/80 bg-background/80 backdrop-blur-md px-4 lg:px-6 sticky top-0 z-30 shadow-xs">
      {/* Lado Izquierdo: Menú móvil y Barra de búsqueda global */}
      <div className="flex items-center gap-2.5 sm:gap-3 flex-1 max-w-xl min-w-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuClick}
          className="lg:hidden shrink-0 rounded-xl text-muted-foreground hover:text-foreground"
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Barra de búsqueda estilo Pill con atajo rápido */}
        <div ref={searchBoxRef} className="relative w-full max-w-xs sm:max-w-md">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/70" />
          <Input
            id="global-search"
            type="search"
            placeholder="Buscar productos, clientes o facturas..."
            value={query}
            onChange={(e) => handleSearchChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (results && query.trim().length >= 2) setOpen(true)
            }}
            onBlur={() => {
              if (debounceTimer.current) clearTimeout(debounceTimer.current)
            }}
            className="w-full pl-8 pr-12 h-9 rounded-full bg-muted/40 hover:bg-muted/70 focus:bg-card border-border/70 text-xs shadow-2xs focus-visible:ring-1 focus-visible:ring-primary/20 transition-all"
          />
          <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center px-1.5 py-0.5 text-[9px] font-mono font-medium text-muted-foreground/70 bg-card rounded border border-border/60 pointer-events-none shadow-2xs">
            Alt+Q
          </kbd>

          {/* Menú flotante de resultados globales */}
          {open && query.trim().length >= 2 && (
            <div className="absolute left-0 top-full mt-2 w-80 sm:w-96 z-50 rounded-2xl border border-border/80 bg-popover/98 backdrop-blur-xl text-popover-foreground shadow-2xl overflow-hidden animate-fade-in">
              {searching ? (
                <div className="flex items-center gap-2 px-4 py-3 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Buscando en catálogo y ventas...
                </div>
              ) : !hasResults ? (
                <div className="px-4 py-3 text-xs text-muted-foreground">
                  Sin resultados para &quot;{query.trim()}&quot;
                </div>
              ) : (
                <div className="max-h-[65vh] overflow-y-auto py-1 divide-y divide-border/40">
                  {results.products.length > 0 && (
                    <div className="py-1">
                      <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Package className="h-3 w-3" /> Productos
                      </div>
                      {results.products.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => navigate(`/inventory/${p.id}`)}
                          className="w-full flex items-center justify-between gap-3 px-3 py-2 text-left text-xs hover:bg-muted/50 transition-colors"
                        >
                          <span className="flex flex-col min-w-0">
                            <span className="font-semibold truncate text-foreground">{p.name}</span>
                            <span className="text-[10px] text-muted-foreground truncate">
                              {p.category?.name}
                              {p.barcode ? ` · ${p.barcode}` : ''}
                            </span>
                          </span>
                          <span className="flex items-center gap-2 shrink-0">
                            <span className="font-mono font-semibold">{formatCurrency(p.salePrice)}</span>
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                                p.stock <= 0
                                  ? 'bg-destructive/10 text-destructive'
                                  : p.stock <= 5
                                    ? 'bg-amber-500/10 text-amber-600'
                                    : 'bg-muted text-muted-foreground'
                              }`}
                            >
                              {p.stock} u
                            </span>
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  {results.clients.length > 0 && (
                    <div className="py-1">
                      <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Users className="h-3 w-3" /> Clientes
                      </div>
                      {results.clients.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => navigate('/clients')}
                          className="w-full flex items-center justify-between gap-3 px-3 py-2 text-left text-xs hover:bg-muted/50 transition-colors"
                        >
                          <span className="font-semibold truncate text-foreground">{c.name}</span>
                          <span className="text-[10px] text-muted-foreground shrink-0 font-mono">{c.phone}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {results.sales.length > 0 && (
                    <div className="py-1">
                      <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Receipt className="h-3 w-3" /> Facturas
                      </div>
                      {results.sales.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => navigate(`/sales/${s.id}`)}
                          className="w-full flex items-center justify-between gap-3 px-3 py-2 text-left text-xs hover:bg-muted/50 transition-colors"
                        >
                          <span className="font-mono font-semibold truncate text-foreground">{s.invoiceNumber}</span>
                          <span className="text-xs font-mono font-bold shrink-0">{formatCurrency(s.total)}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={goToInventory}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold border-t border-border bg-muted/40 hover:bg-muted/70 transition-colors text-foreground"
              >
                <PackageSearch className="h-3.5 w-3.5" />
                Ir al inventario completo
                <ArrowRight className="h-3.5 w-3.5 ml-auto" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Lado Derecho: Notificaciones y Perfil de Usuario */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Campana de Notificaciones */}
        <NotificationsDropdown />

        {/* Avatar Dropdown en el Header */}
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2.5 cursor-pointer rounded-full p-1 pl-2.5 pr-1 hover:bg-muted/70 transition-all duration-150 outline-none">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-semibold text-foreground leading-tight">{user.name}</div>
              <div className="text-[10px] text-muted-foreground/80 font-normal">Administrador</div>
            </div>
            <div className="h-8 w-8 rounded-full bg-slate-950 text-white flex items-center justify-center shrink-0 shadow-xs font-bold text-xs ring-2 ring-slate-900/10">
              {userInitial}
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 mt-2 rounded-2xl border-border shadow-2xl p-1.5">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="font-normal px-2.5 py-2">
                <div className="flex flex-col gap-0.5">
                  <span className="font-bold text-xs text-foreground">{user.name}</span>
                  <span className="text-[11px] text-muted-foreground font-normal truncate">{user.email}</span>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator className="my-1" />
            <DropdownMenuItem
              onClick={() => router.push('/profile')}
              className="cursor-pointer rounded-xl px-2.5 py-2 text-xs"
            >
              <User className="mr-2 h-4 w-4" />
              <span>Mi Perfil</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => router.push('/admin')}
              className="cursor-pointer rounded-xl px-2.5 py-2 text-xs"
            >
              <Settings className="mr-2 h-4 w-4" />
              <span>Configuración</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="my-1" />
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-destructive focus:text-destructive cursor-pointer rounded-xl px-2.5 py-2 text-xs"
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Cerrar Sesión</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
