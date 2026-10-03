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
  ChevronRight,
  Shield,
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
import { useRouter, usePathname } from 'next/navigation'
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

const ROUTE_BREADCRUMBS: Record<string, { section: string; title: string }> = {
  '/dashboard': { section: 'Dashboard', title: 'Overview' },
  '/sales': { section: 'Comercial', title: 'Ventas (POS)' },
  '/web': { section: 'E-Commerce', title: 'Tienda Online' },
  '/inventory': { section: 'Operaciones', title: 'Inventario' },
  '/clients': { section: 'Clientes', title: 'Directorio' },
  '/credits': { section: 'Finanzas', title: 'Cartera & Créditos' },
  '/reports': { section: 'Analítica', title: 'Reportes' },
  '/assistant': { section: 'Inteligencia', title: 'Asistente IA' },
  '/admin': { section: 'Sistema', title: 'Configuración' },
  '/profile': { section: 'Usuario', title: 'Mi Perfil' },
}

export function Header({ user, onMenuClick }: HeaderProps) {
  const router = useRouter()
  const pathname = usePathname()

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

  // Breadcrumbs match
  const matchedRoute = ROUTE_BREADCRUMBS[pathname] ||
    Object.entries(ROUTE_BREADCRUMBS).find(([prefix]) => prefix !== '/' && pathname.startsWith(prefix))?.[1] || {
      section: 'Nova ERP',
      title: 'Plataforma',
    }

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
    <header className="flex h-16 items-center justify-between border-b border-border/70 bg-card/80 backdrop-blur-md px-4 lg:px-7 sticky top-0 z-30 shadow-2xs">
      {/* Lado Izquierdo: Menú móvil y Breadcrumbs estilo 'Dashboard > Overview' */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuClick}
          className="lg:hidden shrink-0 rounded-xl text-muted-foreground hover:text-foreground"
        >
          <Menu className="h-5 w-5" />
        </Button>

        <div className="flex items-center gap-1.5 text-xs font-medium">
          <span className="text-muted-foreground/80 hover:text-foreground transition-colors">
            {matchedRoute.section}
          </span>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
          <span className="font-semibold text-foreground tracking-tight">{matchedRoute.title}</span>
        </div>
      </div>

      {/* Lado Derecho: Buscador Pill, Notificaciones, Estado de Seguridad y Perfil */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Barra de búsqueda estilo Pill con atajo rápido */}
        <div ref={searchBoxRef} className="relative w-48 sm:w-64 lg:w-72">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/70" />
          <Input
            id="global-search"
            type="search"
            placeholder="Buscar..."
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
            <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 z-50 rounded-2xl border border-border/80 bg-popover/98 backdrop-blur-xl text-popover-foreground shadow-2xl overflow-hidden animate-fade-in">
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

        {/* Campana de Notificaciones */}
        <NotificationsDropdown />

        {/* Botón de Seguridad / Estado */}
        <div
          title="Conexión Segura & Cifrado Activo"
          className="hidden md:flex items-center justify-center h-8 w-8 rounded-full border border-border/80 bg-card text-muted-foreground hover:text-foreground transition-colors shadow-2xs cursor-default"
        >
          <Shield className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
        </div>

        {/* Avatar Dropdown en el Header */}
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center cursor-pointer rounded-full outline-none">
            <div className="h-8 w-8 rounded-full bg-gray-950 text-white flex items-center justify-center shrink-0 shadow-xs font-bold text-xs ring-2 ring-gray-900/10 hover:ring-gray-900/20 transition-all">
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
