'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Store,
  ShoppingCart,
  ShoppingBag,
  HandCoins,
  Package,
  Users,
  Bot,
  Settings,
  Keyboard,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react'

// Módulos activos (Finanzas y Reportes eliminados a favor del Asistente IA)
const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Ventas', href: '/sales', icon: ShoppingCart },
  { name: 'Tienda online', href: '/web', icon: ShoppingBag },
  { name: 'Créditos', href: '/credits', icon: HandCoins },
  { name: 'Inventario', href: '/inventory', icon: Package },
  { name: 'Clientes', href: '/clients', icon: Users },
  { name: 'Asistente IA', href: '/assistant', icon: Bot, highlight: true },
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
    <div
      className={cn(
        'flex h-full flex-col bg-sidebar text-sidebar-foreground transition-all duration-300 ease-in-out select-none border-r border-sidebar-border',
        collapsed ? 'w-18' : 'w-64'
      )}
    >
      {/* Header del sidebar */}
      <div
        className={cn(
          'flex h-16 items-center border-b border-sidebar-border transition-all duration-300',
          collapsed ? 'justify-center px-2' : 'justify-between px-4'
        )}
      >
        <Link
          href="/dashboard"
          className="flex items-center gap-3 overflow-hidden group focus:outline-none"
        >
          {/* Logo cilmax: recto y nítido */}
          <div className="flex h-10 w-10 items-center justify-center bg-sidebar-primary text-sidebar-primary-foreground shrink-0 shadow-sm border border-sidebar-primary/40 group-hover:brightness-110 transition-all">
            <Store className="h-5 w-5" />
          </div>

          {!collapsed && (
            <div className="flex flex-col min-w-0 transition-opacity duration-200">
              <span className="text-base font-bold tracking-tight text-white truncate">
                Cil<span className="font-light text-sidebar-primary">max</span>
              </span>
              <span className="text-[10px] text-sidebar-foreground/50 tracking-wider uppercase font-mono">
                ERP & POS
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
            className="hidden lg:flex items-center justify-center h-8 w-8 text-sidebar-foreground/60 hover:text-white hover:bg-sidebar-accent border border-transparent hover:border-sidebar-border transition-colors cursor-pointer"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Si está contraído, botón toggle flotante en la parte superior */}
      {onToggleCollapse && collapsed && (
        <div className="hidden lg:flex justify-center pt-2 pb-1 border-b border-sidebar-border/40">
          <button
            type="button"
            onClick={onToggleCollapse}
            title="Expandir barra lateral"
            aria-label="Expandir barra lateral"
            className="flex items-center justify-center h-9 w-9 text-sidebar-foreground/60 hover:text-white hover:bg-sidebar-accent border border-sidebar-border/60 hover:border-sidebar-primary/50 transition-all cursor-pointer shadow-sm"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Navegación de módulos */}
      <nav
        className={cn(
          'flex-1 overflow-y-auto overflow-x-hidden',
          collapsed ? 'p-2 space-y-2.5 flex flex-col items-center' : 'p-3 space-y-1'
        )}
      >
        {navigation.map((item) => {
          const active = isActive(item.href)

          if (collapsed) {
            // Modo Retraído: Íconos flotantes individuales con tooltip lateral
            return (
              <div key={item.name} className="relative group flex justify-center w-full">
                <Link
                  href={item.href}
                  aria-label={item.name}
                  className={cn(
                    'flex h-11 w-11 items-center justify-center border transition-all duration-200 cursor-pointer shadow-sm relative',
                    active
                      ? 'bg-sidebar-primary text-sidebar-primary-foreground border-sidebar-primary shadow-md shadow-sidebar-primary/25 scale-105'
                      : item.highlight
                        ? 'border-sidebar-primary/40 bg-sidebar-primary/10 text-sidebar-primary hover:bg-sidebar-primary/20 hover:border-sidebar-primary hover:scale-105'
                        : 'border-sidebar-border/60 bg-sidebar-accent/30 text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-white hover:border-sidebar-border hover:shadow-md hover:scale-105'
                  )}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                </Link>

                {/* Tooltip flotante al hacer hover */}
                <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-sidebar-accent text-white text-xs font-semibold whitespace-nowrap shadow-xl border border-sidebar-border z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                  <div className="flex items-center gap-1.5">
                    <span>{item.name}</span>
                    {item.highlight && (
                      <span className="text-[9px] px-1 py-0.2 bg-sidebar-primary text-sidebar-primary-foreground uppercase font-mono">
                        IA
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          }

          // Modo Expandido: Barra completa
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'group relative flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-all duration-150 border',
                active
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground border-sidebar-primary font-semibold shadow-sm'
                  : item.highlight
                    ? 'border-sidebar-primary/30 text-sidebar-primary bg-sidebar-primary/10 hover:bg-sidebar-primary/20 hover:border-sidebar-primary'
                    : 'border-transparent text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-white hover:border-sidebar-border'
              )}
            >
              {active && (
                <span className="absolute left-0 top-0 bottom-0 w-1 bg-white" />
              )}

              <item.icon
                className={cn(
                  'h-4 w-4 shrink-0 transition-transform duration-150 group-hover:scale-110',
                  active
                    ? 'text-sidebar-primary-foreground'
                    : item.highlight
                      ? 'text-sidebar-primary'
                      : 'text-sidebar-foreground/70 group-hover:text-sidebar-foreground'
                )}
              />

              <span className="flex-1 truncate tracking-tight">{item.name}</span>

              {item.highlight && (
                <span className="text-[10px] px-1.5 py-0.5 font-bold uppercase bg-sidebar-primary/20 text-sidebar-primary tracking-wider border border-sidebar-primary/30 font-mono">
                  IA
                </span>
              )}
            </Link>
          )
        })}

        {/* Separador y enlace de Administración */}
        <div
          className={cn(
            'border-t border-sidebar-border pt-3 mt-3 w-full',
            collapsed && 'flex justify-center'
          )}
        >
          {collapsed ? (
            <div className="relative group flex justify-center w-full">
              <Link
                href="/admin"
                aria-label="Administración"
                className={cn(
                  'flex h-11 w-11 items-center justify-center border transition-all duration-200 cursor-pointer shadow-sm',
                  pathname === '/admin'
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground border-sidebar-primary shadow-md'
                    : 'border-sidebar-border/60 bg-sidebar-accent/30 text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-white hover:border-sidebar-border hover:scale-105'
                )}
              >
                <Settings className="h-5 w-5 shrink-0" />
              </Link>
              <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-sidebar-accent text-white text-xs font-semibold whitespace-nowrap shadow-xl border border-sidebar-border z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                Administración
              </div>
            </div>
          ) : (
            <Link
              href="/admin"
              className={cn(
                'group relative flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-all duration-150 border',
                pathname === '/admin'
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground border-sidebar-primary font-semibold shadow-sm'
                  : 'border-transparent text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-white hover:border-sidebar-border'
              )}
            >
              {pathname === '/admin' && (
                <span className="absolute left-0 top-0 bottom-0 w-1 bg-white" />
              )}
              <Settings
                className={cn(
                  'h-4 w-4 shrink-0 transition-transform duration-150 group-hover:scale-110',
                  pathname === '/admin' ? 'text-sidebar-primary-foreground' : 'text-sidebar-foreground/70'
                )}
              />
              <span className="flex-1 truncate tracking-tight">Administración</span>
            </Link>
          )}
        </div>
      </nav>

      {/* Pie de la barra lateral */}
      <div className="border-t border-sidebar-border p-2">
        {collapsed ? (
          <button
            type="button"
            onClick={onToggleCollapse}
            title="Expandir barra lateral"
            aria-label="Expandir barra lateral"
            className="w-full flex items-center justify-center p-2 text-sidebar-foreground/50 hover:text-white hover:bg-sidebar-accent transition-colors border border-transparent hover:border-sidebar-border cursor-pointer"
          >
            <Keyboard className="h-4 w-4" />
          </button>
        ) : (
          <div className="px-2 py-1.5 text-[11px] text-sidebar-foreground/50 flex items-center justify-between font-mono">
            <div className="flex items-center gap-1.5">
              <Keyboard className="h-3.5 w-3.5 shrink-0" />
              <span>Alt+Q buscar · Alt+P IA</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}