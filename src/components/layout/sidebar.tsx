'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  ShoppingCart,
  ShoppingBag,
  HandCoins,
  Package,
  Users,
  Settings,
  Keyboard,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react'

// Módulos principales de navegación (Asistente IA retirado al estar disponible como widget flotante global)
const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Ventas', href: '/sales', icon: ShoppingCart },
  { name: 'Tienda online', href: '/web', icon: ShoppingBag },
  { name: 'Créditos', href: '/credits', icon: HandCoins },
  { name: 'Inventario', href: '/inventory', icon: Package },
  { name: 'Clientes', href: '/clients', icon: Users },
]

interface SidebarProps {
  collapsed?: boolean
  onToggleCollapse?: () => void
}

export function Sidebar({ collapsed = false, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname()

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + '/')
  }

  return (
    <aside
      className={cn(
        'flex h-full flex-col bg-sidebar text-sidebar-foreground transition-all duration-300 ease-in-out select-none border-r border-sidebar-border',
        collapsed ? 'w-18' : 'w-64'
      )}
    >
      {/* Header del sidebar: logo simplificado y limpio */}
      <div
        className={cn(
          'flex h-16 items-center border-b border-sidebar-border/80 transition-all duration-300',
          collapsed ? 'justify-center px-2' : 'justify-between px-4'
        )}
      >
        <Link
          href="/dashboard"
          className="flex items-center gap-3 overflow-hidden group focus:outline-none"
        >
          {/* Logo cilmax: moderno, suave y redondeado */}
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground font-black text-base shadow-sm ring-1 ring-white/15 group-hover:scale-105 group-hover:shadow-md transition-all duration-200 shrink-0">
            C
          </div>

          {!collapsed && (
            <div className="flex items-baseline gap-1.5 min-w-0 transition-opacity duration-200">
              <span className="text-base font-bold tracking-tight text-white truncate">
                Cilmax
              </span>
              <span className="text-[11px] font-semibold text-sidebar-primary uppercase tracking-wider">
                ERP
              </span>
            </div>
          )}
        </Link>

        {/* Botón para contraer / retraer el sidebar en escritorio */}
        {onToggleCollapse && !collapsed && (
          <button
            type="button"
            onClick={onToggleCollapse}
            title="Contraer barra lateral"
            aria-label="Contraer barra lateral"
            className="hidden lg:flex items-center justify-center h-8 w-8 rounded-lg text-sidebar-foreground/60 hover:text-white hover:bg-sidebar-accent/80 transition-all cursor-pointer"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Si está contraído, botón toggle en la parte superior */}
      {onToggleCollapse && collapsed && (
        <div className="hidden lg:flex justify-center pt-2 pb-1 border-b border-sidebar-border/40">
          <button
            type="button"
            onClick={onToggleCollapse}
            title="Expandir barra lateral"
            aria-label="Expandir barra lateral"
            className="flex items-center justify-center h-9 w-9 rounded-xl text-sidebar-foreground/60 hover:text-white hover:bg-sidebar-accent/80 transition-all cursor-pointer shadow-sm"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Navegación de módulos con bordes suaves y transiciones limpias */}
      <nav
        className={cn(
          'flex-1 overflow-y-auto overflow-x-hidden',
          collapsed ? 'p-2 space-y-2 flex flex-col items-center' : 'p-3 space-y-1.5'
        )}
      >
        {navigation.map((item) => {
          const active = isActive(item.href)

          if (collapsed) {
            // Modo Retraído: Íconos centrados y redondeados con tooltip
            return (
              <div key={item.name} className="relative group flex justify-center w-full">
                <Link
                  href={item.href}
                  aria-label={item.name}
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-200 cursor-pointer relative',
                    active
                      ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-md shadow-sidebar-primary/25 scale-105'
                      : 'text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-white hover:shadow-sm hover:scale-105'
                  )}
                >
                  <item.icon className="h-4.5 w-4.5 shrink-0" />
                </Link>

                {/* Tooltip flotante al hacer hover */}
                <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1.5 rounded-lg bg-sidebar-accent text-white text-xs font-semibold whitespace-nowrap shadow-xl border border-sidebar-border/80 z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                  {item.name}
                </div>
              </div>
            )
          }

          // Modo Expandido: Filas suaves y modernas
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                active
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground font-semibold shadow-sm shadow-sidebar-primary/25'
                  : 'text-sidebar-foreground/75 hover:bg-sidebar-accent/80 hover:text-white hover:translate-x-1'
              )}
            >
              <item.icon
                className={cn(
                  'h-4.5 w-4.5 shrink-0 transition-transform duration-200 group-hover:scale-110',
                  active ? 'text-sidebar-primary-foreground' : 'text-sidebar-foreground/70 group-hover:text-white'
                )}
              />

              <span className="flex-1 truncate tracking-tight">{item.name}</span>
            </Link>
          )
        })}

        {/* Separador y enlace de Administración */}
        <div
          className={cn(
            'border-t border-sidebar-border/70 pt-3 mt-3 w-full',
            collapsed && 'flex justify-center'
          )}
        >
          {collapsed ? (
            <div className="relative group flex justify-center w-full">
              <Link
                href="/admin"
                aria-label="Administración"
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-200 cursor-pointer',
                  pathname === '/admin'
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-md shadow-sidebar-primary/25'
                    : 'text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-white hover:scale-105'
                )}
              >
                <Settings className="h-4.5 w-4.5 shrink-0" />
              </Link>
              <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1.5 rounded-lg bg-sidebar-accent text-white text-xs font-semibold whitespace-nowrap shadow-xl border border-sidebar-border/80 z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                Administración
              </div>
            </div>
          ) : (
            <Link
              href="/admin"
              className={cn(
                'group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                pathname === '/admin'
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground font-semibold shadow-sm'
                  : 'text-sidebar-foreground/75 hover:bg-sidebar-accent/80 hover:text-white hover:translate-x-1'
              )}
            >
              <Settings
                className={cn(
                  'h-4.5 w-4.5 shrink-0 transition-transform duration-200 group-hover:scale-110',
                  pathname === '/admin' ? 'text-sidebar-primary-foreground' : 'text-sidebar-foreground/70 group-hover:text-white'
                )}
              />
              <span className="flex-1 truncate tracking-tight">Administración</span>
            </Link>
          )}
        </div>
      </nav>

      {/* Pie de la barra lateral: atajos y controles */}
      <div className="border-t border-sidebar-border/70 p-2.5">
        {collapsed ? (
          <button
            type="button"
            onClick={onToggleCollapse}
            title="Expandir barra lateral"
            aria-label="Expandir barra lateral"
            className="w-full flex items-center justify-center p-2 rounded-lg text-sidebar-foreground/50 hover:text-white hover:bg-sidebar-accent/60 transition-colors cursor-pointer"
          >
            <Keyboard className="h-4 w-4" />
          </button>
        ) : (
          <div className="px-2.5 py-1 text-[11px] text-sidebar-foreground/50 flex items-center justify-between font-mono">
            <div className="flex items-center gap-1.5">
              <Keyboard className="h-3.5 w-3.5 shrink-0" />
              <span>Alt+Q buscar · Alt+V ventas</span>
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}